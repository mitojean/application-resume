import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain, body } from 'express-validator';
import { AppError } from '../types';
import { logService } from '../services/common';

/**
 * Middleware de validation des requêtes
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Exécuter toutes les validations
      await Promise.all(validations.map(validation => validation.run(req)));

      const errors = validationResult(req);
      if (errors.isEmpty()) {
        return next();
      }

      // Log des erreurs de validation
      logService.warn('validation_error', {
        path: req.path,
        errors: errors.array()
      });

      // Retourner les erreurs
      throw new AppError('Erreur de validation des données', 400, {
        errors: errors.array()
      });
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Schémas de validation communs
 */
export const validationSchemas = {
  // Validation d'ID
  id: (fieldName: string = 'id'): ValidationChain[] => [
    body(fieldName)
      .exists()
      .withMessage('ID requis')
      .isInt({ min: 1 })
      .withMessage('ID invalide')
  ],

  // Validation d'email
  email: (fieldName: string = 'email'): ValidationChain[] => [
    body(fieldName)
      .exists()
      .withMessage('Email requis')
      .isEmail()
      .withMessage('Email invalide')
      .normalizeEmail()
  ],

  // Validation de mot de passe
  password: (fieldName: string = 'mot_de_passe'): ValidationChain[] => [
    body(fieldName)
      .exists()
      .withMessage('Mot de passe requis')
      .isLength({ min: 8 })
      .withMessage('Le mot de passe doit contenir au moins 8 caractères')
      .matches(/[A-Z]/)
      .withMessage('Le mot de passe doit contenir au moins une majuscule')
      .matches(/[a-z]/)
      .withMessage('Le mot de passe doit contenir au moins une minuscule')
      .matches(/[0-9]/)
      .withMessage('Le mot de passe doit contenir au moins un chiffre')
      .matches(/[^A-Za-z0-9]/)
      .withMessage('Le mot de passe doit contenir au moins un caractère spécial')
  ],

  // Validation de code PIN
  pin: (fieldName: string = 'code_pin'): ValidationChain[] => [
    body(fieldName)
      .exists()
      .withMessage('Code PIN requis')
      .isLength({ min: 6, max: 6 })
      .withMessage('Le code PIN doit contenir 6 chiffres')
      .matches(/^\d+$/)
      .withMessage('Le code PIN doit contenir uniquement des chiffres')
  ],

  // Validation d'URL
  url: (fieldName: string = 'url'): ValidationChain[] => [
    body(fieldName)
      .exists()
      .withMessage('URL requise')
      .isURL()
      .withMessage('URL invalide')
  ],

  // Validation de langue
  language: (fieldName: string = 'langue'): ValidationChain[] => [
    body(fieldName)
      .exists()
      .withMessage('Langue requise')
      .isIn(['fr', 'en'])
      .withMessage('Langue non supportée')
  ],

  // Validation de texte
  text: (fieldName: string = 'texte', options?: { min?: number; max?: number }): ValidationChain[] => [
    body(fieldName)
      .exists()
      .withMessage('Texte requis')
      .isString()
      .withMessage('Texte invalide')
      .isLength({ min: options?.min || 1, max: options?.max })
      .withMessage(`Le texte doit contenir entre ${options?.min || 1} et ${options?.max || 'infini'} caractères`)
  ],

  // Validation de date
  date: (fieldName: string = 'date'): ValidationChain[] => [
    body(fieldName)
      .exists()
      .withMessage('Date requise')
      .isISO8601()
      .withMessage('Date invalide')
  ],

  // Validation de booléen
  boolean: (fieldName: string = 'boolean'): ValidationChain[] => [
    body(fieldName)
      .exists()
      .withMessage('Valeur requise')
      .isBoolean()
      .withMessage('Valeur booléenne invalide')
  ],

  // Validation de tableau
  array: (fieldName: string = 'array', options?: { min?: number; max?: number }): ValidationChain[] => [
    body(fieldName)
      .exists()
      .withMessage('Tableau requis')
      .isArray({ min: options?.min, max: options?.max })
      .withMessage(`Le tableau doit contenir entre ${options?.min || 0} et ${options?.max || 'infini'} éléments`)
  ]
};

export default {
  validate,
  validationSchemas
};
