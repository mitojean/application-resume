import { authService } from '../../services/auth';
import db from '../../utils/db';
import { logService, emailService } from '../../services/common';
import { testData } from '../setup';
import {
  ValidationError,
  AuthenticationError,
  NotFoundError
} from '../../types';

// Mock des dépendances
jest.mock('../../utils/db');
jest.mock('../../services/common');
jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true)
}));

describe('Auth Service', () => {
  beforeEach(() => {
    // Réinitialiser tous les mocks avant chaque test
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('devrait créer un nouvel utilisateur avec succès', async () => {
      // Arrange
      const userData = testData.users.valid;
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // Vérification email
        .mockResolvedValueOnce({ // Création utilisateur
          rows: [{
            id: 1,
            email: userData.email,
            identifiant: userData.identifiant,
            est_verifie: false,
            role: 'utilisateur'
          }]
        });

      // Act
      const result = await authService.register(userData);

      // Assert
      expect(result).toEqual({
        id: 1,
        email: userData.email,
        identifiant: userData.identifiant,
        est_verifie: false,
        role: 'utilisateur'
      });
      expect(db.query).toHaveBeenCalledTimes(2);
      expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
      expect(logService.info).toHaveBeenCalledWith('user_registered', expect.any(Object));
    });

    it('devrait rejeter si l\'email existe déjà', async () => {
      // Arrange
      const userData = testData.users.valid;
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ email: userData.email }]
      });

      // Act & Assert
      await expect(authService.register(userData))
        .rejects
        .toThrow('Cet email est déjà utilisé');
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('devrait connecter un utilisateur avec succès', async () => {
      // Arrange
      const userData = testData.users.valid;
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: userData.email,
          identifiant: userData.identifiant,
          mot_de_passe_hash: 'hashed_password',
          est_verifie: true,
          role: 'utilisateur'
        }]
      });

      // Act
      const result = await authService.login({
        email: userData.email,
        mot_de_passe: userData.mot_de_passe
      });

      // Assert
      expect(result).toHaveProperty('token');
      expect(result.user).toEqual({
        id: 1,
        email: userData.email,
        identifiant: userData.identifiant,
        est_verifie: true,
        role: 'utilisateur'
      });
      expect(logService.info).toHaveBeenCalledWith('user_logged_in', expect.any(Object));
    });

    it('devrait rejeter si l\'utilisateur n\'existe pas', async () => {
      // Arrange
      const userData = testData.users.valid;
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(authService.login({
        email: userData.email,
        mot_de_passe: userData.mot_de_passe
      }))
        .rejects
        .toThrow('Utilisateur non trouvé');
    });

    it('devrait rejeter si l\'email n\'est pas vérifié', async () => {
      // Arrange
      const userData = testData.users.valid;
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          ...userData,
          est_verifie: false,
          mot_de_passe_hash: 'hashed_password'
        }]
      });

      // Act & Assert
      await expect(authService.login({
        email: userData.email,
        mot_de_passe: userData.mot_de_passe
      }))
        .rejects
        .toThrow('Veuillez vérifier votre email');
    });
  });

  describe('verifyEmail', () => {
    it('devrait vérifier l\'email avec succès', async () => {
      // Arrange
      const token = testData.tokens.valid;
      (db.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            utilisateur_id: 1,
            token,
            type: 'email',
            expire_le: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }]
        })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Update utilisateur
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Delete token

      // Act
      await authService.verifyEmail(token);

      // Assert
      expect(db.query).toHaveBeenCalledTimes(3);
      expect(logService.info).toHaveBeenCalledWith('email_verified', expect.any(Object));
    });

    it('devrait rejeter si le token est invalide', async () => {
      // Arrange
      const token = testData.tokens.invalid;
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(authService.verifyEmail(token))
        .rejects
        .toThrow('Token de vérification invalide');
    });

    it('devrait rejeter si le token a expiré', async () => {
      // Arrange
      const token = testData.tokens.expired;
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 1,
          utilisateur_id: 1,
          token,
          type: 'email',
          expire_le: new Date(Date.now() - 1000)
        }]
      });

      // Act & Assert
      await expect(authService.verifyEmail(token))
        .rejects
        .toThrow('Token de vérification expiré');
    });
  });
});
