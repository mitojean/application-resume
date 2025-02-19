import { Router } from 'express';
import { validate, validationSchemas } from '../middleware/validation';
import { resumeService } from '../services/resume';
import { checkApiKey } from '../middleware/security';
import { authenticateUser } from '../middleware/auth';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';
import fileUpload from 'express-fileupload';

const router = Router();

// Tous les endpoints nécessitent une authentification
router.use(authenticateUser);

/**
 * @route POST /api/resumes/url
 * @desc Résumer un article à partir d'une URL
 */
router.post(
  '/url',
  checkApiKey,
  validate([
    ...validationSchemas.url(),
    ...validationSchemas.language()
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { url, langue } = req.body;
      const utilisateur_id = (req as any).utilisateur.id;

      const resume = await resumeService.summarizeUrl(utilisateur_id, url, langue);
      res.json({
        success: true,
        data: resume
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/resumes/texte
 * @desc Résumer un texte
 */
router.post(
  '/texte',
  checkApiKey,
  validate([
    ...validationSchemas.text('texte', { min: 100 }),
    ...validationSchemas.language()
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { texte, langue } = req.body;
      const utilisateur_id = (req as any).utilisateur.id;

      const resume = await resumeService.summarizeText(utilisateur_id, texte, langue);
      res.json({
        success: true,
        data: resume
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/resumes/pdf
 * @desc Résumer un PDF
 */
router.post(
  '/pdf',
  checkApiKey,
  validate([...validationSchemas.language()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.files || !req.files.pdf) {
        throw new AppError('Fichier PDF requis', 400);
      }

      const pdf = req.files.pdf;
      const pdfFile = Array.isArray(pdf) ? pdf[0] : pdf;

      if (pdfFile.mimetype !== 'application/pdf') {
        throw new AppError('Le fichier doit être un PDF', 400);
      }

      const { langue } = req.body;
      const utilisateur_id = (req as any).utilisateur.id;

      const resume = await resumeService.summarizePdf(utilisateur_id, pdfFile.data, langue);
      res.json({
        success: true,
        data: resume
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route POST /api/resumes/youtube
 * @desc Résumer une vidéo YouTube
 */
router.post(
  '/youtube',
  checkApiKey,
  validate([
    ...validationSchemas.url('videoUrl'),
    ...validationSchemas.language()
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { videoUrl, langue } = req.body;
      const utilisateur_id = (req as any).utilisateur.id;

      const resume = await resumeService.summarizeYoutube(utilisateur_id, videoUrl, langue);
      res.json({
        success: true,
        data: resume
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/resumes
 * @desc Récupérer tous les résumés de l'utilisateur
 */
router.get(
  '/',
  checkApiKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const utilisateur_id = (req as any).utilisateur.id;
      const resumes = await resumeService.findAll(utilisateur_id);
      res.json({
        success: true,
        data: resumes
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/resumes/:id
 * @desc Récupérer un résumé par son ID
 */
router.get(
  '/:id',
  checkApiKey,
  validate([...validationSchemas.id()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const utilisateur_id = (req as any).utilisateur.id;

      const resume = await resumeService.findById(id, utilisateur_id);
      res.json({
        success: true,
        data: resume
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/resumes/:id
 * @desc Supprimer un résumé
 */
router.delete(
  '/:id',
  checkApiKey,
  validate([...validationSchemas.id()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const utilisateur_id = (req as any).utilisateur.id;

      await resumeService.delete(id, utilisateur_id);
      res.json({
        success: true,
        message: 'Résumé supprimé avec succès'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
