import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { forexRouter } from './src/server/forex-router';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Mount API routes
app.use('/api/forex', forexRouter);
app.use('/api/cron', forexRouter);

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  // Serve built assets from dist
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  // Mount Vite middlewares in development
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: {
      middlewareMode: true,
      port: PORT,
      host: '0.0.0.0',
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TradeJournal server running on http://0.0.0.0:${PORT} [mode: ${isProduction ? 'production' : 'development'}]`);
});
