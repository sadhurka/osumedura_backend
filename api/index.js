
import app from '../server.js';

// For Vercel: export the handler
import app from '../app.js';
export default app;
export const handler = app;
