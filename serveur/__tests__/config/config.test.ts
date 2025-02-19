/// <reference path="../types/jest.d.ts" />

import config from '../../config/config';

// Mock process.env
const originalEnv = process.env;

describe('Configuration', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      PORT: '3000',
      CLIENT_URL: 'http://localhost:3000',
      API_URL: 'http://localhost:3001',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_NAME: 'test_db',
      DB_USER: 'test_user',
      DB_PASSWORD: 'test_password',
      JWT_SECRET: 'test_secret',
      SMTP_HOST: 'smtp.test.com',
      SMTP_PORT: '587',
      SMTP_USER: 'test@test.com',
      SMTP_PASS: 'smtp_password',
      EMAIL_FROM: 'noreply@test.com',
      API_KEY: 'test_api_key',
      OPENAI_API_KEY: 'test_openai_key',
      CORS_ORIGINS: 'http://localhost:3000,http://localhost:3001',
      RATE_LIMIT_WINDOW: '900000',
      RATE_LIMIT_MAX: '100',
      MAX_FILE_SIZE: '5242880'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Variables d\'environnement', () => {
    it('devrait charger les variables d\'environnement correctement', () => {
      expect(config.NODE_ENV).toBe('test');
      expect(config.PORT).toBe(3000);
      expect(config.CLIENT_URL).toBe('http://localhost:3000');
      expect(config.API_URL).toBe('http://localhost:3001');
      expect(config.DB_HOST).toBe('localhost');
      expect(config.DB_PORT).toBe(5432);
      expect(config.DB_NAME).toBe('test_db');
      expect(config.DB_USER).toBe('test_user');
      expect(config.DB_PASSWORD).toBe('test_password');
      expect(config.JWT_SECRET).toBe('test_secret');
      expect(config.API_KEY).toBe('test_api_key');
    });

    it('devrait avoir les configurations SMTP correctes', () => {
      expect(config.SMTP_HOST).toBe('smtp.test.com');
      expect(config.SMTP_PORT).toBe(587);
      expect(config.SMTP_USER).toBe('test@test.com');
      expect(config.SMTP_PASS).toBe('smtp_password');
      expect(config.EMAIL_FROM).toBe('noreply@test.com');
    });

    it('devrait avoir les configurations OpenAI correctes', () => {
      expect(config.OPENAI_API_KEY).toBe('test_openai_key');
      expect(config.MODELE_GPT).toBe('gpt-4');
      expect(config.LONGUEUR_MAX_RESUME).toBe(500);
    });

    it('devrait avoir les configurations CORS correctes', () => {
      expect(config.CORS_ORIGINS).toEqual(['http://localhost:3000', 'http://localhost:3001']);
    });

    it('devrait avoir les configurations de rate limiting correctes', () => {
      expect(config.RATE_LIMIT_WINDOW).toBe(900000);
      expect(config.RATE_LIMIT_MAX).toBe(100);
    });

    it('devrait avoir les configurations de fichiers correctes', () => {
      expect(config.MAX_FILE_SIZE).toBe(5242880);
    });
  });

  describe('Valeurs par défaut', () => {
    beforeEach(() => {
      // Supprimer certaines variables d'environnement pour tester les valeurs par défaut
      delete process.env.NODE_ENV;
      delete process.env.PORT;
      delete process.env.RATE_LIMIT_WINDOW;
      delete process.env.RATE_LIMIT_MAX;
      delete process.env.MAX_FILE_SIZE;
    });

    it('devrait utiliser les valeurs par défaut quand les variables d\'environnement sont manquantes', () => {
      const defaultConfig = jest.requireActual('../../config/config').default;
      
      expect(defaultConfig.NODE_ENV).toBe('development');
      expect(defaultConfig.PORT).toBe(3000);
      expect(defaultConfig.RATE_LIMIT_WINDOW).toBe(15 * 60 * 1000); // 15 minutes
      expect(defaultConfig.RATE_LIMIT_MAX).toBe(100);
      expect(defaultConfig.MAX_FILE_SIZE).toBe(10485760); // 10MB
    });
  });

  describe('Configurations de sécurité', () => {
    it('devrait avoir les configurations CSP correctes', () => {
      expect(config.CSP_DIRECTIVES).toEqual({
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      });
    });

    it('devrait avoir les configurations bcrypt correctes', () => {
      expect(config.BCRYPT_ROUNDS).toBe(10);
    });
  });

  describe('Configurations de logs', () => {
    it('devrait avoir les configurations de logs correctes', () => {
      expect(config.LOG_LEVEL).toBe('info');
      expect(config.LOG_FILE).toContain('/logs/app.log');
    });
  });

  describe('Messages système', () => {
    it('devrait avoir les messages système en français', () => {
      expect(config.MESSAGES.fr).toBeDefined();
      expect(config.MESSAGES.fr.erreurServeur).toBe('Erreur interne du serveur');
      expect(config.MESSAGES.fr.erreurValidation).toBe('Erreur de validation des données');
      expect(config.MESSAGES.fr.erreurAuthentification).toBe('Erreur d\'authentification');
      expect(config.MESSAGES.fr.erreurAutorisation).toBe('Accès non autorisé');
      expect(config.MESSAGES.fr.erreurNonTrouve).toBe('Ressource non trouvée');
    });

    it('devrait avoir les messages système en anglais', () => {
      expect(config.MESSAGES.en).toBeDefined();
      expect(config.MESSAGES.en.erreurServeur).toBe('Internal server error');
      expect(config.MESSAGES.en.erreurValidation).toBe('Data validation error');
      expect(config.MESSAGES.en.erreurAuthentification).toBe('Authentication error');
      expect(config.MESSAGES.en.erreurAutorisation).toBe('Unauthorized access');
      expect(config.MESSAGES.en.erreurNonTrouve).toBe('Resource not found');
    });
  });
});
