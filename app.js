import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

const app = express();
app.use(cors());
app.use(express.json());

// Mongo models
const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  image: String,
  rating: Number,
  reviews: Number,
  category: String,
  inStock: Boolean,
}, { timestamps: true, collection: 'osumedura' });

const Product = mongoose.model('osumedura', productSchema);

// Root route for API status
app.get('/', (_req, res) => {
  res.json({ ok: true, message: 'osumedura-backend API is running', dbState: mongoose.connection.readyState });
});

app.get('/health', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting', 'unauthorized', 'unknown'];
  const ready = mongoose.connection.readyState;
  const dbName = mongoose.connection?.name || mongoose.connection?.db?.databaseName || null;
  res.json({ ok: true, dbState: states[ready] ?? ready, dbName });
});

app.get('/products', async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    const items = await Product.find({}).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load products' });
  }
});

app.post('/products', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    const payload = Array.isArray(req.body) ? req.body : [req.body];
    const docs = await Product.insertMany(payload);
    res.status(201).json(docs);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create products' });
  }
});

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy';
const DB_NAME = process.env.MONGODB_DB || 'pharmacy';

const connectWithRetry = async () => {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err?.message || err);
    console.error('MONGODB_URI:', MONGODB_URI);
    console.error('DB_NAME:', DB_NAME);
    setTimeout(connectWithRetry, 5000);
  }
};

connectWithRetry();

export default app;
