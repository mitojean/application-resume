/// <reference path="../types/jest.d.ts" />

import db from '../../utils/db';
import { logService } from '../../services/common';
import { AppError } from '../../types';
import { Pool, QueryResult } from 'pg';

// Mock pg
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn()
  };
  return { Pool: jest.fn(() => mockPool) };
});

// Mock logService
jest.mock('../../services/common', () => ({
  logService: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('Database Utility', () => {
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = (new Pool() as unknown) as jest.Mocked<Pool>;
  });

  describe('query', () => {
    it('devrait exécuter une requête avec succès', async () => {
      // Arrange
      const mockResult: QueryResult = {
        rows: [{ id: 1, name: 'test' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce(mockResult);

      // Act
      const result = await db.query('SELECT * FROM test');

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM test', undefined);
    });

    it('devrait exécuter une requête avec paramètres', async () => {
      // Arrange
      const mockResult: QueryResult = {
        rows: [{ id: 1, name: 'test' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce(mockResult);

      // Act
      const result = await db.query('SELECT * FROM test WHERE id = $1', [1]);

      // Assert
      expect(result).toEqual(mockResult);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT * FROM test WHERE id = $1', [1]);
    });

    it('devrait logger les requêtes lentes', async () => {
      // Arrange
      const mockResult: QueryResult = {
        rows: [{ id: 1, name: 'test' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };

      // Simuler une requête lente
      (mockPool.query as jest.Mock).mockImplementationOnce(() => new Promise(resolve => {
        setTimeout(() => resolve(mockResult), 150);
      }));

      // Act
      await db.query('SELECT * FROM test');

      // Assert
      expect(logService.warn).toHaveBeenCalledWith('slow_query', expect.any(Object));
    });

    it('devrait gérer les erreurs de base de données', async () => {
      // Arrange
      const dbError = new Error('Database error');
      (mockPool.query as jest.Mock).mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(db.query('SELECT * FROM test'))
        .rejects
        .toThrow(AppError);

      expect(logService.error).toHaveBeenCalledWith('query_error', expect.any(Object));
    });
  });

  describe('transaction', () => {
    it('devrait exécuter une transaction avec succès', async () => {
      // Arrange
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      (mockPool.connect as jest.Mock).mockResolvedValueOnce(mockClient);
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Actual query
        .mockResolvedValueOnce(undefined); // COMMIT

      // Act
      const result = await db.transaction(async client => {
        const res = await client.query('INSERT INTO test VALUES ($1) RETURNING id', [1]);
        return res.rows[0];
      });

      // Assert
      expect(result).toEqual({ id: 1 });
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('devrait effectuer un rollback en cas d\'erreur', async () => {
      // Arrange
      const mockClient = {
        query: jest.fn(),
        release: jest.fn()
      };

      (mockPool.connect as jest.Mock).mockResolvedValueOnce(mockClient);
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Query error')) // Actual query
        .mockResolvedValueOnce(undefined); // ROLLBACK

      // Act & Assert
      await expect(db.transaction(async client => {
        await client.query('INSERT INTO test VALUES ($1)', [1]);
      }))
        .rejects
        .toThrow('Query error');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
      expect(logService.error).toHaveBeenCalledWith('transaction_error', expect.any(Object));
    });
  });

  describe('healthCheck', () => {
    it('devrait retourner true si la base de données est en ligne', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ '1': 1 }] });

      // Act
      const result = await db.healthCheck();

      // Assert
      expect(result).toBe(true);
    });

    it('devrait retourner false si la base de données est hors ligne', async () => {
      // Arrange
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Connection error'));

      // Act
      const result = await db.healthCheck();

      // Assert
      expect(result).toBe(false);
      expect(logService.error).toHaveBeenCalledWith('health_check_error', expect.any(Object));
    });
  });

  describe('close', () => {
    it('devrait fermer la connexion à la base de données', async () => {
      // Arrange
      (mockPool.end as jest.Mock).mockResolvedValueOnce(undefined);

      // Act
      await db.close();

      // Assert
      expect(mockPool.end).toHaveBeenCalled();
      expect(logService.info).toHaveBeenCalledWith('database_pool_closed');
    });

    it('devrait gérer les erreurs lors de la fermeture', async () => {
      // Arrange
      const error = new Error('Close error');
      (mockPool.end as jest.Mock).mockRejectedValueOnce(error);

      // Act & Assert
      await expect(db.close())
        .rejects
        .toThrow(error);

      expect(logService.error).toHaveBeenCalledWith('database_pool_close_error', expect.any(Object));
    });
  });

  describe('queryWithPagination', () => {
    it('devrait exécuter une requête avec pagination', async () => {
      // Arrange
      const mockDataResult: QueryResult = {
        rows: [{ id: 1 }, { id: 2 }],
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: []
      };

      const mockCountResult: QueryResult = {
        rows: [{ count: '10' }],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: []
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce(mockDataResult)
        .mockResolvedValueOnce(mockCountResult);

      // Act
      const result = await db.queryWithPagination(
        'SELECT * FROM test',
        [],
        1,
        2
      );

      // Assert
      expect(result.rows).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.total).toBe(10);
      expect(result.pages).toBe(5);
    });
  });
});
