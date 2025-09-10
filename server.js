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
      "https://jbf2-frontend.vercel.app",
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

// ✅ Database Configuration
const { initializeDatabase, isUsingMongo } = require('./src/config/database');

// ✅ Security & Logging
const { requestLogger, errorLogger, logSecurityEvent } = require('./middleware/logging');

// ✅ MongoDB-Verbindung (legacy for existing routes)
const MONGO_URI = 'mongodb+srv://eliasgolam:s5ERduVbs9lLDBxm@jbcluster.phajee.mongodb.net/?retryWrites=true&w=majority&appName=JBCluster';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB verbunden!'))
  .catch(err => console.error('❌ MongoDB-Verbindung fehlgeschlagen:', err));

// ✅ CORS-Middleware (Production-Ready)
const allowedOrigins = [
  'http://localhost:3000',
  'https://app.myjbfinanz.ch',
  'https://myjbfinanz.ch'
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow direct GETs (health)
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// Handle OPTIONS quickly
app.options('*', cors());

// ✅ Body & Trust Proxy
app.use(express.json({ limit: '10mb' })); // Limit request size
app.set('trust proxy', 1);

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

// ✅ Session-Middleware
app.use(session({
  secret: 'supergeheimer-sessionkey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 4,
    sameSite: 'none',
    secure: true
  },
  store: MongoStore.create({ mongoUrl: MONGO_URI })
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
app.use('/api', routes);

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

// ✅ Server starten (Express + WebSocket)
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`✅ Server + WebSocket läuft auf Port ${PORT}`);
  console.log(`✅ PDF Generation: ${process.env.PDF_ENABLED}`);
  
  // Initialize database
  try {
    await initializeDatabase();
    console.log(`✅ Database: ${isUsingMongo() ? 'MongoDB' : 'In-Memory'}`);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
});
