import { Router } from 'express';

export const healthRouter = Router();

// GET /api/health - Health check endpoint
healthRouter.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.ENVIRONMENT || 'dev',
    appName: process.env.APP_NAME || 'serverless-app',
  });
});