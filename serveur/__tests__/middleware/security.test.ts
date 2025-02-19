/// <reference path="../types/jest.d.ts" />

import {
  rateLimiter,
  corsOptions,
  helmetConfig,
  sanitizeInput,
  checkContentType,
  checkApiKey
} from '../../middleware/security';
import { AppError, AuthenticationError } from '../../types';
import { createMockRequest, createMockResponse, createMockNext } from '../setup';
import { NextFunction } from 'express';
import config from '../../config/config';

describe('Security Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('corsOptions', () => {
    it('devrait avoir les bonnes options CORS', () => {
      expect(corsOptions).toEqual({
        origin: config.CORS_ORIGINS,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
        exposedHeaders: ['Content-Range', 'X-Content-Range'],
        credentials: true,
        maxAge: 86400
      });
    });
  });

  describe('helmetConfig', () => {
    it('devrait avoir les bonnes options Helmet', () => {
      expect(helmetConfig).toEqual({
        contentSecurityPolicy: {
          directives: config.CSP_DIRECTIVES
        },
        crossOriginEmbedderPolicy: true,
        crossOriginOpenerPolicy: true,
        crossOriginResourcePolicy: true,
        dnsPrefetchControl: true,
        frameguard: true,
        hidePoweredBy: true,
        hsts: true,
        ieNoOpen: true,
        noSniff: true,
        originAgentCluster: true,
        permittedCrossDomainPolicies: true,
        referrerPolicy: true,
        xssFilter: true
      });
    });
  });

  describe('sanitizeInput', () => {
    it('devrait nettoyer les entrées', () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as jest.MockedFunction<NextFunction>;

      req.body = {
        name: '<script>alert("xss")</script>John',
        email: 'john@example.com',
        nested: {
          field: '<img src="x" onerror="alert(1)">value'
        }
      };

      // Act
      sanitizeInput(req, res, next);

      // Assert
      expect(req.body).toEqual({
        name: 'John',
        email: 'john@example.com',
        nested: {
          field: 'value'
        }
      });
      expect(next).toHaveBeenCalled();
    });

    it('devrait gérer les tableaux', () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as jest.MockedFunction<NextFunction>;

      req.body = {
        items: [
          '<script>alert(1)</script>item1',
          '<img src="x" onerror="alert(2)">item2'
        ]
      };

      // Act
      sanitizeInput(req, res, next);

      // Assert
      expect(req.body).toEqual({
        items: ['item1', 'item2']
      });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('checkContentType', () => {
    it('devrait accepter application/json', () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as jest.MockedFunction<NextFunction>;

      req.headers['content-type'] = 'application/json';

      // Act
      checkContentType(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalledWith(expect.any(AppError));
    });

    it('devrait rejeter les autres types de contenu', () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as jest.MockedFunction<NextFunction>;

      req.headers['content-type'] = 'text/plain';

      // Act
      checkContentType(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as unknown as AppError;
      expect(error.message).toBe('Content-Type non supporté');
      expect(error.status).toBe(415);
    });

    it('devrait accepter les requêtes sans content-type pour certaines méthodes', () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as jest.MockedFunction<NextFunction>;

      req.method = 'GET';
      delete req.headers['content-type'];

      // Act
      checkContentType(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('checkApiKey', () => {
    it('devrait accepter une clé API valide', () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as jest.MockedFunction<NextFunction>;

      req.headers['x-api-key'] = config.API_KEY;

      // Act
      checkApiKey(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalledWith(expect.any(AuthenticationError));
    });

    it('devrait rejeter une clé API invalide', () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as jest.MockedFunction<NextFunction>;

      req.headers['x-api-key'] = 'invalid-key';

      // Act
      checkApiKey(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
      const error = next.mock.calls[0][0] as unknown as AuthenticationError;
      expect(error.message).toBe('Clé API invalide');
      expect(error.status).toBe(401);
    });

    it('devrait rejeter une requête sans clé API', () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as jest.MockedFunction<NextFunction>;

      // Act
      checkApiKey(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
      const error = next.mock.calls[0][0] as unknown as AuthenticationError;
      expect(error.message).toBe('Clé API manquante');
      expect(error.status).toBe(401);
    });
  });

  describe('rateLimiter', () => {
    it('devrait avoir la bonne configuration', () => {
      expect(rateLimiter).toHaveProperty('windowMs', config.RATE_LIMIT_WINDOW);
      expect(rateLimiter).toHaveProperty('max', config.RATE_LIMIT_MAX);
      expect(rateLimiter).toHaveProperty('message', {
        success: false,
        error: {
          message: 'Trop de requêtes, veuillez réessayer plus tard',
          status: 429
        }
      });
    });
  });
});
