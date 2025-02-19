/// <reference path="../types/jest.d.ts" />

import { noteService } from '../../services/note';
import db from '../../utils/db';
import { logService } from '../../services/common';
import { AppError, NotFoundError } from '../../types';

// Mock des dépendances
jest.mock('../../utils/db');
jest.mock('../../services/common');

describe('Note Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('devrait créer une nouvelle note avec succès', async () => {
      // Arrange
      const noteData = {
        utilisateur_id: 1,
        titre: 'Test Note',
        contenu: 'Test content'
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 1,
          ...noteData,
          est_archive: false,
          cree_le: new Date(),
          modifie_le: new Date()
        }]
      });

      // Act
      const result = await noteService.create(noteData);

      // Assert
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('titre', noteData.titre);
      expect(result).toHaveProperty('contenu', noteData.contenu);
      expect(result).toHaveProperty('est_archive', false);
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(logService.info).toHaveBeenCalledWith('note_created', expect.any(Object));
    });
  });

  describe('findAll', () => {
    it('devrait récupérer toutes les notes d\'un utilisateur', async () => {
      // Arrange
      const utilisateur_id = 1;
      const mockNotes = [
        {
          id: 1,
          utilisateur_id,
          titre: 'Note 1',
          contenu: 'Content 1',
          est_archive: false
        },
        {
          id: 2,
          utilisateur_id,
          titre: 'Note 2',
          contenu: 'Content 2',
          est_archive: true
        }
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockNotes
      });

      // Act
      const result = await noteService.findAll(utilisateur_id);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockNotes);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('devrait récupérer une note par son ID', async () => {
      // Arrange
      const mockNote = {
        id: 1,
        utilisateur_id: 1,
        titre: 'Test Note',
        contenu: 'Test content',
        est_archive: false
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockNote]
      });

      // Act
      const result = await noteService.findById(1, 1);

      // Assert
      expect(result).toEqual(mockNote);
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it('devrait rejeter si la note n\'existe pas', async () => {
      // Arrange
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(noteService.findById(1, 1))
        .rejects
        .toThrow('Note non trouvée');
    });
  });

  describe('update', () => {
    it('devrait mettre à jour une note avec succès', async () => {
      // Arrange
      const updateData = {
        titre: 'Updated Title',
        contenu: 'Updated content'
      };

      const mockUpdatedNote = {
        id: 1,
        utilisateur_id: 1,
        ...updateData,
        est_archive: false,
        modifie_le: new Date()
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockUpdatedNote]
      });

      // Act
      const result = await noteService.update(1, 1, updateData);

      // Assert
      expect(result).toEqual(mockUpdatedNote);
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(logService.info).toHaveBeenCalledWith('note_updated', expect.any(Object));
    });

    it('devrait rejeter si aucune donnée à mettre à jour', async () => {
      // Act & Assert
      await expect(noteService.update(1, 1, {}))
        .rejects
        .toThrow('Aucune donnée à mettre à jour');
    });
  });

  describe('delete', () => {
    it('devrait supprimer une note avec succès', async () => {
      // Arrange
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      // Act
      await noteService.delete(1, 1);

      // Assert
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(logService.info).toHaveBeenCalledWith('note_deleted', expect.any(Object));
    });

    it('devrait rejeter si la note n\'existe pas', async () => {
      // Arrange
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(noteService.delete(1, 1))
        .rejects
        .toThrow('Note non trouvée');
    });
  });

  describe('toggleArchive', () => {
    it('devrait archiver une note non archivée', async () => {
      // Arrange
      const mockNote = {
        id: 1,
        utilisateur_id: 1,
        titre: 'Test Note',
        contenu: 'Test content',
        est_archive: true,
        modifie_le: new Date()
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockNote]
      });

      // Act
      const result = await noteService.toggleArchive(1, 1);

      // Assert
      expect(result).toEqual(mockNote);
      expect(result.est_archive).toBe(true);
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(logService.info).toHaveBeenCalledWith('note_archived', expect.any(Object));
    });

    it('devrait désarchiver une note archivée', async () => {
      // Arrange
      const mockNote = {
        id: 1,
        utilisateur_id: 1,
        titre: 'Test Note',
        contenu: 'Test content',
        est_archive: false,
        modifie_le: new Date()
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockNote]
      });

      // Act
      const result = await noteService.toggleArchive(1, 1);

      // Assert
      expect(result).toEqual(mockNote);
      expect(result.est_archive).toBe(false);
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(logService.info).toHaveBeenCalledWith('note_unarchived', expect.any(Object));
    });

    it('devrait rejeter si la note n\'existe pas', async () => {
      // Arrange
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(noteService.toggleArchive(1, 1))
        .rejects
        .toThrow('Note non trouvée');
    });
  });
});
