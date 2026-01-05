



import app from '../app.js';
import mongoose from 'mongoose';

// Ensure MongoDB connection before handling any request
let cached = globalThis.mongoose;
if (!cached) {
	cached = globalThis.mongoose = { conn: null, promise: null };
}

async function connectWithRetry() {
	if (cached.conn) return cached.conn;
	if (!cached.promise) {
		const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pharmacy';
		const DB_NAME = process.env.MONGODB_DB || 'pharmacy';
		cached.promise = mongoose.connect(MONGODB_URI, { dbName: DB_NAME })
			.then((mongoose) => {
				console.log('MongoDB connected (api/index.js)');
				return mongoose;
			})
			.catch((err) => {
				console.error('MongoDB connection error (api/index.js):', err?.message || err);
				cached.promise = null;
				throw err;
			});
	}
	cached.conn = await cached.promise;
	return cached.conn;
}

export default async function handler(req, res) {
	// Set CORS headers for every request (Vercel serverless compatibility)
	res.setHeader('Access-Control-Allow-Origin', '*'); // Change to your frontend URL for more security
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
	if (req.method === 'OPTIONS') {
		res.status(200).end();
		return;
	}
	try {
		await connectWithRetry();
		app(req, res);
	} catch (err) {
		console.error('Database connection failed in api/index.js:', err);
		res.status(503).json({ error: 'Database connection failed', details: err?.message || err });
	}
}
