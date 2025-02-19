const { Pool } = require('pg');
const config = require('../config/config');

const pool = new Pool({
    user: config.DB_CONFIG.utilisateur,
    password: config.DB_CONFIG.motDePasse,
    host: config.DB_CONFIG.hote,
    port: config.DB_CONFIG.port,
    database: config.DB_CONFIG.baseDeDonnees
});

// Tester la connexion à la base de données
pool.connect((err, client, release) => {
    if (err) {
        console.error('Erreur de connexion à la base de données:', err.stack);
        return;
    }
    console.log('Connexion réussie à la base de données PostgreSQL');
    release();
});

// Fonction utilitaire pour logger les requêtes en mode développement
const logQuery = (text, params) => {
    if (config.NODE_ENV === 'development') {
        console.log('Exécution de la requête:', {
            text,
            params
        });
    }
};

module.exports = {
    // Exécuter une requête simple
    query: async (text, params) => {
        logQuery(text, params);
        try {
            const result = await pool.query(text, params);
            return result;
        } catch (err) {
            console.error('Erreur lors de l\'exécution de la requête:', err);
            throw err;
        }
    },

    // Obtenir un client pour les transactions
    getClient: async () => {
        const client = await pool.connect();
        const query = client.query;
        const release = client.release;

        // Définir un timeout pour la libération automatique
        const timeout = setTimeout(() => {
            console.error('Un client a été gardé trop longtemps');
            console.error(`La requête qui a causé le problème était:`, client.lastQuery);
            client.release();
        }, 30000); // 30 secondes timeout

        // Surcharge de la méthode query pour le logging
        client.query = (...args) => {
            client.lastQuery = args;
            logQuery(...args);
            return query.apply(client, args);
        };

        // Surcharge de la méthode release pour nettoyer le timeout
        client.release = () => {
            clearTimeout(timeout);
            client.query = query;
            client.release = release;
            return release.apply(client);
        };

        return client;
    },

    // Exécuter une transaction
    transaction: async (callback) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    },

    pool
};
