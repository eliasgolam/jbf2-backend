const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

const userRoutes = require('./routes/user');
const kundenRoutes = require('./routes/kunden');
const krankenkassenRoutes = require('./routes/krankenkassen');

const PORT = process.env.PORT || 5000;

mongoose.connect('mongodb+srv://eliasgolam:s5ERduVbs9lLDBxm@jbcluster.phajee.mongodb.net/?retryWrites=true&w=majority&appName=JBCluster')
.then(() => console.log('✅ MongoDB verbunden!'))
.catch(err => console.error('❌ MongoDB-Verbindung fehlgeschlagen:', err));

app.use(cors({
  origin: 'https://jbf2-frontend.vercel.app', // exakte Vercel-URL deines Frontends
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// ✅ API-Routen aktivieren
app.use('/api/user', userRoutes);
app.use('/api/kunden', kundenRoutes);
app.use('/api/krankenkassen', krankenkassenRoutes);

app.get('/', (req, res) => {
  res.send('Backend läuft Patron!');
});

app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});
