import winston from 'winston';
import nodemailer from 'nodemailer';
import { join } from 'path';
import config from '../config/config';
import { AppError } from '../types';

// Configuration du logger
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Écriture dans les fichiers
    new winston.transports.File({
      filename: join(config.LOG_FILE),
      level: 'error'
    }),
    new winston.transports.File({
      filename: join(config.LOG_FILE.replace('.log', '-combined.log'))
    })
  ]
});

// Ajout de la sortie console en développement
if (config.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Service de journalisation
 */
export const logService = {
  info: (event: string, data?: Record<string, any>) => {
    logger.info({ event, ...data });
  },

  warn: (event: string, data?: Record<string, any>) => {
    logger.warn({ event, ...data });
  },

  error: (event: string, data?: Record<string, any>) => {
    logger.error({ event, ...data });
  },

  debug: (event: string, data?: Record<string, any>) => {
    logger.debug({ event, ...data });
  }
};

// Configuration du transporteur d'emails
const emailTransporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_PORT === 465,
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASS
  }
});

/**
 * Service d'envoi d'emails
 */
export const emailService = {
  /**
   * Envoyer un email
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string
  ): Promise<void> {
    try {
      await emailTransporter.sendMail({
        from: config.EMAIL_FROM,
        to,
        subject,
        html
      });

      logService.info('email_sent', { to, subject });
    } catch (error) {
      logService.error('email_send_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to,
        subject
      });
      throw new AppError('Erreur lors de l\'envoi de l\'email', 500);
    }
  },

  /**
   * Générer un template d'email
   */
  generateTemplate(
    template: 'verification' | 'reset-password' | 'welcome',
    data: Record<string, any>
  ): string {
    const templates = {
      verification: `
        <h1>Vérification de votre compte</h1>
        <p>Cliquez sur le lien suivant pour vérifier votre compte :</p>
        <a href="${data.url}">${data.url}</a>
      `,
      'reset-password': `
        <h1>Réinitialisation de votre mot de passe</h1>
        <p>Cliquez sur le lien suivant pour réinitialiser votre mot de passe :</p>
        <a href="${data.url}">${data.url}</a>
      `,
      welcome: `
        <h1>Bienvenue sur Application Resume</h1>
        <p>Votre compte a été créé avec succès.</p>
        <p>Vous pouvez maintenant vous connecter et commencer à utiliser l'application.</p>
      `
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            h1 {
              color: #007bff;
            }
            a {
              color: #007bff;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
          </style>
        </head>
        <body>
          ${templates[template]}
          <hr>
          <p>
            Si vous n'êtes pas à l'origine de cette demande, 
            veuillez ignorer cet email.
          </p>
          <p>
            Cordialement,<br>
            L'équipe Application Resume
          </p>
        </body>
      </html>
    `;
  }
};

/**
 * Service de performance
 */
export const performanceService = {
  /**
   * Mesurer le temps d'exécution d'une fonction
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = process.hrtime();
    try {
      const result = await fn();
      const [seconds, nanoseconds] = process.hrtime(start);
      const duration = seconds * 1000 + nanoseconds / 1e6;

      logService.info('performance_measure', {
        name,
        duration: `${duration.toFixed(2)}ms`
      });

      return result;
    } catch (error) {
      const [seconds, nanoseconds] = process.hrtime(start);
      const duration = seconds * 1000 + nanoseconds / 1e6;

      logService.error('performance_measure_error', {
        name,
        duration: `${duration.toFixed(2)}ms`,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }
};

export default {
  logService,
  emailService,
  performanceService
};
