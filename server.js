const express = require('express');
const mongoose = require('mongoose');
const app = express();

// Routen
const userRoutes = require('./routes/user');
const kundenRoutes = require('./routes/kunden');
const krankenkassenRoutes = require('./routes/krankenkassen');
const antwortenRoutes = require('./routes/antworten');
const berechnungRoute = require('./routes/berechnung');

const PORT = process.env.PORT || 5000;

// MongoDB-Verbindung
mongoose.connect('mongodb+srv://eliasgolam:s5ERduVbs9lLDBxm@jbcluster.phajee.mongodb.net/?retryWrites=true&w=majority&appName=JBCluster')
  .then(() => console.log('✅ MongoDB verbunden!'))
  .catch(err => console.error('❌ MongoDB-Verbindung fehlgeschlagen:', err));

// ✅ CORS komplett manuell gesetzt (für Vercel-Frontend)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "https://jbf2-frontend.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204); // Wichtig für Preflight
  }

  next();
});

app.use(express.json());

// API-Routen
app.use('/api/user', userRoutes);
app.use('/api/kunden', kundenRoutes);
app.use('/api/krankenkassen', krankenkassenRoutes);
app.use('/api/antworten', antwortenRoutes);
app.use('/api', berechnungRoute); // ✅ /api/berechne ist in berechnungRoute enthalten

app.get('/', (req, res) => {
  res.send('Backend läuft Patron!');
});

app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});
