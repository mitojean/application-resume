import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AppError, UserPayload, UserModel } from '../types';
import { logService } from './common';
import db from '../utils/db';
import config from '../config/config';
import { emailService } from './common';
import { generateToken, generatePin } from '../utils/helpers';

/**
 * Service d'authentification
 */
export const authService = {
  /**
   * Inscription d'un nouvel utilisateur
   */
  async register(data: {
    email: string;
    identifiant: string;
    mot_de_passe: string;
    code_pin: string;
  }): Promise<UserPayload> {
    try {
const existingUser = await db.query<UserModel>(
        'SELECT * FROM utilisateurs WHERE email = $1',
        [data.email]
      );

      if (existingUser.rows.length > 0) {
        throw new AppError('Cet email est déjà utilisé', 400);
      }

      // Hashage du mot de passe et du code PIN
      const salt = await bcrypt.genSalt(config.BCRYPT_ROUNDS);
      const motDePasseHash = await bcrypt.hash(data.mot_de_passe, salt);
      const codePinHash = await bcrypt.hash(data.code_pin, salt);

      // Enregistrement de l'utilisateur
      const result = await db.query<UserModel>(
        `INSERT INTO utilisateurs 
        (email, identifiant, mot_de_passe_hash, code_pin_hash, est_verifie, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, identifiant, est_verifie, role`,
        [data.email, data.identifiant, motDePasseHash, codePinHash, false, 'utilisateur']
      );

      const user: UserPayload = {
        id: result.rows[0].id,
        email: result.rows[0].email,
        identifiant: result.rows[0].identifiant,
        est_verifie: result.rows[0].est_verifie,
        role: result.rows[0].role
      };

      // Générer un token de vérification
      const verificationToken = generateToken();
      await db.query(
        'INSERT INTO tokens_verification (utilisateur_id, token, type, expire_le) VALUES ($1, $2, $3, $4)',
        [user.id, verificationToken, 'email', new Date(Date.now() + 24 * 60 * 60 * 1000)]
      );

      // Envoyer l'email de vérification
      await emailService.sendEmail(
        user.email,
        'Vérification de votre compte',
        emailService.generateTemplate('verification', {
          url: `${config.CLIENT_URL}/verify-email?token=${verificationToken}`
        })
      );

      logService.info('user_registered', { email: user.email });

      return user;
    } catch (error) {
      logService.error('registration_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  },

  /**
   * Connexion d'un utilisateur
   */
  async login(data: { email: string; mot_de_passe: string }): Promise<{ token: string; user: UserPayload }> {
    try {
      // Récupérer l'utilisateur
      const result = await db.query<UserModel>(
        'SELECT * FROM utilisateurs WHERE email = $1',
        [data.email]
      );

      if (result.rows.length === 0) {
        throw new AppError('Utilisateur non trouvé', 404);
      }

      const userModel = result.rows[0];

      // Vérifier le mot de passe
      const motDePasseValide = await bcrypt.compare(data.mot_de_passe, userModel.mot_de_passe_hash);
      if (!motDePasseValide) {
        throw new AppError('Mot de passe incorrect', 401);
      }

      // Vérifier si l'email est vérifié
      if (!userModel.est_verifie) {
        throw new AppError('Veuillez vérifier votre email', 401);
      }

      const user: UserPayload = {
        id: userModel.id,
        email: userModel.email,
        identifiant: userModel.identifiant,
        est_verifie: userModel.est_verifie,
        role: userModel.role
      };

      // Générer un token JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, identifiant: user.identifiant, est_verifie: user.est_verifie },
        config.JWT_SECRET,
        config.JWT_OPTIONS
      );

      logService.info('user_logged_in', { email: user.email });

      return { token, user };
    } catch (error) {
      logService.error('login_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  },

  /**
   * Vérification de l'email
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      // Récupérer le token de vérification
      const result = await db.query(
        'SELECT * FROM tokens_verification WHERE token = $1 AND type = $2',
        [token, 'email']
      );

      if (result.rows.length === 0) {
        throw new AppError('Token de vérification invalide', 400);
      }

      const verificationToken = result.rows[0];

      // Vérifier si le token a expiré
      if (new Date(verificationToken.expire_le) < new Date()) {
        throw new AppError('Token de vérification expiré', 400);
      }

      // Mettre à jour l'utilisateur
      await db.query(
        'UPDATE utilisateurs SET est_verifie = TRUE WHERE id = $1',
        [verificationToken.utilisateur_id]
      );

      // Supprimer le token de vérification
      await db.query(
        'DELETE FROM tokens_verification WHERE id = $1',
        [verificationToken.id]
      );

      logService.info('email_verified', { utilisateur_id: verificationToken.utilisateur_id });
    } catch (error) {
      logService.error('email_verification_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  },

  /**
   * Réinitialisation du mot de passe
   */
  async resetPassword(data: { email: string; nouveauMotDePasse: string }): Promise<void> {
    try {
      // Récupérer l'utilisateur
      const result = await db.query<UserModel>(
        'SELECT * FROM utilisateurs WHERE email = $1',
        [data.email]
      );

      if (result.rows.length === 0) {
        throw new AppError('Utilisateur non trouvé', 404);
      }

      const user = result.rows[0];

      // Hashage du nouveau mot de passe
      const salt = await bcrypt.genSalt(config.BCRYPT_ROUNDS);
      const nouveauMotDePasseHash = await bcrypt.hash(data.nouveauMotDePasse, salt);

      // Mettre à jour le mot de passe
      await db.query(
        'UPDATE utilisateurs SET mot_de_passe_hash = $1 WHERE id = $2',
        [nouveauMotDePasseHash, user.id]
      );

      logService.info('password_reset', { email: user.email });
    } catch (error) {
      logService.error('password_reset_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  },

  /**
   * Demande de réinitialisation du mot de passe
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      // Récupérer l'utilisateur
      const result = await db.query<UserModel>(
        'SELECT * FROM utilisateurs WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        throw new AppError('Utilisateur non trouvé', 404);
      }

      const user = result.rows[0];

      // Générer un token de réinitialisation
      const resetToken = generateToken();
      await db.query(
        'INSERT INTO tokens_verification (utilisateur_id, token, type, expire_le) VALUES ($1, $2, $3, $4)',
        [user.id, resetToken, 'reset_password', new Date(Date.now() + 60 * 60 * 1000)]
      );

      // Envoyer l'email de réinitialisation
      await emailService.sendEmail(
        user.email,
        'Réinitialisation de votre mot de passe',
        emailService.generateTemplate('reset-password', {
          url: `${config.CLIENT_URL}/reset-password?token=${resetToken}`
        })
      );

      logService.info('password_reset_requested', { email: user.email });
    } catch (error) {
      logService.error('password_reset_request_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  },

  /**
   * Vérification du code PIN
   */
  async verifyPin(userId: number, codePin: string): Promise<void> {
    try {
      // Récupérer l'utilisateur
      const result = await db.query<UserModel>(
        'SELECT * FROM utilisateurs WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new AppError('Utilisateur non trouvé', 404);
      }

      const user = result.rows[0];

      // Vérifier le code PIN
      const pinValide = await bcrypt.compare(codePin, user.code_pin_hash);
      if (!pinValide) {
        throw new AppError('Code PIN incorrect', 401);
      }

      logService.info('pin_verified', { utilisateur_id: user.id });
    } catch (error) {
      logService.error('pin_verification_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
};

export default authService;
