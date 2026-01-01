import app from './app.js';
const PORT = process.env.PORT || 3000;
if (process.env.VERCEL === undefined && process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
