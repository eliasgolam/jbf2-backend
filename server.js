console.log('>>> LOADED server.js from', __dirname, 'cwd=', process.cwd());
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const session = require('express-session');
const MongoStore = require('connect-mongo');

// ✅ Express-App & HTTP-Server
const app = express();
// ✅ Request-Log-Middleware (ganz oben nach app = express())
app.use((req, _res, next) => { 
  console.log('[REQ]', req.method, req.url); 
  next(); 
});

const server = http.createServer(app);

// ✅ Socket.IO initialisieren
const io = new Server(server, {
  cors: {
    origin: [
      "https://www.myjbfinanz.ch",
      "https://myjbfinanz.ch",
      "http://localhost:3000"
    ],
    credentials: true
  }
});

// ✅ WebSocket-Events
io.on("connection", (socket) => {
  socket.on("join", (token) => {
    socket.join(token);
  });

  socket.on("update", ({ token, feld, wert }) => {
    socket.to(token).emit("update", { feld, wert });
  });
});

async function initDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('⚠️  No MONGODB_URI set. Falling back to in-memory DB.');
    return false;
  }
  try {
    await mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB_NAME,
    });
    console.log('✅ MongoDB connected:', mongoose.connection.db?.databaseName || '(unknown)');
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    return false;
  }
}

// ✅ Security & Logging
const { requestLogger, errorLogger, logSecurityEvent } = require('./middleware/logging');

// ✅ MongoDB-Verbindung (legacy for existing routes)
// const MONGO_URI = 'mongodb+srv://eliasgolam:s5ERduVbs9lLDBxm@jbcluster.phajee.mongodb.net/?retryWrites=true&w=majority&appName=JBCluster';
// mongoose.connect(MONGO_URI)
//   .then(() => console.log('✅ MongoDB verbunden!'))
//   .catch(err => console.error('❌ MongoDB-Verbindung fehlgeschlagen:', err));

// ✅ CORS-Middleware (Production-Ready)
// const allowedOrigins = [
//   'http://localhost:3000',
//   'https://app.myjbfinanz.ch',
//   'https://myjbfinanz.ch'
// ];

// app.use(cors({
//   origin: (origin, cb) => {
//     if (!origin) return cb(null, true); // allow direct GETs (health)
//     if (allowedOrigins.includes(origin)) return cb(null, true);
//     return cb(new Error('Not allowed by CORS'));
//   },
//   credentials: true,
//   methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
//   allowedHeaders: ['Content-Type','Authorization']
// }));

// Handle OPTIONS quickly
// app.options('*', cors());

const allowedOrigins = [
  'http://localhost:3000',
  'https://myjbfinanz.ch',
  'https://www.myjbfinanz.ch',
  'https://api.myjbfinanz.ch',
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    cb(null, allowedOrigins.includes(origin));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// ✅ Body & Trust Proxy
app.use(express.json({ limit: '10mb' })); // Limit request size

// ✅ Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// ✅ Request Logging
app.use(requestLogger);

// ✅ Session-Middleware (Production-Ready)
const isProd = process.env.NODE_ENV === 'production';
app.set('trust proxy', 1); // wichtig hinter Render/Proxy

app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME,
    ttl: 60 * 60 * 8, // 8h
    autoRemove: 'native',
  }),
  cookie: {
    httpOnly: true,
    secure: isProd,                 // in Prod (HTTPS) true
    sameSite: isProd ? 'none' : 'lax', // für Cross-Site (Frontend http / Backend https)
    // domain: '.myjbfinanz.ch',     // nur setzen, falls Cookie sonst nicht klebt
    maxAge: 1000 * 60 * 60 * 8,     // 8h
  }
}));

// ✅ Routen einbinden
const sessionRoutes = require('./routes/session');
const userRoutes = require('./routes/user');
const kundenRoutes = require('./routes/kunden');
const krankenkassenRoutes = require('./routes/krankenkassen');
const antwortenRoutes = require('./routes/antworten');
const berechnungRoute = require('./routes/berechnung');
const uploadRoute = require('./routes/upload');
const nachrichtenRoutes = require('./routes/nachrichten');
const vagUploadRoute = require('./routes/vagUpload');

// ✅ API Routes
const routes = require('./src/routes/index');

// ✅ API-Endpunkte
app.use('/api/session', sessionRoutes);
app.use('/api/user', userRoutes);
app.use('/api/kunden', kundenRoutes);
app.use('/api/krankenkassen', krankenkassenRoutes);
app.use('/api/antworten', antwortenRoutes);
app.use('/api', berechnungRoute);
app.use('/api', uploadRoute);
app.use('/api/nachrichten', nachrichtenRoutes);
app.use('/api', vagUploadRoute);

// ✅ Main API Routes (includes advice and PDF routes)
app.use('/api', routes); // src/routes/index.js

// ✅ Statische Daten (z. B. JSON-Dateien)
app.use("/data", express.static("data"));

// ✅ Health Check
app.get('/', (req, res) => {
  res.send('✅ Backend läuft Patron!');
});

// ✅ Health endpoint for monitors
app.get('/healthz', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ✅ Error Logging Middleware (must be last)
app.use(errorLogger);

// ✅ Global Error Handler
app.use((err, _req, res, _next) => {
  console.error('[ERR]', err.message, err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ✅ PDF Generation enabled for normal development
process.env.PDF_ENABLED = 'true';

(async () => {
  const dbOk = await initDb();

  if (dbOk) {
    console.log('✅ Database: MongoDB');
  } else {
    console.log('✅ Database: In-Memory'); // Nur wenn keine DB verbunden ist!
    // Falls ihr explizit In-Memory Stores initialisiert, dann hier.
  }

  // WICHTIG: Routen erst nach DB-Init mounten
  // Beispiel:
  // app.use('/api/kunden', kundenRouter);
  // app.use('/api/nachrichten', nachrichtenRouter);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`✅ Server + WebSocket läuft auf Port ${PORT}`);
    console.log(`✅ PDF Generation: ${process.env.SMOKE_PDF ? 'true' : 'true'}`);
  });
})();
