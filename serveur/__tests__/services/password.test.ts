/// <reference path="../types/jest.d.ts" />

import { passwordService } from '../../services/password';
import db from '../../utils/db';
import { logService } from '../../services/common';
import { testData } from '../setup';
import { AppError, NotFoundError } from '../../types';

// Mock des dépendances
jest.mock('../../utils/db');
jest.mock('../../services/common');
jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true)
}));

describe('Password Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('devrait créer un nouveau mot de passe avec succès', async () => {
      // Arrange
      const passwordData = {
        utilisateur_id: 1,
        site_web: 'example.com',
        identifiant: 'testuser',
        mot_de_passe: 'Password123!',
        notes: 'Test notes'
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 1,
          ...passwordData,
          mot_de_passe_crypte: 'hashed_password',
          cree_le: new Date(),
          modifie_le: new Date()
        }]
      });

      // Act
      const result = await passwordService.create(passwordData);

      // Assert
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('mot_de_passe_crypte', 'hashed_password');
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(logService.info).toHaveBeenCalledWith('password_created', expect.any(Object));
    });
  });

  describe('findAll', () => {
    it('devrait récupérer tous les mots de passe d\'un utilisateur', async () => {
      // Arrange
      const utilisateur_id = 1;
      const mockPasswords = [
        {
          id: 1,
          utilisateur_id,
          site_web: 'example1.com',
          identifiant: 'user1',
          mot_de_passe_crypte: 'hash1'
        },
        {
          id: 2,
          utilisateur_id,
          site_web: 'example2.com',
          identifiant: 'user2',
          mot_de_passe_crypte: 'hash2'
        }
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockPasswords
      });

      // Act
      const result = await passwordService.findAll(utilisateur_id);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockPasswords);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('devrait récupérer un mot de passe par son ID', async () => {
      // Arrange
      const id = 1;
      const utilisateur_id = 1;
      const mockPassword = {
        id,
        utilisateur_id,
        site_web: 'example.com',
        identifiant: 'testuser',
        mot_de_passe_crypte: 'hashed_password'
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockPassword]
      });

      // Act
      const result = await passwordService.findById(id, utilisateur_id);

      // Assert
      expect(result).toEqual(mockPassword);
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it('devrait rejeter si le mot de passe n\'existe pas', async () => {
      // Arrange
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(passwordService.findById(1, 1))
        .rejects
        .toThrow('Mot de passe non trouvé');
    });
  });

  describe('update', () => {
    it('devrait mettre à jour un mot de passe avec succès', async () => {
      // Arrange
      const id = 1;
      const utilisateur_id = 1;
      const updateData = {
        site_web: 'updated.com',
        identifiant: 'newuser',
        mot_de_passe: 'NewPassword123!'
      };

      const mockUpdatedPassword = {
        id,
        utilisateur_id,
        ...updateData,
        mot_de_passe_crypte: 'new_hashed_password',
        modifie_le: new Date()
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockUpdatedPassword]
      });

      // Act
      const result = await passwordService.update(id, utilisateur_id, updateData);

      // Assert
      expect(result).toEqual(mockUpdatedPassword);
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(logService.info).toHaveBeenCalledWith('password_updated', expect.any(Object));
    });

    it('devrait rejeter si aucune donnée à mettre à jour', async () => {
      // Act & Assert
      await expect(passwordService.update(1, 1, {}))
        .rejects
        .toThrow('Aucune donnée à mettre à jour');
    });
  });

  describe('delete', () => {
    it('devrait supprimer un mot de passe avec succès', async () => {
      // Arrange
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      // Act
      await passwordService.delete(1, 1);

      // Assert
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(logService.info).toHaveBeenCalledWith('password_deleted', expect.any(Object));
    });

    it('devrait rejeter si le mot de passe n\'existe pas', async () => {
      // Arrange
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(passwordService.delete(1, 1))
        .rejects
        .toThrow('Mot de passe non trouvé');
    });
  });

  describe('generateSecurePassword', () => {
    it('devrait générer un mot de passe sécurisé de la longueur spécifiée', () => {
      // Act
      const password = passwordService.generateSecurePassword(16);

      // Assert
      expect(password).toHaveLength(16);
      expect(password).toMatch(/[A-Z]/); // Au moins une majuscule
      expect(password).toMatch(/[a-z]/); // Au moins une minuscule
      expect(password).toMatch(/[0-9]/); // Au moins un chiffre
      expect(password).toMatch(/[^A-Za-z0-9]/); // Au moins un caractère spécial
    });

    it('devrait générer des mots de passe différents à chaque appel', () => {
      // Act
      const password1 = passwordService.generateSecurePassword();
      const password2 = passwordService.generateSecurePassword();

      // Assert
      expect(password1).not.toEqual(password2);
    });
  });

  describe('checkPasswordStrength', () => {
    it('devrait retourner un score parfait pour un mot de passe fort', () => {
      // Act
      const result = passwordService.checkPasswordStrength('StrongP@ssw0rd');

      // Assert
      expect(result.score).toBe(6);
      expect(result.feedback).toEqual(['Mot de passe fort']);
    });

    it('devrait identifier les faiblesses d\'un mot de passe', () => {
      // Act
      const result = passwordService.checkPasswordStrength('weak');

      // Assert
      expect(result.score).toBeLessThan(6);
      expect(result.feedback).toContain('Le mot de passe doit contenir au moins 8 caractères');
      expect(result.feedback).toContain('Le mot de passe doit contenir au moins une majuscule');
      expect(result.feedback).toContain('Le mot de passe doit contenir au moins un chiffre');
      expect(result.feedback).toContain('Le mot de passe doit contenir au moins un caractère spécial');
    });
  });
});
