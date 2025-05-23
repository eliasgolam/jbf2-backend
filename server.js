const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const app = express();
const session = require('express-session');
const MongoStore = require('connect-mongo');
const sessionRoutes = require('./routes/session'); // NEU



// ✅ ENV-Variablen (optional sauberer)
const PORT = process.env.PORT || 5000;
const MONGO_URI = 'mongodb+srv://eliasgolam:s5ERduVbs9lLDBxm@jbcluster.phajee.mongodb.net/?retryWrites=true&w=majority&appName=JBCluster';

// ✅ MongoDB verbinden
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB verbunden!'))
  .catch(err => console.error('❌ MongoDB-Verbindung fehlgeschlagen:', err));

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

app.use(express.json());
app.use(session({
  secret: 'supergeheimer-sessionkey',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 4, // 4 Stunden
    sameSite: 'none',           // WICHTIG: Cross-Origin Cookie-Zulassung
    secure: true                // WICHTIG: Nur über HTTPS senden
  },
  store: MongoStore.create({ mongoUrl: MONGO_URI })
}));



// ✅ Routen einbinden
const userRoutes = require('./routes/user');
const kundenRoutes = require('./routes/kunden');
const krankenkassenRoutes = require('./routes/krankenkassen');
const antwortenRoutes = require('./routes/antworten');
const berechnungRoute = require('./routes/berechnung');
const uploadRoute = require('./routes/upload'); // NEU
const nachrichtenRoutes = require('./routes/nachrichten');
const vagUploadRoute = require('./routes/vagUpload'); // NEU


// ✅ API-Endpunkte
app.use('/api/user', userRoutes);
app.use('/api/kunden', kundenRoutes);
app.use('/api/krankenkassen', krankenkassenRoutes);
app.use('/api/antworten', antwortenRoutes);
app.use('/api', berechnungRoute);
app.use('/api', uploadRoute); // NEU: Upload von XLSX
app.use('/api/nachrichten', nachrichtenRoutes);
app.use('/api', vagUploadRoute); // NEU


app.use("/data", express.static("data"));
app.use('/api/session', sessionRoutes); // NEU


// ✅ Health Check
app.get('/', (req, res) => {
  res.send('✅ Backend läuft Patron!');
});

// ✅ Server starten
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});
