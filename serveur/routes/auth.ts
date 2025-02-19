import { Router } from 'express';
import { validate, validationSchemas } from '../middleware/validation';
import { authService } from '../services/auth';
import { checkApiKey } from '../middleware/security';
import { authenticateUser } from '../middleware/auth';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

/**
 * @route POST /api/auth/register
 * @desc Inscription d'un nouvel utilisateur
 */
router.post(
  '/register',
  checkApiKey,
  validate([
    ...validationSchemas.email(),
    ...validationSchemas.text('identifiant'),
    ...validationSchemas.password(),
    ...validationSchemas.pin(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.register(req.body);
      res.status(201).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @route POST /api/auth/login
 * @desc Connexion d'un utilisateur
 */
router.post(
  '/login',
  checkApiKey,
  validate([
    ...validationSchemas.email(),
    ...validationSchemas.password(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, user } = await authService.login(req.body);
      res.json({
        success: true,
        data: { token, user },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @route POST /api/auth/verify-email
 * @desc Vérification de l'email
 */
router.post(
  '/verify-email',
  checkApiKey,
  validate([...validationSchemas.text('token')]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.verifyEmail(req.body.token);
      res.json({
        success: true,
        message: 'Email vérifié avec succès',
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @route POST /api/auth/reset-password
 * @desc Réinitialisation du mot de passe
 */
router.post(
  '/reset-password',
  checkApiKey,
  validate([
    ...validationSchemas.email(),
    ...validationSchemas.password('nouveauMotDePasse'),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.resetPassword(req.body);
      res.json({
        success: true,
        message: 'Mot de passe réinitialisé avec succès',
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @route POST /api/auth/request-reset
 * @desc Demande de réinitialisation du mot de passe
 */
router.post(
  '/request-reset',
  checkApiKey,
  validate([...validationSchemas.email()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.requestPasswordReset(req.body.email);
      res.json({
        success: true,
        message: 'Email de réinitialisation envoyé',
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @route POST /api/auth/verify-pin
 * @desc Vérification du code PIN
 */
router.post(
  '/verify-pin',
  checkApiKey,
  authenticateUser,
  validate([...validationSchemas.pin()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).utilisateur.id;
      await authService.verifyPin(userId, req.body.code_pin);
      res.json({
        success: true,
        message: 'Code PIN vérifié avec succès',
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
