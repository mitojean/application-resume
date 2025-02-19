import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import config from '../config/config';
import { logService } from '../services/common';
import { AppError } from '../types';

// Configuration du pool de connexions
const pool = new Pool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  max: 20, // Nombre maximum de clients dans le pool
  idleTimeoutMillis: 30000, // Temps maximum d'inactivité d'un client
  connectionTimeoutMillis: 2000, // Temps maximum pour établir une connexion
});

// Écouteurs d'événements du pool
pool.on('connect', () => {
  logService.info('database_connection_created');
});

pool.on('error', (err) => {
  logService.error('database_pool_error', {
    error: err.message,
    stack: err.stack
  });
});

pool.on('remove', () => {
  logService.info('database_connection_removed');
});

/**
 * Utilitaire de base de données
 */
const db = {
  /**
   * Exécuter une requête
   */
  async query<T extends QueryResultRow>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await pool.query<T>(text, params);
      const duration = Date.now() - start;

      // Log la requête si elle prend plus de 100ms
      if (duration > 100) {
        logService.warn('slow_query', {
          query: text,
          duration,
          rows: result.rowCount
        });
      }

      return result;
    } catch (error) {
      logService.error('query_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: text,
        params
      });
      throw new AppError('Erreur de base de données', 500);
    }
  },

  /**
   * Exécuter une transaction
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logService.error('transaction_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Vérifier la santé de la base de données
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await pool.query('SELECT 1');
      return result.rows.length === 1;
    } catch (error) {
      logService.error('health_check_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  },

  /**
   * Fermer toutes les connexions
   */
  async close(): Promise<void> {
    try {
      await pool.end();
      logService.info('database_pool_closed');
    } catch (error) {
      logService.error('database_pool_close_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  },

  /**
   * Exécuter une requête avec pagination
   */
  async queryWithPagination<T extends QueryResultRow>(
    text: string,
    params: any[] = [],
    page: number = 1,
    limit: number = 10
  ): Promise<{ rows: T[]; total: number; pages: number }> {
    const offset = (page - 1) * limit;
    const countQuery = `SELECT COUNT(*) FROM (${text}) AS count`;
    
    try {
      const [dataResult, countResult] = await Promise.all([
        pool.query<T>(`${text} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, 
          [...params, limit, offset]
        ),
        pool.query<{ count: string }>(countQuery, params)
      ]);

      const total = parseInt(countResult.rows[0].count);
      const pages = Math.ceil(total / limit);

      return {
        rows: dataResult.rows,
        total,
        pages
      };
    } catch (error) {
      logService.error('pagination_query_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        query: text,
        params
      });
      throw new AppError('Erreur de base de données', 500);
    }
  },

  /**
   * Exécuter une requête de recherche
   */
  async search<T extends QueryResultRow>(
    table: string,
    searchFields: string[],
    searchTerm: string,
    params: any[] = [],
    page: number = 1,
    limit: number = 10
  ): Promise<{ rows: T[]; total: number; pages: number }> {
    const searchConditions = searchFields
      .map((field, index) => `${field} ILIKE $${params.length + index + 1}`)
      .join(' OR ');

    const searchParams = searchFields.map(() => `%${searchTerm}%`);
    const query = `
      SELECT * FROM ${table}
      WHERE ${searchConditions}
      ORDER BY cree_le DESC
    `;

    return this.queryWithPagination<T>(
      query,
      [...params, ...searchParams],
      page,
      limit
    );
  }
};

export default db;
