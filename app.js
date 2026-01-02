import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

const app = express();
app.use(cors({ origin: '*', credentials: true }));

// Explicit CORS headers for Vercel compatibility
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Change to your frontend URL for more security
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});
app.use(express.json());

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
app.get('/', async (_req, res) => {
  try {
    res.json({ ok: true, message: 'osumedura-backend API is running', dbState: mongoose.connection.readyState });
  } catch (err) {
    console.error('Root route error:', err);
    res.status(500).json({ error: 'Internal server error', details: err?.message || err });
  }
});


app.get('/health', async (_req, res) => {
  try {
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting', 'unauthorized', 'unknown'];
    const ready = mongoose.connection.readyState;
    const dbName = mongoose.connection?.name || mongoose.connection?.db?.databaseName || null;
    res.json({ ok: true, dbState: states[ready] ?? ready, dbName });
  } catch (err) {
    console.error('Health route error:', err);
    res.status(500).json({ error: 'Internal server error', details: err?.message || err });
  }
});


app.get('/products', async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    const items = await Product.find({}).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (err) {
    console.error('Products GET error:', err);
    res.status(500).json({ error: 'Failed to load products', details: err?.message || err });
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
    console.error('Products POST error:', err);
    res.status(400).json({ error: 'Failed to create products', details: err?.message || err });
  }
});

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy';
const DB_NAME = process.env.MONGODB_DB || 'pharmacy';



// Vercel: Use globalThis for connection reuse to avoid reconnecting on every invocation
let cached = globalThis.mongoose;
if (!cached) {
  cached = globalThis.mongoose = { conn: null, promise: null };
}

async function connectWithRetry() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { dbName: DB_NAME })
      .then((mongoose) => {
        console.log('MongoDB connected');
        return mongoose;
      })
      .catch((err) => {
        console.error('MongoDB connection error:', err?.message || err);
        console.error('MONGODB_URI:', MONGODB_URI);
        console.error('DB_NAME:', DB_NAME);
        cached.promise = null;
        throw err;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

// Always connect before handling a request (for Vercel serverless)
app.use(async (req, res, next) => {
  try {
    await connectWithRetry();
    next();
  } catch (err) {
    console.error('Database connection middleware error:', err);
    res.status(503).json({ error: 'Database connection failed', details: err?.message || err });
  }
});

export default app;
