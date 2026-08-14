import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import authRoutes from './routes/authRoutes.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export const createApp = ({ useMongoSession = false } = {}) => {
  const app = express();
  const allowedOrigins = new Set([
    process.env.FRONTEND_ORIGIN,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter(Boolean));
  const mongoUri = process.env.MONGODB_URI;
  const corsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  };

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  const sessionOptions = {
    name: 'ai-interviewer.sid',
    secret: process.env.SESSION_SECRET || 'dev-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  };

  if (useMongoSession && mongoUri) {
    sessionOptions.store = MongoStore.create({
      mongoUrl: mongoUri,
      ttl: 7 * 24 * 60 * 60,
    });
  }

  app.use(session(sessionOptions));

  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
};