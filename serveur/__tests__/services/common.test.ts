/// <reference path="../types/jest.d.ts" />

import { logService, emailService, performanceService } from '../../services/common';
import winston from 'winston';
import nodemailer from 'nodemailer';
import config from '../../config/config';
import { AppError } from '../../types';

// Mock winston
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn()
  },
  transports: {
    File: jest.fn(),
    Console: jest.fn()
  }
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn()
  }))
}));

describe('Common Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logService', () => {
    const mockLogger = winston.createLogger();

    it('devrait logger des informations', () => {
      // Act
      logService.info('test_event', { key: 'value' });

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith({
        event: 'test_event',
        key: 'value'
      });
    });

    it('devrait logger des avertissements', () => {
      // Act
      logService.warn('warning_event', { key: 'value' });

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith({
        event: 'warning_event',
        key: 'value'
      });
    });

    it('devrait logger des erreurs', () => {
      // Act
      logService.error('error_event', { error: 'test error' });

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith({
        event: 'error_event',
        error: 'test error'
      });
    });

    it('devrait logger des messages de debug', () => {
      // Act
      logService.debug('debug_event', { key: 'value' });

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith({
        event: 'debug_event',
        key: 'value'
      });
    });
  });

  describe('emailService', () => {
    const mockTransporter = nodemailer.createTransport();

    describe('sendEmail', () => {
      it('devrait envoyer un email avec succès', async () => {
        // Arrange
        const to = 'test@example.com';
        const subject = 'Test Subject';
        const html = '<p>Test content</p>';

        (mockTransporter.sendMail as jest.Mock).mockResolvedValueOnce({
          messageId: 'test-id'
        });

        // Act
        await emailService.sendEmail(to, subject, html);

        // Assert
        expect(mockTransporter.sendMail).toHaveBeenCalledWith({
          from: config.EMAIL_FROM,
          to,
          subject,
          html
        });
        expect(logService.info).toHaveBeenCalledWith('email_sent', expect.any(Object));
      });

      it('devrait gérer les erreurs d\'envoi d\'email', async () => {
        // Arrange
        const error = new Error('SMTP error');
        (mockTransporter.sendMail as jest.Mock).mockRejectedValueOnce(error);

        // Act & Assert
        await expect(emailService.sendEmail(
          'test@example.com',
          'Test',
          'Content'
        )).rejects.toThrow(AppError);

        expect(logService.error).toHaveBeenCalledWith('email_send_error', expect.any(Object));
      });
    });

    describe('generateTemplate', () => {
      it('devrait générer un template de vérification', () => {
        // Arrange
        const data = { url: 'https://example.com/verify' };

        // Act
        const html = emailService.generateTemplate('verification', data);

        // Assert
        expect(html).toContain('Vérification de votre compte');
        expect(html).toContain(data.url);
      });

      it('devrait générer un template de réinitialisation de mot de passe', () => {
        // Arrange
        const data = { url: 'https://example.com/reset' };

        // Act
        const html = emailService.generateTemplate('reset-password', data);

        // Assert
        expect(html).toContain('Réinitialisation de votre mot de passe');
        expect(html).toContain(data.url);
      });

      it('devrait générer un template de bienvenue', () => {
        // Act
        const html = emailService.generateTemplate('welcome', {});

        // Assert
        expect(html).toContain('Bienvenue sur Application Resume');
        expect(html).toContain('votre compte a été créé avec succès');
      });
    });
  });

  describe('performanceService', () => {
    describe('measure', () => {
      it('devrait mesurer le temps d\'exécution d\'une fonction', async () => {
        // Arrange
        const mockFn = jest.fn().mockResolvedValue('result');

        // Act
        const result = await performanceService.measure('test_operation', mockFn);

        // Assert
        expect(result).toBe('result');
        expect(mockFn).toHaveBeenCalled();
        expect(logService.info).toHaveBeenCalledWith('performance_measure', expect.any(Object));
      });

      it('devrait gérer les erreurs et logger la durée', async () => {
        // Arrange
        const error = new Error('Test error');
        const mockFn = jest.fn().mockRejectedValue(error);

        // Act & Assert
        await expect(performanceService.measure('test_operation', mockFn))
          .rejects
          .toThrow(error);

        expect(logService.error).toHaveBeenCalledWith('performance_measure_error', expect.any(Object));
      });
    });
  });
});
