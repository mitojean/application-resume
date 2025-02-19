/// <reference path="../types/jest.d.ts" />

import {
  errorHandler,
  notFoundHandler,
  jsonSyntaxErrorHandler
} from '../../middleware/errorHandler';
import { logService } from '../../services/common';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError
} from '../../types';
import { createMockRequest, createMockResponse, createMockNext } from '../setup';
import { NextFunction } from 'express';

// Mock des dépendances
jest.mock('../../services/common');

describe('Error Handler Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('errorHandler', () => {
    it('devrait gérer une AppError', () => {
      // Arrange
      const error = new AppError('Test error', 400);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as jest.MockedFunction<NextFunction>;

      // Act
      errorHandler(error, req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Test error',
          status: 400
        }
      });
      expect(logService.error).toHaveBeenCalled();
    });

    it('devrait gérer une ValidationError', () => {
      // Arrange
      const error = new ValidationError('Validation failed', {
        field: 'email',
        message: 'Invalid email'
      });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as jest.MockedFunction<NextFunction>;

      // Act
      errorHandler(error, req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Validation failed',
          status: 400,
          details: {
            field: 'email',
            message: 'Invalid email'
          }
        }
      });
    });

    it('devrait gérer une AuthenticationError', () => {
      // Arrange
      const error = new AuthenticationError('Authentication failed');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as jest.MockedFunction<NextFunction>;

      // Act
      errorHandler(error, req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Authentication failed',
          status: 401
        }
      });
    });

    it('devrait gérer une AuthorizationError', () => {
      // Arrange
      const error = new AuthorizationError('Unauthorized access');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as jest.MockedFunction<NextFunction>;

      // Act
      errorHandler(error, req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Unauthorized access',
          status: 403
        }
      });
    });

    it('devrait gérer une erreur inconnue en production', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const error = new Error('Unknown error');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as jest.MockedFunction<NextFunction>;

      // Act
      errorHandler(error, req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Erreur interne du serveur',
          status: 500
        }
      });

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });

    it('devrait inclure la stack trace en développement', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const error = new Error('Development error');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as jest.MockedFunction<NextFunction>;

      // Act
      errorHandler(error, req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'Development error',
          status: 500,
          stack: expect.any(String)
        }
      });

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('notFoundHandler', () => {
    it('devrait gérer les routes non trouvées', () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as jest.MockedFunction<NextFunction>;

      // Act
      notFoundHandler(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
      const error = next.mock.calls[0][0] as unknown as NotFoundError;
      expect(error instanceof NotFoundError).toBe(true);
      expect(error.message).toBe('Route non trouvée');
      expect(error.status).toBe(404);
    });
  });

  describe('jsonSyntaxErrorHandler', () => {
    it('devrait gérer les erreurs de syntaxe JSON', () => {
      // Arrange
      const error = new SyntaxError('Invalid JSON');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as jest.MockedFunction<NextFunction>;

      // Act
      jsonSyntaxErrorHandler(error, req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: 'JSON invalide',
          status: 400
        }
      });
    });

    it('devrait passer les erreurs non-JSON au prochain middleware', () => {
      // Arrange
      const error = new Error('Non-JSON error');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as jest.MockedFunction<NextFunction>;

      // Act
      jsonSyntaxErrorHandler(error, req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(error);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
