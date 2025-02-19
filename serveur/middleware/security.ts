import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { AppError } from '../types';
import config from '../config/config';
import { logService } from '../services/common';

/**
 * Configuration du rate limiter
 */
export const rateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW,
  max: config.RATE_LIMIT_MAX,
    message: {
      success: false,
      error: {
        message: 'Trop de requêtes, veuillez réessayer plus tard',
        status: 429
      }
    },

  handler: (req: Request, res: Response) => {
    logService.warn('rate_limit_exceeded', {
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({
      success: false,
      error: {
        message: 'Trop de requêtes, veuillez réessayer plus tard',
        status: 429
      }
    });

  }
});

/**
 * Configuration de CORS
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // En développement, on autorise toutes les origines
    if (config.NODE_ENV === 'development') {
      callback(null, true);
      return;
    }

    // En production, on vérifie l'origine
    const allowedOrigins = [
      'https://app-resume.com',
      'https://www.app-resume.com'
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Non autorisé par CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],


  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 86400 // 24 heures
};

/**
 * Configuration de Helmet
 */
export const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true,
  dnsPrefetchControl: true,
  expectCt: true,
  frameguard: true,
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: true,
  referrerPolicy: true,
  xssFilter: true
};

/**
 * Middleware pour vérifier l'API key
 */
export const checkApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== config.API_KEY) {
    logService.warn('invalid_api_key', {
      ip: req.ip,
      path: req.path
    });
    throw new AppError('Clé API invalide', 401);
  }

  next();
};

/**
 * Middleware pour vérifier l'origine de la requête
 */
export const checkOrigin = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  if (config.NODE_ENV === 'development') {
    return next();
  }

  if (!origin) {
    logService.warn('missing_origin', {
      ip: req.ip,
      path: req.path
    });
    throw new AppError('Origine manquante', 400);
  }

  const allowedOrigins = [
    'https://app-resume.com',
    'https://www.app-resume.com'
  ];

  if (!allowedOrigins.includes(origin)) {
    logService.warn('invalid_origin', {
      ip: req.ip,
      path: req.path,
      origin
    });
    throw new AppError('Origine non autorisée', 403);
  }

  next();
};

/**
 * Middleware pour vérifier le content type
 */
export const checkContentType = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      throw new AppError('Content-Type doit être application/json', 400);
    }
  }
  next();
};

/**
 * Middleware pour nettoyer les entrées
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  next();
};

export default {
  rateLimiter,
  corsOptions,
  helmetConfig,
  checkApiKey,
  checkOrigin,
  checkContentType,
  sanitizeInput
};
