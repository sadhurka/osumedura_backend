


import app from '../app.js';

export default function handler(req, res) {
	// Set CORS headers for every request (Vercel serverless compatibility)
	res.setHeader('Access-Control-Allow-Origin', '*'); // Change to your frontend URL for more security
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
	if (req.method === 'OPTIONS') {
		res.status(200).end();
		return;
	}
	app(req, res);
}
