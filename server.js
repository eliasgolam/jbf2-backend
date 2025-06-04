const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const session = require('express-session');
const MongoStore = require('connect-mongo');

// ✅ Express-App & HTTP-Server
const app = express();
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

// ✅ MongoDB-Verbindung
const MONGO_URI = 'mongodb+srv://eliasgolam:s5ERduVbs9lLDBxm@jbcluster.phajee.mongodb.net/?retryWrites=true&w=majority&appName=JBCluster';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB verbunden!'))
  .catch(err => console.error('❌ MongoDB-Verbindung fehlgeschlagen:', err));

// ✅ CORS-Middleware
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://jbf2-frontend.vercel.app',
    'https://www.myjbfinanz.ch',
    'https://myjbfinanz.ch',
    'http://localhost:3000'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// ✅ Body & Trust Proxy
app.use(express.json());
app.set('trust proxy', 1);

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

// ✅ Statische Daten (z. B. JSON-Dateien)
app.use("/data", express.static("data"));

// ✅ Health Check
app.get('/', (req, res) => {
  res.send('✅ Backend läuft Patron!');
});

// ✅ Server starten (Express + WebSocket)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server + WebSocket läuft auf Port ${PORT}`);
});
