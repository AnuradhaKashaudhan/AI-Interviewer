import 'dotenv/config';
import { connectDatabase } from './config/db.js';

const port = Number(process.env.PORT || 4000);

const startServer = async () => {
  try {
    let useMongoSession = false;

    if (process.env.MONGODB_URI) {
      try {
        await connectDatabase(process.env.MONGODB_URI);
        useMongoSession = true;
        process.env.AUTH_STORAGE_MODE = 'mongo';
      } catch (error) {
        console.warn('MongoDB unavailable, using in-memory auth storage for local development.');
        process.env.AUTH_STORAGE_MODE = 'memory';
      }
    } else {
      process.env.AUTH_STORAGE_MODE = 'memory';
    }

    const { createApp } = await import('./app.js');
    const app = createApp({ useMongoSession });

    app.listen(port, () => {
      console.log(`Auth server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start auth server:', error);
    process.exit(1);
  }
};

startServer();