/// <reference path="../types/jest.d.ts" />

import { sessionService } from '../../services/session';
import db from '../../utils/db';
import { logService } from '../../services/common';
import { AppError } from '../../types';
import { testData } from '../setup';

// Mock des dépendances
jest.mock('../../utils/db');
jest.mock('../../services/common');
jest.mock('geoip-lite', () => ({
  lookup: jest.fn().mockReturnValue({
    country: 'FR',
    region: 'IDF',
    city: 'Paris'
  })
}));
jest.mock('ua-parser-js', () => {
  return jest.fn().mockImplementation(() => ({
    getResult: () => ({
      device: {
        type: 'desktop',
        vendor: 'Apple',
        model: 'MacBook'
      },
      os: {
        name: 'macOS',
        version: '12.0'
      }
    })
  }));
});

describe('Session Service', () => {
  const mockToken = 'test-token';
  const mockIp = '192.168.1.1';
  const mockUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('devrait créer une nouvelle session avec succès', async () => {
      // Arrange
      const utilisateur_id = 1;
      const mockSession = {
        id: 1,
        utilisateur_id,
        token: mockToken,
        info_appareil: {
          type: 'desktop',
          marque: 'Apple',
          modele: 'MacBook',
          os: {
            nom: 'macOS',
            version: '12.0'
          }
        },
        adresse_ip: mockIp,
        expire_le: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockSession]
      });

      // Act
      const result = await sessionService.create(utilisateur_id, mockToken, mockIp, mockUserAgent);

      // Assert
      expect(result).toEqual(mockSession);
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(logService.info).toHaveBeenCalledWith('session_created', expect.any(Object));
    });
  });

  describe('verify', () => {
    it('devrait vérifier une session valide', async () => {
      // Arrange
      const mockSession = {
        id: 1,
        token: mockToken,
        expire_le: new Date(Date.now() + 1000)
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockSession]
      });

      // Act
      const result = await sessionService.verify(mockToken);

      // Assert
      expect(result).toEqual(mockSession);
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it('devrait rejeter une session expirée', async () => {
      // Arrange
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(sessionService.verify(mockToken))
        .rejects
        .toThrow('Session invalide ou expirée');
    });
  });

  describe('delete', () => {
    it('devrait supprimer une session avec succès', async () => {
      // Arrange
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      // Act
      await sessionService.delete(mockToken);

      // Assert
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(logService.info).toHaveBeenCalledWith('session_deleted', expect.any(Object));
    });

    it('devrait rejeter si la session n\'existe pas', async () => {
      // Arrange
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(sessionService.delete(mockToken))
        .rejects
        .toThrow('Session non trouvée');
    });
  });

  describe('deleteAll', () => {
    it('devrait supprimer toutes les sessions d\'un utilisateur', async () => {
      // Arrange
      const utilisateur_id = 1;
      (db.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 2
      });

      // Act
      await sessionService.deleteAll(utilisateur_id);

      // Assert
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(logService.info).toHaveBeenCalledWith('all_sessions_deleted', expect.any(Object));
    });
  });

  describe('cleanExpired', () => {
    it('devrait nettoyer les sessions expirées', async () => {
      // Arrange
      (db.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 3
      });

      // Act
      await sessionService.cleanExpired();

      // Assert
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(logService.info).toHaveBeenCalledWith('expired_sessions_cleaned', expect.any(Object));
    });
  });

  describe('getActiveSessions', () => {
    it('devrait récupérer toutes les sessions actives d\'un utilisateur', async () => {
      // Arrange
      const utilisateur_id = 1;
      const mockSessions = [
        {
          id: 1,
          utilisateur_id,
          token: 'token1',
          expire_le: new Date(Date.now() + 1000)
        },
        {
          id: 2,
          utilisateur_id,
          token: 'token2',
          expire_le: new Date(Date.now() + 2000)
        }
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockSessions
      });

      // Act
      const result = await sessionService.getActiveSessions(utilisateur_id);

      // Assert
      expect(result).toEqual(mockSessions);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('extend', () => {
    it('devrait prolonger une session avec succès', async () => {
      // Arrange
      const mockSession = {
        id: 1,
        token: mockToken,
        expire_le: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockSession]
      });

      // Act
      const result = await sessionService.extend(mockToken);

      // Assert
      expect(result).toEqual(mockSession);
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(logService.info).toHaveBeenCalledWith('session_extended', expect.any(Object));
    });

    it('devrait rejeter si la session n\'existe pas', async () => {
      // Arrange
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(sessionService.extend(mockToken))
        .rejects
        .toThrow('Session non trouvée');
    });
  });
});
