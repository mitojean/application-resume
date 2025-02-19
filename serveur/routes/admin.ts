import { Router } from 'express';
import { validate, validationSchemas } from '../middleware/validation';
import { checkApiKey } from '../middleware/security';
import { authenticateUser, authorizeAdmin } from '../middleware/auth';
import db from '../utils/db';
import { logService } from '../services/common';
import { AppError, UserModel, SystemLogModel } from '../types';
import type { Request, Response, NextFunction } from 'express';

const router = Router();

// Tous les endpoints nécessitent une authentification et des droits admin
router.use(authenticateUser);
router.use(authorizeAdmin);

/**
 * @route GET /api/admin/users
 * @desc Récupérer tous les utilisateurs
 */
router.get(
  '/users',
  checkApiKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await db.query<UserModel>(
        'SELECT * FROM utilisateurs ORDER BY cree_le DESC'
      );

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/admin/users/:id
 * @desc Récupérer un utilisateur par son ID
 */
router.get(
  '/users/:id',
  checkApiKey,
  validate([...validationSchemas.id()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await db.query<UserModel>(
        'SELECT * FROM utilisateurs WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Utilisateur non trouvé', 404);
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PUT /api/admin/users/:id
 * @desc Mettre à jour un utilisateur
 */
router.put(
  '/users/:id',
  checkApiKey,
  validate([
    ...validationSchemas.id(),
    ...validationSchemas.email(),
    ...validationSchemas.text('identifiant', { min: 3, max: 50 })
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { email, identifiant, est_verifie, role } = req.body;

      // Vérifier si l'email existe déjà
      if (email) {
        const existingUser = await db.query<UserModel>(
          'SELECT * FROM utilisateurs WHERE email = $1 AND id != $2',
          [email, id]
        );

        if (existingUser.rows.length > 0) {
          throw new AppError('Cet email est déjà utilisé', 400);
        }
      }

      const updateFields = [];
      const values = [id];
      let valueIndex = 2;

      if (email) {
        updateFields.push(`email = $${valueIndex}`);
        values.push(email);
        valueIndex++;
      }

      if (identifiant) {
        updateFields.push(`identifiant = $${valueIndex}`);
        values.push(identifiant);
        valueIndex++;
      }

      if (est_verifie !== undefined) {
        updateFields.push(`est_verifie = $${valueIndex}`);
        values.push(est_verifie);
        valueIndex++;
      }

      if (role && ['utilisateur', 'admin'].includes(role)) {
        updateFields.push(`role = $${valueIndex}`);
        values.push(role);
        valueIndex++;
      }

      if (updateFields.length === 0) {
        throw new AppError('Aucune donnée à mettre à jour', 400);
      }

      const query = `
        UPDATE utilisateurs 
        SET ${updateFields.join(', ')}, modifie_le = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await db.query<UserModel>(query, values);

      if (result.rows.length === 0) {
        throw new AppError('Utilisateur non trouvé', 404);
      }

      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/admin/users/:id
 * @desc Supprimer un utilisateur
 */
router.delete(
  '/users/:id',
  checkApiKey,
  validate([...validationSchemas.id()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);

      // Vérifier que l'utilisateur n'est pas l'admin principal
      const user = await db.query<UserModel>(
        'SELECT * FROM utilisateurs WHERE id = $1',
        [id]
      );

      if (user.rows.length === 0) {
        throw new AppError('Utilisateur non trouvé', 404);
      }

      if (user.rows[0].role === 'admin' && user.rows[0].email === 'admin@app-resume.com') {
        throw new AppError('Impossible de supprimer l\'admin principal', 403);
      }

      await db.query('DELETE FROM utilisateurs WHERE id = $1', [id]);

      res.json({
        success: true,
        message: 'Utilisateur supprimé avec succès'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/admin/logs
 * @desc Récupérer les logs système
 */
router.get(
  '/logs',
  checkApiKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type, limit = '100', offset = '0' } = req.query;
      const values: any[] = [];
      let query = 'SELECT * FROM logs_systeme';
      
      if (type) {
        query += ' WHERE type = $1';
        values.push(type);
      }

      query += ' ORDER BY cree_le DESC LIMIT $' + (values.length + 1) + ' OFFSET $' + (values.length + 2);
      values.push(parseInt(limit as string, 10), parseInt(offset as string, 10));

      const result = await db.query<SystemLogModel>(query, values);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/admin/stats
 * @desc Récupérer les statistiques du système
 */
router.get(
  '/stats',
  checkApiKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await Promise.all([
        // Nombre total d'utilisateurs
        db.query('SELECT COUNT(*) as count FROM utilisateurs'),
        // Nombre de résumés par type
        db.query(`
          SELECT type, COUNT(*) as count 
          FROM resumes 
          GROUP BY type
        `),
        // Nombre de mots de passe stockés
        db.query('SELECT COUNT(*) as count FROM mots_de_passe'),
        // Nombre de notes
        db.query('SELECT COUNT(*) as count FROM notes'),
        // Nombre d'utilisateurs créés aujourd'hui
        db.query(`
          SELECT COUNT(*) as count 
          FROM utilisateurs 
          WHERE DATE(cree_le) = CURRENT_DATE
        `),
        // Nombre de résumés créés aujourd'hui
        db.query(`
          SELECT COUNT(*) as count 
          FROM resumes 
          WHERE DATE(cree_le) = CURRENT_DATE
        `)
      ]);

      res.json({
        success: true,
        data: {
          total_utilisateurs: parseInt(stats[0].rows[0].count, 10),
          resumes_par_type: stats[1].rows,
          total_mots_de_passe: parseInt(stats[2].rows[0].count, 10),
          total_notes: parseInt(stats[3].rows[0].count, 10),
          nouveaux_utilisateurs_aujourdhui: parseInt(stats[4].rows[0].count, 10),
          nouveaux_resumes_aujourdhui: parseInt(stats[5].rows[0].count, 10)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
