/// <reference path="../types/jest.d.ts" />

import { resumeService } from '../../services/resume';
import db from '../../utils/db';
import { logService } from '../../services/common';
import { testData } from '../setup';
import { AppError, NotFoundError, SupportedLanguage } from '../../types';
import { OpenAI } from 'openai';

// Mock des dépendances
jest.mock('../../utils/db');
jest.mock('../../services/common');
jest.mock('openai');
jest.mock('cheerio', () => ({
  load: jest.fn().mockReturnValue({
    text: jest.fn().mockReturnValue('Article content')
  })
}));
jest.mock('pdf-parse', () => jest.fn().mockResolvedValue({
  text: 'PDF content',
  numpages: 2
}));
jest.mock('youtube-captions-scraper', () => ({
  getSubtitles: jest.fn().mockResolvedValue([
    { text: 'Caption 1' },
    { text: 'Caption 2' }
  ])
}));

describe('Resume Service', () => {
  const defaultLanguage: SupportedLanguage = 'fr';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('summarizeUrl', () => {
    it('devrait résumer un article web avec succès', async () => {
      // Arrange
      const urlData = testData.resumes.article;
      global.fetch = jest.fn().mockResolvedValueOnce({
        text: () => Promise.resolve('<article>Test content</article>')
      });

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 1,
          utilisateur_id: 1,
          type: 'article',
          resume: 'Test summary',
          source_url: urlData.url,
          langue: urlData.langue
        }]
      });

      // Act
      const result = await resumeService.summarizeUrl(1, urlData.url, defaultLanguage);

      // Assert
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('resume', 'Test summary');
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(logService.info).toHaveBeenCalledWith('url_summarized', expect.any(Object));
    });

    it('devrait rejeter si l\'URL est invalide', async () => {
      // Arrange
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Invalid URL'));

      // Act & Assert
      await expect(resumeService.summarizeUrl(1, 'invalid-url', defaultLanguage))
        .rejects
        .toThrow('Erreur lors de la récupération de l\'article');
    });
  });

  describe('summarizeText', () => {
    it('devrait résumer un texte avec succès', async () => {
      // Arrange
      const texte = 'Test content to summarize';
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 1,
          utilisateur_id: 1,
          type: 'texte',
          resume: 'Test summary',
          langue: defaultLanguage
        }]
      });

      // Act
      const result = await resumeService.summarizeText(1, texte, defaultLanguage);

      // Assert
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('resume', 'Test summary');
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(logService.info).toHaveBeenCalledWith('text_summarized', expect.any(Object));
    });
  });

  describe('summarizePdf', () => {
    it('devrait résumer un PDF avec succès', async () => {
      // Arrange
      const pdfBuffer = Buffer.from('PDF content');
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 1,
          utilisateur_id: 1,
          type: 'pdf',
          resume: 'Test summary',
          langue: defaultLanguage
        }]
      });

      // Act
      const result = await resumeService.summarizePdf(1, pdfBuffer, defaultLanguage);

      // Assert
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('resume', 'Test summary');
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(logService.info).toHaveBeenCalledWith('pdf_summarized', expect.any(Object));
    });
  });

  describe('summarizeYoutube', () => {
    it('devrait résumer une vidéo YouTube avec succès', async () => {
      // Arrange
      const youtubeData = testData.resumes.youtube;
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 1,
          utilisateur_id: 1,
          type: 'youtube',
          resume: 'Test summary',
          source_url: youtubeData.url,
          langue: defaultLanguage
        }]
      });

      // Act
      const result = await resumeService.summarizeYoutube(1, youtubeData.url, defaultLanguage);

      // Assert
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('resume', 'Test summary');
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(logService.info).toHaveBeenCalledWith('youtube_summarized', expect.any(Object));
    });

    it('devrait rejeter si l\'URL YouTube est invalide', async () => {
      // Act & Assert
      await expect(resumeService.summarizeYoutube(1, 'invalid-youtube-url', defaultLanguage))
        .rejects
        .toThrow('URL YouTube invalide');
    });
  });

  describe('findAll', () => {
    it('devrait récupérer tous les résumés d\'un utilisateur', async () => {
      // Arrange
      const utilisateur_id = 1;
      const mockResumes = [
        {
          id: 1,
          utilisateur_id,
          type: 'article',
          resume: 'Summary 1'
        },
        {
          id: 2,
          utilisateur_id,
          type: 'youtube',
          resume: 'Summary 2'
        }
      ];

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: mockResumes
      });

      // Act
      const result = await resumeService.findAll(utilisateur_id);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toEqual(mockResumes);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('devrait récupérer un résumé par son ID', async () => {
      // Arrange
      const mockResume = {
        id: 1,
        utilisateur_id: 1,
        type: 'article',
        resume: 'Test summary'
      };

      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [mockResume]
      });

      // Act
      const result = await resumeService.findById(1, 1);

      // Assert
      expect(result).toEqual(mockResume);
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it('devrait rejeter si le résumé n\'existe pas', async () => {
      // Arrange
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(resumeService.findById(1, 1))
        .rejects
        .toThrow('Résumé non trouvé');
    });
  });

  describe('delete', () => {
    it('devrait supprimer un résumé avec succès', async () => {
      // Arrange
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ id: 1 }]
      });

      // Act
      await resumeService.delete(1, 1);

      // Assert
      expect(db.query).toHaveBeenCalledTimes(1);
      expect(logService.info).toHaveBeenCalledWith('resume_deleted', expect.any(Object));
    });

    it('devrait rejeter si le résumé n\'existe pas', async () => {
      // Arrange
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      // Act & Assert
      await expect(resumeService.delete(1, 1))
        .rejects
        .toThrow('Résumé non trouvé');
    });
  });
});
