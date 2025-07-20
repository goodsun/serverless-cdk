import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  res.status(statusCode).json({
    error: {
      message: error.message || 'Internal server error',
      ...(process.env.ENVIRONMENT !== 'prod' && { stack: error.stack }),
    },
  });
};