import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError, AuthenticationError, AuthorizationError, UserPayload } from '../types';
import config from '../config/config';
import { logService } from '../services/common';
import { authService } from '../services/auth';

/**
 * Middleware d'authentification
 */
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('Token manquant ou invalide');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AuthenticationError('Token manquant');
    }

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as UserPayload;
      req.utilisateur = decoded;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token expiré');
      }
      throw new AuthenticationError('Token invalide');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware d'autorisation admin
 */
export const authorizeAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.utilisateur) {
      throw new AuthenticationError('Utilisateur non authentifié');
    }

    if (req.utilisateur.role !== 'admin') {
      throw new AuthorizationError('Accès non autorisé');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware de vérification d'email
 */
export const requireEmailVerified = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (!req.utilisateur) {
      throw new AuthenticationError('Utilisateur non authentifié');
    }

    if (!req.utilisateur.est_verifie) {
      throw new AuthenticationError('Email non vérifié');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware de vérification du code PIN
 */
export const verifyPin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.utilisateur) {
      throw new AuthenticationError('Utilisateur non authentifié');
    }

    const { code_pin } = req.body;
    if (!code_pin) {
      throw new AppError('Code PIN requis', 400);
    }

    // La vérification du PIN est déléguée au service d'authentification
    await authService.verifyPin(req.utilisateur.id, code_pin);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware de vérification de propriété de ressource
 */
export const checkResourceOwnership = (resourceIdParam: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.utilisateur) {
        throw new AuthenticationError('Utilisateur non authentifié');
      }

      const resourceId = parseInt(req.params[resourceIdParam], 10);
      if (isNaN(resourceId)) {
        throw new AppError('ID de ressource invalide', 400);
      }

      // Les admins peuvent accéder à toutes les ressources
      if (req.utilisateur.role === 'admin') {
        return next();
      }

      // Vérifier si l'utilisateur est le propriétaire de la ressource
      if (req.body.utilisateur_id && req.body.utilisateur_id !== req.utilisateur.id) {
        throw new AuthorizationError('Accès non autorisé à cette ressource');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware de journalisation des accès
 */
export const logAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.utilisateur) {
    logService.info('access_log', {
      user_id: req.utilisateur.id,
      method: req.method,
      path: req.path,
      ip: req.ip
    });
  }
  next();
};

export default {
  authenticateUser,
  authorizeAdmin,
  requireEmailVerified,
  verifyPin,
  checkResourceOwnership,
  logAccess
};
