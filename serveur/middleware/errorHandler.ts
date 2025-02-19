import { Request, Response, NextFunction } from 'express';
import { JsonWebTokenError } from 'jsonwebtoken';
import { AppError, ValidationError, AuthenticationError, AuthorizationError, NotFoundError } from '../types';
import { logService } from '../services/common';
import config from '../config/config';

/**
 * Middleware de gestion des erreurs
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log l'erreur
  logService.error('error_handler', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Erreur de validation
  if (err instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: {
        message: err.message,
        status: 400,
        details: err.details
      }
    });

  }

  // Erreur d'authentification
  if (err instanceof AuthenticationError || err instanceof JsonWebTokenError) {
    return res.status(401).json({
      success: false,
      error: {
        message: err.message,
        status: 401
      }
    });

  }

  // Erreur d'autorisation
  if (err instanceof AuthorizationError) {
    return res.status(403).json({
      success: false,
      error: {
        message: err.message,
        status: 403
      }
    });

  }

  // Erreur de ressource non trouvée
  if (err instanceof NotFoundError) {
    return res.status(404).json({
      success: false,
      error: {
        message: err.message,
        status: 404
      }
    });

  }

  // Erreur d'application personnalisée
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      error: {
        message: err.message,
        status: err.status,
        details: err.details
      }
    });

  }

  // En mode développement, on renvoie plus de détails
  if (config.NODE_ENV === 'development') {
    return res.status(500).json({
      success: false,
      error: {
        message: err.message,
        status: 500,
        stack: err.stack
      }
    });

  }

  // En production, on renvoie un message générique
    return res.status(500).json({
      success: false,
      error: {
        message: 'Une erreur interne est survenue',
        status: 500
      }
    });

};

/**
 * Middleware pour gérer les routes non trouvées
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`Route ${req.method} ${req.path} non trouvée`));
};

/**
 * Middleware pour gérer les erreurs de syntaxe JSON
 */
export const jsonSyntaxErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Erreur de syntaxe JSON',
        details: err.message
      }
    });
  }
  next(err);
};

/**
 * Middleware pour gérer les rejets de promesses non gérés
 */
export const unhandledRejectionHandler = (
  reason: Error | any,
  promise: Promise<any>
) => {
  logService.error('unhandled_rejection', {
    reason: reason instanceof Error ? reason.stack : reason,
    promise
  });

  // En mode développement, on termine le processus
  if (config.NODE_ENV === 'development') {
    process.exit(1);
  }
};

/**
 * Middleware pour gérer les exceptions non gérées
 */
export const uncaughtExceptionHandler = (error: Error) => {
  logService.error('uncaught_exception', {
    error: error.stack
  });

  // En mode développement, on termine le processus
  if (config.NODE_ENV === 'development') {
    process.exit(1);
  }
};

export default {
  errorHandler,
  notFoundHandler,
  jsonSyntaxErrorHandler,
  unhandledRejectionHandler,
  uncaughtExceptionHandler
};
