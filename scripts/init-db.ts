import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import config from '../serveur/config/config';
import { logService } from '../serveur/services/common';

// Configuration de la base de données
const pool = new Pool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD
});

/**
 * Initialise la base de données
 */
async function initializeDatabase() {
  const client = await pool.connect();

  try {
    // Lecture du fichier SQL
    const sqlPath = path.join(__dirname, '../serveur/base-de-donnees/init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Exécution des commandes SQL
    await client.query('BEGIN');
    await client.query(sql);

    // Création de l'administrateur par défaut si nécessaire
    const adminEmail = 'admin@app-resume.com';
    const adminResult = await client.query(
      'SELECT * FROM utilisateurs WHERE email = $1',
      [adminEmail]
    );

    if (adminResult.rows.length === 0) {
      const salt = await bcrypt.genSalt(config.BCRYPT_ROUNDS);
      const motDePasseHash = await bcrypt.hash('Admin123!@#', salt);
      const codePinHash = await bcrypt.hash('123456', salt);

      await client.query(
        `INSERT INTO utilisateurs 
        (email, identifiant, mot_de_passe_hash, code_pin_hash, est_verifie, role)
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [adminEmail, 'admin', motDePasseHash, codePinHash, true, 'admin']
      );

      logService.info('admin_created', { email: adminEmail });
    }

    await client.query('COMMIT');
    logService.info('database_initialized');

  } catch (error) {
    await client.query('ROLLBACK');
    logService.error('database_initialization_error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Vérifie la connexion à la base de données
 */
async function checkDatabaseConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    return true;
  } catch (error) {
    logService.error('database_connection_error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return false;
  }
}

/**
 * Crée les répertoires nécessaires
 */
function createRequiredDirectories() {
  const directories = [
    path.join(__dirname, '../uploads'),
    path.join(__dirname, '../logs')
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logService.info('directory_created', { path: dir });
    }
  });
}

/**
 * Fonction principale
 */
async function main() {
  try {
    // Création des répertoires
    createRequiredDirectories();

    // Vérification de la connexion à la base de données
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      throw new Error('Impossible de se connecter à la base de données');
    }

    // Initialisation de la base de données
    await initializeDatabase();

    console.log('✅ Initialisation terminée avec succès');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
}

// Exécution du script
if (require.main === module) {
  main();
}

export {
  initializeDatabase,
  checkDatabaseConnection,
  createRequiredDirectories
};
