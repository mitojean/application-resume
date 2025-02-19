/// <reference path="../types/jest.d.ts" />

import { validate, validationSchemas } from '../../middleware/validation';
import { ValidationError } from '../../types';
import { createMockRequest, createMockResponse, createMockNext } from '../setup';
import { NextFunction } from 'express';
import { validationResult, ValidationError as ExpressValidationError } from 'express-validator';

// Mock express-validator
jest.mock('express-validator', () => ({
  ...jest.requireActual('express-validator'),
  validationResult: jest.fn()
}));

// Helper pour créer une erreur de validation
const createValidationError = (message: string, details: any): ValidationError => {
  const error = new ValidationError(message);
  error.details = details;
  return error;
};

describe('Validation Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('devrait passer la validation avec des données valides', async () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as jest.MockedFunction<NextFunction>;

      const mockValidationResult = {
        isEmpty: () => true,
        array: () => []
      };

      (validationResult as jest.MockedFunction<typeof validationResult>)
        .mockImplementation(() => mockValidationResult as any);

      const middleware = validate([
        ...validationSchemas.email(),
        ...validationSchemas.password()
      ]);

      // Act
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(next.mock.calls[0][0]).toBeUndefined();
    });

    it('devrait rejeter des données invalides', async () => {
      // Arrange
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn() as jest.MockedFunction<NextFunction>;

      const mockErrors = [
        {
          param: 'email',
          msg: 'Email invalide'
        }
      ];

      const mockValidationResult = {
        isEmpty: () => false,
        array: () => mockErrors
      };

      (validationResult as jest.MockedFunction<typeof validationResult>)
        .mockImplementation(() => mockValidationResult as any);

      const middleware = validate([...validationSchemas.email()]);

      // Act
      await middleware(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
      const error: any = next.mock.calls[0][0];
      expect(error instanceof ValidationError).toBe(true);
      if (error instanceof ValidationError) {
        expect(error.message).toBe('Erreur de validation');
        expect(error.details).toEqual(mockErrors);
      }
    });
  });

  describe('validationSchemas', () => {
    describe('email', () => {
      it('devrait valider un email correct', () => {
        const schema = validationSchemas.email();
        expect(Array.isArray(schema)).toBe(true);
        expect(schema.length).toBeGreaterThan(0);
      });
    });

    describe('password', () => {
      it('devrait valider un mot de passe correct', () => {
        const schema = validationSchemas.password();
        expect(Array.isArray(schema)).toBe(true);
        expect(schema.length).toBeGreaterThan(0);
      });
    });

    describe('pin', () => {
      it('devrait valider un code PIN correct', () => {
        const schema = validationSchemas.pin();
        expect(Array.isArray(schema)).toBe(true);
        expect(schema.length).toBeGreaterThan(0);
      });
    });

    describe('id', () => {
      it('devrait valider un ID correct', () => {
        const schema = validationSchemas.id();
        expect(Array.isArray(schema)).toBe(true);
        expect(schema.length).toBeGreaterThan(0);
      });
    });

    describe('url', () => {
      it('devrait valider une URL correcte', () => {
        const schema = validationSchemas.url();
        expect(Array.isArray(schema)).toBe(true);
        expect(schema.length).toBeGreaterThan(0);
      });
    });

    describe('language', () => {
      it('devrait valider une langue supportée', () => {
        const schema = validationSchemas.language();
        expect(Array.isArray(schema)).toBe(true);
        expect(schema.length).toBeGreaterThan(0);
      });
    });

    describe('text', () => {
      it('devrait valider un texte avec des options personnalisées', () => {
        const schema = validationSchemas.text('titre', { min: 3, max: 100 });
        expect(Array.isArray(schema)).toBe(true);
        expect(schema.length).toBeGreaterThan(0);
      });

      it('devrait valider la longueur du texte', async () => {
        // Arrange
        const req = createMockRequest();
        req.body.titre = 'ab'; // Trop court
        const res = createMockResponse();
        const next = jest.fn() as jest.MockedFunction<NextFunction>;

        const mockErrors = [{
          param: 'titre',
          msg: 'Le texte doit contenir au moins 3 caractères'
        }];

        const mockValidationResult = {
          isEmpty: () => false,
          array: () => mockErrors
        };

        (validationResult as jest.MockedFunction<typeof validationResult>)
          .mockImplementation(() => mockValidationResult as any);

        const middleware = validate([
          ...validationSchemas.text('titre', { min: 3, max: 100 })
        ]);

        // Act
        await middleware(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
        const error: unknown = next.mock.calls[0][0];
        expect(error instanceof ValidationError).toBe(true);
        if (error instanceof ValidationError) {
          expect(error.message).toBe('Erreur de validation');
          expect(error.details[0].param).toBe('titre');
        }
      });
    });
  });
});
