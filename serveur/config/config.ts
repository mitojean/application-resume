import dotenv from 'dotenv';
import path from 'path';
import { SignOptions } from 'jsonwebtoken';

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  // Serveur
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // URLs
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
  API_URL: process.env.API_URL || 'http://localhost:3001',

  
  // Base de données
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: process.env.DB_NAME || 'test_db',
  DB_USER: process.env.DB_USER || 'test_user',
  DB_PASSWORD: process.env.DB_PASSWORD || 'test_password',

  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'votre_secret_jwt',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '24h',
  JWT_OPTIONS: {
    expiresIn: process.env.JWT_EXPIRE || '24h',
    algorithm: 'HS256',
  } as SignOptions,
  
  // OpenAI
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  MODELE_GPT: process.env.MODELE_GPT || 'gpt-4',
  LONGUEUR_MAX_RESUME: parseInt(process.env.LONGUEUR_MAX_RESUME || '500', 10),
  
  // Email
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@app-resume.com',
  
  // Sécurité
  API_KEY: process.env.API_KEY || 'votre_cle_api_secrete',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  CORS_ORIGINS: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3001'],
  CSP_DIRECTIVES: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"]
  },
  
  // Upload
  UPLOAD_DIR: path.join(__dirname, '../../uploads'),
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  ALLOWED_FILE_TYPES: ['application/pdf', 'text/plain'] as const,
  
  // Cache
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 heure
  
  // Logs
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: path.join(__dirname, '../../logs/app.log'),
  
  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || 'votre_secret_session',
  SESSION_DURATION: process.env.SESSION_DURATION || '24h',
  
  // Langue
  DEFAULT_LANGUAGE: 'fr' as const,
  SUPPORTED_LANGUAGES: ['fr', 'en'] as const,
  
  // Validation
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 100,
  PIN_LENGTH: 6,
  
  // Messages d'erreur
  MESSAGES: {
    fr: {
      erreurServeur: 'Erreur interne du serveur',
      erreurValidation: 'Erreur de validation des données',
      erreurAuthentification: 'Erreur d\'authentification',
      erreurAutorisation: 'Accès non autorisé',
      erreurNonTrouve: 'Ressource non trouvée',
      emailInvalide: 'Adresse email invalide',
      motDePasseInvalide: 'Mot de passe invalide',
      emailDejaUtilise: 'Cette adresse email est déjà utilisée',
      emailNonVerifie: 'Veuillez vérifier votre adresse email',
      tokenInvalide: 'Token invalide',
      tokenExpire: 'Token expiré',
      pinIncorrect: 'Code PIN incorrect'
    },
    en: {
      erreurServeur: 'Internal server error',
      erreurValidation: 'Data validation error',
      erreurAuthentification: 'Authentication error',
      erreurAutorisation: 'Unauthorized access',
      erreurNonTrouve: 'Resource not found',
      emailInvalide: 'Invalid email address',
      motDePasseInvalide: 'Invalid password',
      emailDejaUtilise: 'This email address is already in use',
      emailNonVerifie: 'Please verify your email address',
      tokenInvalide: 'Invalid token',
      tokenExpire: 'Token expired',
      pinIncorrect: 'Incorrect PIN code'
    }
  }
} as const;

export type SupportedLanguage = typeof config.SUPPORTED_LANGUAGES[number];
export type ErrorMessages = typeof config.MESSAGES;

export default config;
