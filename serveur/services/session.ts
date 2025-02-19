import { AppError, SessionModel, UserInfo } from '../types';
import { logService } from './common';
import db from '../utils/db';
import geoip from 'geoip-lite';
import UAParser from 'ua-parser-js';

// Utilitaires pour le traitement des informations de session
const sessionUtils = {
  /**
   * Récupérer les informations de l'appareil à partir du User-Agent
   */
  parseUserAgent(userAgent: string): UserInfo['appareil'] {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    return {
      type: result.device.type || 'desktop',
      marque: result.device.vendor || 'unknown',
      modele: result.device.model || 'unknown',
      os: {
        nom: result.os.name || 'unknown',
        version: result.os.version || 'unknown'
      }
    };
  },

  /**
   * Récupérer les informations de localisation à partir de l'IP
   */
  getLocationInfo(ip: string): UserInfo['localisation'] {
    // Ignorer les IPs locales
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return {
        pays: 'Local',
        region: 'Local',
        ville: 'Local'
      };
    }

    const geo = geoip.lookup(ip);
    return {
      pays: geo?.country || 'Unknown',
      region: geo?.region?.[0] || 'Unknown',
      ville: geo?.city || 'Unknown'
    };
  }
};

/**
 * Service de gestion des sessions
 */
export const sessionService = {
  /**
   * Créer une nouvelle session
   */
  async create(
    utilisateur_id: number,
    token: string,
    ip: string,
    userAgent: string
  ): Promise<SessionModel> {
    try {
      const info_appareil = sessionUtils.parseUserAgent(userAgent);
      const localisation = sessionUtils.getLocationInfo(ip);

      // Créer la session avec une expiration de 24h
      const result = await db.query<SessionModel>(
        `INSERT INTO sessions 
        (utilisateur_id, token, info_appareil, adresse_ip, expire_le)
        VALUES ($1, $2, $3, $4, NOW() + INTERVAL '24 hours')
        RETURNING *`,
        [utilisateur_id, token, JSON.stringify(info_appareil), ip]
      );

      logService.info('session_created', {
        utilisateur_id,
        ip,
        appareil: info_appareil
      });

      return result.rows[0];
    } catch (error) {
      logService.error('session_creation_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        utilisateur_id,
        ip
      });
      throw error;
    }
  },

  /**
   * Vérifier une session
   */
  async verify(token: string): Promise<SessionModel> {
    try {
      const result = await db.query<SessionModel>(
        'SELECT * FROM sessions WHERE token = $1 AND expire_le > NOW()',
        [token]
      );

      if (result.rows.length === 0) {
        throw new AppError('Session invalide ou expirée', 401);
      }

      return result.rows[0];
    } catch (error) {
      logService.error('session_verification_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        token
      });
      throw error;
    }
  },

  /**
   * Supprimer une session
   */
  async delete(token: string): Promise<void> {
    try {
      const result = await db.query(
        'DELETE FROM sessions WHERE token = $1 RETURNING id',
        [token]
      );

      if (result.rows.length === 0) {
        throw new AppError('Session non trouvée', 404);
      }

      logService.info('session_deleted', { token });
    } catch (error) {
      logService.error('session_deletion_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        token
      });
      throw error;
    }
  },

  /**
   * Supprimer toutes les sessions d'un utilisateur
   */
  async deleteAll(utilisateur_id: number): Promise<void> {
    try {
      await db.query(
        'DELETE FROM sessions WHERE utilisateur_id = $1',
        [utilisateur_id]
      );

      logService.info('all_sessions_deleted', { utilisateur_id });
    } catch (error) {
      logService.error('sessions_deletion_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        utilisateur_id
      });
      throw error;
    }
  },

  /**
   * Nettoyer les sessions expirées
   */
  async cleanExpired(): Promise<void> {
    try {
      const result = await db.query(
        'DELETE FROM sessions WHERE expire_le <= NOW() RETURNING id'
      );

      logService.info('expired_sessions_cleaned', {
        count: result.rowCount
      });
    } catch (error) {
      logService.error('sessions_cleanup_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  },

  /**
   * Récupérer toutes les sessions actives d'un utilisateur
   */
  async getActiveSessions(utilisateur_id: number): Promise<SessionModel[]> {
    try {
      const result = await db.query<SessionModel>(
        'SELECT * FROM sessions WHERE utilisateur_id = $1 AND expire_le > NOW() ORDER BY cree_le DESC',
        [utilisateur_id]
      );

      return result.rows;
    } catch (error) {
      logService.error('active_sessions_fetch_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        utilisateur_id
      });
      throw error;
    }
  },

  /**
   * Prolonger une session
   */
  async extend(token: string): Promise<SessionModel> {
    try {
      const result = await db.query<SessionModel>(
        'UPDATE sessions SET expire_le = NOW() + INTERVAL \'24 hours\' WHERE token = $1 RETURNING *',
        [token]
      );

      if (result.rows.length === 0) {
        throw new AppError('Session non trouvée', 404);
      }

      logService.info('session_extended', { token });

      return result.rows[0];
    } catch (error) {
      logService.error('session_extension_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        token
      });
      throw error;
    }
  }
};

export default sessionService;
