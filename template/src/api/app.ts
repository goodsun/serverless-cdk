import express from 'express';
import cors from 'cors';
import { itemsRouter } from './routes/items';
import { healthRouter } from './routes/health';
import { errorHandler } from './middleware/error-handler';

export const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/health', healthRouter);
app.use('/items', itemsRouter);

// Error handling
app.use(errorHandler);