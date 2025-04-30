const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

const userRoutes = require('./routes/user');
const kundenRoutes = require('./routes/kunden');
const krankenkassenRoutes = require('./routes/krankenkassen');

const PORT = process.env.PORT || 5000;

mongoose.connect('...your Mongo URI...')
.then(() => console.log('✅ MongoDB verbunden!'))
.catch(err => console.error('❌ MongoDB-Verbindung fehlgeschlagen:', err));

app.use(cors());
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
