const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../.env') });

// Configuration de la connexion à la base de données
const config = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: 'postgres' // Se connecter à la base par défaut pour créer notre base
};

async function initializeDatabase() {
  const dbName = process.env.DB_NAME || 'app_resume';
  const pool = new Pool(config);

  try {
    console.log('🔄 Initialisation de la base de données...');

    // Vérifier si la base de données existe déjà
    const dbExists = await pool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    // Créer la base de données si elle n'existe pas
    if (dbExists.rows.length === 0) {
      console.log(`📦 Création de la base de données ${dbName}...`);
      await pool.query(`CREATE DATABASE ${dbName}`);
      console.log('✅ Base de données créée avec succès');
    } else {
      console.log('ℹ️ La base de données existe déjà');
    }

    // Fermer la connexion à la base postgres
    await pool.end();

    // Se connecter à notre base de données
    const appPool = new Pool({
      ...config,
      database: dbName
    });

    // Lire et exécuter le script SQL
    console.log('📜 Exécution du script SQL...');
    const sqlScript = fs.readFileSync(
      path.join(__dirname, '../serveur/base-de-donnees/init.sql'),
      'utf8'
    );

    // Diviser le script en requêtes individuelles
    const queries = sqlScript
      .split(';')
      .filter(query => query.trim().length > 0);

    // Exécuter chaque requête
    for (const query of queries) {
      try {
        await appPool.query(query);
      } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la requête:', error.message);
        console.error('Requête problématique:', query);
        throw error;
      }
    }

    console.log('✅ Script SQL exécuté avec succès');
    await appPool.end();

  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
    process.exit(1);
  }
}

// Exécuter le script
console.log('🚀 Démarrage de l\'initialisation de la base de données...');
initializeDatabase()
  .then(() => {
    console.log('✨ Initialisation terminée avec succès');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Erreur fatale:', error);
    process.exit(1);
  });
