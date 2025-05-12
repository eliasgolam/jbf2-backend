import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// Verhindere mehrfaches Verbinden bei Hot-Reload
if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (global.mongoose.conn) return global.mongoose.conn;

  if (!global.mongoose.promise) {
    global.mongoose.promise = mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }).then((mongoose) => mongoose);
  }

  global.mongoose.conn = await global.mongoose.promise;
  return global.mongoose.conn;
}

// Schema definieren
const KrankenkasseSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  data: { type: Object, required: true }
});

const Krankenkasse = mongoose.models.Krankenkasse || mongoose.model('Krankenkasse', KrankenkasseSchema);

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const all = await Krankenkasse.find({});
      const daten = {};
      all.forEach(entry => {
        daten[entry.name] = entry.data;
      });
      res.status(200).json({ daten });
    } catch (error) {
      res.status(500).json({ error: 'Fehler beim Abrufen der Daten.' });
    }
  }

  if (req.method === 'POST') {
    try {
      const [name] = Object.keys(req.body);
      const data = req.body[name];

      const updated = await Krankenkasse.findOneAndUpdate(
        { name },
        { data },
        { upsert: true, new: true }
      );

      res.status(200).json({ message: 'Erfolgreich gespeichert.', name, updated });
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      res.status(500).json({ error: 'Fehler beim Speichern.' });
    }
  }
}
