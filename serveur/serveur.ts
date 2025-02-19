import express from 'express';
import type { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import { join } from 'path';
import config from './config/config';
import { logService } from './services/common';
import db from './utils/db';
import {
  errorHandler,
  notFoundHandler,
  jsonSyntaxErrorHandler,
} from './middleware/errorHandler';
import {
  rateLimiter,
  corsOptions,
  helmetConfig,
  sanitizeInput,
  checkContentType,
} from './middleware/security';

// Import des routes
import authRoutes from './routes/auth';
import resumesRoutes from './routes/resumes';
import motsDePasseRoutes from './routes/motsDePasse';
import notesRoutes from './routes/notes';
import adminRoutes from './routes/admin';

// Création de l'application Express
const app: Express = express();

// Configuration des middlewares de base
app.use(helmet(helmetConfig));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Configuration de l'upload de fichiers
const fileUploadMiddleware = fileUpload({
  limits: { fileSize: config.MAX_FILE_SIZE },
  abortOnLimit: true,
  createParentPath: true,
  useTempFiles: true,
  tempFileDir: join(__dirname, '../tmp'),
  debug: config.NODE_ENV === 'development'
});

app.use(fileUploadMiddleware as express.RequestHandler);
app.use(sanitizeInput as express.RequestHandler);
app.use(checkContentType as express.RequestHandler);

// Dossier pour les fichiers statiques
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// Préfixe API
const API_PREFIX = '/api';

// Enregistrement des routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/resumes`, resumesRoutes);
app.use(`${API_PREFIX}/mots-de-passe`, motsDePasseRoutes);
app.use(`${API_PREFIX}/notes`, notesRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);

// Route de santé
app.get('/health', async (_req: Request, res: Response) => {
  const dbHealth = await db.healthCheck();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbHealth ? 'connected' : 'disconnected',
    environment: config.NODE_ENV,
  });
});

// Middleware pour les routes non trouvées
app.use(notFoundHandler as express.RequestHandler);

// Middleware de gestion des erreurs
app.use(jsonSyntaxErrorHandler as express.ErrorRequestHandler);
app.use(errorHandler as express.ErrorRequestHandler);

// Nettoyage périodique des sessions expirées
import { sessionService } from './services/session';
setInterval(async () => {
  try {
    await sessionService.cleanExpired();
  } catch (error) {
    logService.error('session_cleanup_error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}, 60 * 60 * 1000); // Toutes les heures

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason: Error | any) => {
  logService.error('unhandled_rejection', {
    reason: reason instanceof Error ? reason.stack : reason,
  });
});

process.on('uncaughtException', (error: Error) => {
  logService.error('uncaught_exception', {
    error: error.stack,
  });
  // En production, on redémarre le processus
  if (config.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Démarrage du serveur
const PORT = config.PORT;
const server = app.listen(PORT, () => {
  logService.info('server_started', {
    port: PORT,
    environment: config.NODE_ENV,
  });
});

// Gestion gracieuse de l'arrêt
const gracefulShutdown = async () => {
  try {
    // Fermeture du serveur HTTP
    server.close(() => {
      logService.info('server_closed');
    });

    // Fermeture de la connexion à la base de données
    await db.close();
    logService.info('database_connection_closed');

    // En production, on laisse le temps aux requêtes en cours de se terminer
    if (config.NODE_ENV === 'production') {
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    } else {
      process.exit(0);
    }
  } catch (error) {
    logService.error('shutdown_error', {
      error: error instanceof Error ? error.stack : error,
    });
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Création des répertoires nécessaires
import { mkdirSync } from 'fs';
[
  join(__dirname, '../uploads'),
  join(__dirname, '../tmp'),
  join(__dirname, '../logs')
].forEach(dir => {
  try {
    mkdirSync(dir, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
});

export default server;
