const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const config = require('./config/config');

// Initialisation de l'application Express
const app = express();

// Middlewares de sécurité
app.use(helmet());
app.use(cors({
    origin: config.CORS_ORIGINS,
    credentials: true
}));

// Middleware pour parser le corps des requêtes
app.use(express.json({ limit: config.TAILLE_MAX_FICHIER }));
app.use(express.urlencoded({ extended: true, limit: config.TAILLE_MAX_FICHIER }));

// Middleware pour la gestion des langues
app.use((req, res, next) => {
    const langue = req.headers['accept-language'];
    req.langue = config.LANGUES_SUPPORTEES.includes(langue) ? langue : config.LANGUE_PAR_DEFAUT;
    next();
});

// Import des routes
const authRoutes = require('./routes/auth');
const utilisateursRoutes = require('./routes/utilisateurs');
const resumesRoutes = require('./routes/resumes');
const mdpRoutes = require('./routes/motsDePasse');
const notesRoutes = require('./routes/notes');
const adminRoutes = require('./routes/admin');

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/utilisateurs', utilisateursRoutes);
app.use('/api/resumes', resumesRoutes);
app.use('/api/mots-de-passe', mdpRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/admin', adminRoutes);

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Messages d'erreur localisés
    const messages = {
        fr: {
            erreurServeur: 'Erreur interne du serveur',
            erreurValidation: 'Erreur de validation des données',
            erreurAuthentification: 'Erreur d\'authentification',
            erreurAutorisation: 'Accès non autorisé'
        },
        en: {
            erreurServeur: 'Internal Server Error',
            erreurValidation: 'Data Validation Error',
            erreurAuthentification: 'Authentication Error',
            erreurAutorisation: 'Unauthorized Access'
        }
    };

    const langue = req.langue || 'fr';
    
    // Gestion des différents types d'erreurs
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            erreur: {
                message: messages[langue].erreurValidation,
                details: err.message,
                status: 400
            }
        });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            erreur: {
                message: messages[langue].erreurAuthentification,
                status: 401
            }
        });
    }

    if (err.name === 'ForbiddenError') {
        return res.status(403).json({
            erreur: {
                message: messages[langue].erreurAutorisation,
                status: 403
            }
        });
    }

    // Erreur par défaut
    res.status(err.status || 500).json({
        erreur: {
            message: err.message || messages[langue].erreurServeur,
            status: err.status || 500
        }
    });
});

// Démarrage du serveur
const PORT = config.PORT;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
    console.log(`Environnement: ${config.NODE_ENV}`);
    console.log(`Langue par défaut: ${config.LANGUE_PAR_DEFAUT}`);
});
