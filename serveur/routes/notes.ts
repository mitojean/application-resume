import { Router } from 'express';
import { validate, validationSchemas } from '../middleware/validation';
import { noteService } from '../services/note';
import { checkApiKey } from '../middleware/security';
import { authenticateUser } from '../middleware/auth';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

// Tous les endpoints nécessitent une authentification
router.use(authenticateUser);

/**
 * @route POST /api/notes
 * @desc Créer une nouvelle note
 */
router.post(
  '/',
  checkApiKey,
  validate([
    ...validationSchemas.text('titre', { min: 1, max: 255 }),
    ...validationSchemas.text('contenu', { min: 1 })
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { titre, contenu } = req.body;
      const utilisateur_id = (req as any).utilisateur.id;

      const note = await noteService.create({
        utilisateur_id,
        titre,
        contenu
      });

      res.status(201).json({
        success: true,
        data: note
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/notes
 * @desc Récupérer toutes les notes de l'utilisateur
 */
router.get(
  '/',
  checkApiKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const utilisateur_id = (req as any).utilisateur.id;
      const notes = await noteService.findAll(utilisateur_id);

      res.json({
        success: true,
        data: notes
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/notes/:id
 * @desc Récupérer une note par son ID
 */
router.get(
  '/:id',
  checkApiKey,
  validate([...validationSchemas.id()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const utilisateur_id = (req as any).utilisateur.id;

      const note = await noteService.findById(id, utilisateur_id);
      res.json({
        success: true,
        data: note
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/notes/:id
 * @desc Mettre à jour une note
 */
router.put(
  '/:id',
  checkApiKey,
  validate([
    ...validationSchemas.id(),
    ...validationSchemas.text('titre', { min: 1, max: 255 }),
    ...validationSchemas.text('contenu', { min: 1 })
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const utilisateur_id = (req as any).utilisateur.id;
      const { titre, contenu } = req.body;

      const updateData: {
        titre?: string;
        contenu?: string;
      } = {};

      if (titre !== undefined) updateData.titre = titre;
      if (contenu !== undefined) updateData.contenu = contenu;

      const note = await noteService.update(id, utilisateur_id, updateData);

      res.json({
        success: true,
        data: note
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/notes/:id
 * @desc Supprimer une note
 */
router.delete(
  '/:id',
  checkApiKey,
  validate([...validationSchemas.id()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const utilisateur_id = (req as any).utilisateur.id;

      await noteService.delete(id, utilisateur_id);
      res.json({
        success: true,
        message: 'Note supprimée avec succès'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/notes/:id/archive
 * @desc Archiver/Désarchiver une note
 */
router.put(
  '/:id/archive',
  checkApiKey,
  validate([...validationSchemas.id()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const utilisateur_id = (req as any).utilisateur.id;

      const note = await noteService.toggleArchive(id, utilisateur_id);
      res.json({
        success: true,
        data: note
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
