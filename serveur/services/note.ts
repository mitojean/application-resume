import { AppError, NoteModel } from '../types';
import { logService } from './common';
import db from '../utils/db';

type QueryParam = string | number | boolean | null;

/**
 * Service de gestion des notes
 */
export const noteService = {
  /**
   * Créer une nouvelle note
   */
  async create(data: {
    utilisateur_id: number;
    titre: string;
    contenu: string;
  }): Promise<NoteModel> {
    try {
      const result = await db.query<NoteModel>(
        `INSERT INTO notes 
        (utilisateur_id, titre, contenu, est_archive)
        VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [data.utilisateur_id, data.titre, data.contenu, false] as QueryParam[]
      );

      logService.info('note_created', {
        utilisateur_id: data.utilisateur_id,
        titre: data.titre
      });

      return result.rows[0];
    } catch (error) {
      logService.error('note_creation_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        utilisateur_id: data.utilisateur_id
      });
      throw error;
    }
  },

  /**
   * Récupérer toutes les notes d'un utilisateur
   */
  async findAll(utilisateur_id: number): Promise<NoteModel[]> {
    try {
      const result = await db.query<NoteModel>(
        'SELECT * FROM notes WHERE utilisateur_id = $1 ORDER BY cree_le DESC',
        [utilisateur_id] as QueryParam[]
      );

      return result.rows;
    } catch (error) {
      logService.error('note_fetch_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        utilisateur_id
      });
      throw error;
    }
  },

  /**
   * Récupérer une note par son ID
   */
  async findById(id: number, utilisateur_id: number): Promise<NoteModel> {
    try {
      const result = await db.query<NoteModel>(
        'SELECT * FROM notes WHERE id = $1 AND utilisateur_id = $2',
        [id, utilisateur_id] as QueryParam[]
      );

      if (result.rows.length === 0) {
        throw new AppError('Note non trouvée', 404);
      }

      return result.rows[0];
    } catch (error) {
      logService.error('note_fetch_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        utilisateur_id
      });
      throw error;
    }
  },

  /**
   * Mettre à jour une note
   */
  async update(
    id: number,
    utilisateur_id: number,
    data: {
      titre?: string;
      contenu?: string;
      est_archive?: boolean;
    }
  ): Promise<NoteModel> {
    try {
      const updateFields = [];
      const values: QueryParam[] = [id, utilisateur_id];
      let valueIndex = 3;

      if (data.titre !== undefined) {
        updateFields.push(`titre = $${valueIndex}`);
        values.push(data.titre);
        valueIndex++;
      }

      if (data.contenu !== undefined) {
        updateFields.push(`contenu = $${valueIndex}`);
        values.push(data.contenu);
        valueIndex++;
      }

      if (data.est_archive !== undefined) {
        updateFields.push(`est_archive = $${valueIndex}`);
        values.push(data.est_archive);
        valueIndex++;
      }

      if (updateFields.length === 0) {
        throw new AppError('Aucune donnée à mettre à jour', 400);
      }

      const query = `
        UPDATE notes 
        SET ${updateFields.join(', ')}, modifie_le = CURRENT_TIMESTAMP
        WHERE id = $1 AND utilisateur_id = $2
        RETURNING *
      `;

      const result = await db.query<NoteModel>(query, values);

      if (result.rows.length === 0) {
        throw new AppError('Note non trouvée', 404);
      }

      logService.info('note_updated', {
        id,
        utilisateur_id
      });

      return result.rows[0];
    } catch (error) {
      logService.error('note_update_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        utilisateur_id
      });
      throw error;
    }
  },

  /**
   * Supprimer une note
   */
  async delete(id: number, utilisateur_id: number): Promise<void> {
    try {
      const result = await db.query(
        'DELETE FROM notes WHERE id = $1 AND utilisateur_id = $2 RETURNING id',
        [id, utilisateur_id] as QueryParam[]
      );

      if (result.rows.length === 0) {
        throw new AppError('Note non trouvée', 404);
      }

      logService.info('note_deleted', {
        id,
        utilisateur_id
      });
    } catch (error) {
      logService.error('note_deletion_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        utilisateur_id
      });
      throw error;
    }
  },

  /**
   * Archiver/Désarchiver une note
   */
  async toggleArchive(id: number, utilisateur_id: number): Promise<NoteModel> {
    try {
      const result = await db.query<NoteModel>(
        `UPDATE notes 
        SET est_archive = NOT est_archive, modifie_le = CURRENT_TIMESTAMP
        WHERE id = $1 AND utilisateur_id = $2
        RETURNING *`,
        [id, utilisateur_id] as QueryParam[]
      );

      if (result.rows.length === 0) {
        throw new AppError('Note non trouvée', 404);
      }

      const action = result.rows[0].est_archive ? 'archived' : 'unarchived';
      logService.info(`note_${action}`, {
        id,
        utilisateur_id
      });

      return result.rows[0];
    } catch (error) {
      logService.error('note_archive_toggle_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        utilisateur_id
      });
      throw error;
    }
  }
};

export default noteService;
