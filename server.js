const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Modelle importieren
const User = require('./models/User'); 
const userRoutes = require('./routes/user');
const kundenRoutes = require('./routes/kunden');
const krankenkassenRoutes = require('./routes/krankenkassen');

const PORT = process.env.PORT || 5000;

// MongoDB Verbindung
mongoose.connect('mongodb+srv://eliasgolam:s5ERduVbs9lLDBxm@jbcluster.phajee.mongodb.net/?retryWrites=true&w=majority&appName=JBCluster')
.then(() => console.log('✅ MongoDB verbunden!'))
.catch(err => console.error('❌ MongoDB-Verbindung fehlgeschlagen:', err));

// Middlewares
app.use(cors());
app.use(express.json());

// Benutzer speichern oder aktualisieren
app.post('/api/user', async (req, res) => {
  const { email, username, role } = req.body;
  try {
    let user = await User.findOne({ email });

    if (!user) {
      user = new User({ email, username, role });
    } else {
      user.username = username;
      user.role = role;
    }

    await user.save();
    console.log('✅ Benutzer gespeichert oder aktualisiert:', user);
    res.status(200).json(user);
  } catch (err) {
    console.error('❌ Fehler beim Speichern des Benutzers:', err);
    res.status(500).json({ message: 'Fehler beim Speichern des Benutzers.' });
  }
});

// Weitere Routen aktivieren
app.use('/api/kunden', kundenRoutes);
app.use('/api/krankenkassen', krankenkassenRoutes);

// Standard-Route
app.get('/', (req, res) => {
  res.send('Backend läuft Patron!');
});

// Server starten (GANZ AM ENDE)
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});
