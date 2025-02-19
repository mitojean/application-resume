import bcrypt from 'bcrypt';
import { AppError, PasswordModel } from '../types';
import { logService } from './common';
import db from '../utils/db';
import config from '../config/config';

/**
 * Service de gestion des mots de passe
 */
export const passwordService = {
  /**
   * Créer un nouveau mot de passe
   */
  async create(data: {
    utilisateur_id: number;
    site_web: string;
    identifiant: string;
    mot_de_passe: string;
    notes?: string;
  }): Promise<PasswordModel> {
    try {
      // Chiffrement du mot de passe
      const salt = await bcrypt.genSalt(config.BCRYPT_ROUNDS);
      const motDePasseCrypte = await bcrypt.hash(data.mot_de_passe, salt);

      // Enregistrement du mot de passe
      const result = await db.query<PasswordModel>(
        `INSERT INTO mots_de_passe 
        (utilisateur_id, site_web, identifiant, mot_de_passe_crypte, notes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [data.utilisateur_id, data.site_web, data.identifiant, motDePasseCrypte, data.notes]
      );

      logService.info('password_created', { 
        utilisateur_id: data.utilisateur_id,
        site_web: data.site_web 
      });

      return result.rows[0];
    } catch (error) {
      logService.error('password_creation_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        utilisateur_id: data.utilisateur_id
      });
      throw error;
    }
  },

  /**
   * Récupérer tous les mots de passe d'un utilisateur
   */
  async findAll(utilisateur_id: number): Promise<PasswordModel[]> {
    try {
      const result = await db.query<PasswordModel>(
        'SELECT * FROM mots_de_passe WHERE utilisateur_id = $1 ORDER BY cree_le DESC',
        [utilisateur_id]
      );

      return result.rows;
    } catch (error) {
      logService.error('password_fetch_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        utilisateur_id
      });
      throw error;
    }
  },

  /**
   * Récupérer un mot de passe par son ID
   */
  async findById(id: number, utilisateur_id: number): Promise<PasswordModel> {
    try {
      const result = await db.query<PasswordModel>(
        'SELECT * FROM mots_de_passe WHERE id = $1 AND utilisateur_id = $2',
        [id, utilisateur_id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Mot de passe non trouvé', 404);
      }

      return result.rows[0];
    } catch (error) {
      logService.error('password_fetch_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        utilisateur_id
      });
      throw error;
    }
  },

  /**
   * Mettre à jour un mot de passe
   */
  async update(
    id: number,
    utilisateur_id: number,
    data: {
      site_web?: string;
      identifiant?: string;
      mot_de_passe?: string;
      notes?: string;
    }
  ): Promise<PasswordModel> {
    try {
      let motDePasseCrypte;
      if (data.mot_de_passe) {
        const salt = await bcrypt.genSalt(config.BCRYPT_ROUNDS);
        motDePasseCrypte = await bcrypt.hash(data.mot_de_passe, salt);
      }

      const updateFields = [];
      const values = [id, utilisateur_id];
      let valueIndex = 3;

      if (data.site_web) {
        updateFields.push(`site_web = $${valueIndex}`);
        values.push(data.site_web);
        valueIndex++;
      }

      if (data.identifiant) {
        updateFields.push(`identifiant = $${valueIndex}`);
        values.push(data.identifiant);
        valueIndex++;
      }

      if (motDePasseCrypte) {
        updateFields.push(`mot_de_passe_crypte = $${valueIndex}`);
        values.push(motDePasseCrypte);
        valueIndex++;
      }

      if (data.notes !== undefined) {
        updateFields.push(`notes = $${valueIndex}`);
        values.push(data.notes);
        valueIndex++;
      }

      if (updateFields.length === 0) {
        throw new AppError('Aucune donnée à mettre à jour', 400);
      }

      const query = `
        UPDATE mots_de_passe 
        SET ${updateFields.join(', ')}, modifie_le = CURRENT_TIMESTAMP
        WHERE id = $1 AND utilisateur_id = $2
        RETURNING *
      `;

      const result = await db.query<PasswordModel>(query, values);

      if (result.rows.length === 0) {
        throw new AppError('Mot de passe non trouvé', 404);
      }

      logService.info('password_updated', { 
        id,
        utilisateur_id 
      });

      return result.rows[0];
    } catch (error) {
      logService.error('password_update_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        utilisateur_id
      });
      throw error;
    }
  },

  /**
   * Supprimer un mot de passe
   */
  async delete(id: number, utilisateur_id: number): Promise<void> {
    try {
      const result = await db.query(
        'DELETE FROM mots_de_passe WHERE id = $1 AND utilisateur_id = $2 RETURNING id',
        [id, utilisateur_id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Mot de passe non trouvé', 404);
      }

      logService.info('password_deleted', { 
        id,
        utilisateur_id 
      });
    } catch (error) {
      logService.error('password_deletion_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        utilisateur_id
      });
      throw error;
    }
  },

  /**
   * Générer un mot de passe sécurisé
   */
  generateSecurePassword(length: number = 16): string {
    const getRandomElement = <T>(array: T[]): T => {
      return array[Math.floor(Math.random() * array.length)];
    };

    const lowercase = [...'abcdefghijklmnopqrstuvwxyz'];
    const uppercase = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
    const numbers = [...'0123456789'];
    const symbols = [...'!@#$%^&*()_+-=[]{}|;:,.<>?'];
    
    const allChars = [...lowercase, ...uppercase, ...numbers, ...symbols];
    
    // Assurer au moins un caractère de chaque type
    const password = [
      getRandomElement(lowercase),
      getRandomElement(uppercase),
      getRandomElement(numbers),
      getRandomElement(symbols)
    ];

    // Compléter avec des caractères aléatoires
    while (password.length < length) {
      password.push(getRandomElement(allChars));
    }

    // Mélanger le mot de passe
    return password
      .sort(() => Math.random() - 0.5)
      .join('');
  },

  /**
   * Vérifier la force d'un mot de passe
   */
  checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
  } {
    const feedback = [];
    let score = 0;

    // Longueur minimale
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('Le mot de passe doit contenir au moins 8 caractères');
    }

    // Présence de majuscules
    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Ajouter au moins une majuscule');
    }

    // Présence de minuscules
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Ajouter au moins une minuscule');
    }

    // Présence de chiffres
    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Ajouter au moins un chiffre');
    }

    // Présence de caractères spéciaux
    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Ajouter au moins un caractère spécial');
    }

    // Longueur supplémentaire
    if (password.length >= 12) {
      score += 1;
    }

    return {
      score, // Score sur 6
      feedback: feedback.length > 0 ? feedback : ['Mot de passe fort']
    };
  }
};

export default passwordService;
