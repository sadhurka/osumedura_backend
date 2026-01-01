import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

const app = express();

app.use(cors());
app.use(express.json());

// ...frontend static file serving removed for Vercel backend-only deployment...

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy';
const DB_NAME = process.env.MONGODB_DB || 'pharmacy'; // default to 'pharmacy'
const PORT = process.env.PORT || 3000;

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

// Routes
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

// Minimal create endpoint to add products quickly (for development)
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

// Connect to MongoDB with retry and start server immediately
const connectWithRetry = async () => {
  try {
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err?.message || err);
    setTimeout(connectWithRetry, 5000);
  }
};


// Only start the server if not running in Vercel (i.e., not imported as a module)
if (process.env.VERCEL === undefined && process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API listening on port ${PORT}`);
    connectWithRetry();
  });
} else {
  // For Vercel: connect to DB on cold start
  connectWithRetry();
}

// For Vercel: export the app as default
export default app;
