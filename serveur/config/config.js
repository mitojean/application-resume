require('dotenv').config();

module.exports = {
    // Configuration du serveur
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',

    // Configuration de la base de données
    DB_CONFIG: {
        utilisateur: process.env.DB_USER || 'postgres',
        motDePasse: process.env.DB_PASSWORD,
        hote: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        baseDeDonnees: process.env.DB_NAME || 'application_resume'
    },

    // Configuration JWT
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRE: '24h',

    // Configuration email (pour les notifications et vérifications)
    EMAIL_CONFIG: {
        hote: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: true,
        auth: {
            utilisateur: process.env.EMAIL_USER,
            motDePasse: process.env.EMAIL_PASSWORD
        }
    },

    // Configuration OpenAI
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,

    // Configuration de sécurité
    BCRYPT_SALT_ROUNDS: 12,
    PIN_SALT_ROUNDS: 10,
    
    // Configuration des sessions
    DUREE_SESSION: '24h',
    
    // Expiration du jeton de réinitialisation du mot de passe
    EXPIRATION_REINITIALISATION_MDP: '1h',
    
    // Expiration du jeton de vérification email
    EXPIRATION_VERIFICATION_EMAIL: '24h',

    // Origines autorisées pour CORS
    CORS_ORIGINS: process.env.CORS_ORIGINS ? 
        process.env.CORS_ORIGINS.split(',') : 
        ['http://localhost:3000'],

    // Configuration des langues
    LANGUES_SUPPORTEES: ['fr', 'en'],
    LANGUE_PAR_DEFAUT: 'fr',

    // Configuration des limites de requêtes
    LIMITES_API: {
        WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        MAX_REQUESTS: 100 // nombre maximum de requêtes par fenêtre
    },

    // Configuration de la taille maximale des fichiers
    TAILLE_MAX_FICHIER: '10mb',

    // Configuration du résumé
    LONGUEUR_MAX_RESUME: 1000, // caractères
    MODELE_GPT: 'gpt-4o-mini'
};
