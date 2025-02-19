const jwt = require('jsonwebtoken');
const config = require('../config/config');
const db = require('../utils/db');
const DeviceDetector = require('device-detector-js');
const geoip = require('geoip-lite');

const deviceDetector = new DeviceDetector();

// Middleware pour vérifier le token JWT
const verifierToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                message: req.langue === 'fr' ? 
                    'Token non fourni' : 
                    'No token provided' 
            });
        }

        const decoded = jwt.verify(token, config.JWT_SECRET);
        req.utilisateur = decoded;

        // Vérifier si la session est toujours valide
        const session = await db.query(
            'SELECT * FROM sessions WHERE utilisateur_id = $1 AND token = $2 AND expire_le > NOW()',
            [decoded.id, token]
        );

        if (session.rows.length === 0) {
            return res.status(401).json({ 
                message: req.langue === 'fr' ? 
                    'Session expirée' : 
                    'Session expired' 
            });
        }

        next();
    } catch (error) {
        return res.status(401).json({ 
            message: req.langue === 'fr' ? 
                'Token invalide' : 
                'Invalid token' 
        });
    }
};

// Middleware pour vérifier les droits administrateur
const verifierAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                message: req.langue === 'fr' ? 
                    'Token non fourni' : 
                    'No token provided' 
            });
        }

        const decoded = jwt.verify(token, config.JWT_SECRET);
        
        // Vérifier si l'utilisateur est un administrateur
        const admin = await db.query(
            'SELECT * FROM administrateurs WHERE id = $1',
            [decoded.id]
        );

        if (admin.rows.length === 0) {
            return res.status(403).json({ 
                message: req.langue === 'fr' ? 
                    'Accès refusé' : 
                    'Access denied' 
            });
        }

        req.admin = admin.rows[0];
        next();
    } catch (error) {
        return res.status(401).json({ 
            message: req.langue === 'fr' ? 
                'Token invalide' : 
                'Invalid token' 
        });
    }
};

// Middleware pour vérifier le code PIN pour l'accès aux mots de passe
const verifierPin = async (req, res, next) => {
    try {
        const { pin } = req.body;
        const utilisateurId = req.utilisateur.id;

        if (!pin) {
            return res.status(400).json({ 
                message: req.langue === 'fr' ? 
                    'Code PIN requis' : 
                    'PIN required' 
            });
        }

        const utilisateur = await db.query(
            'SELECT code_pin_hash FROM utilisateurs WHERE id = $1',
            [utilisateurId]
        );

        const isValidPin = await bcrypt.compare(pin, utilisateur.rows[0].code_pin_hash);

        if (!isValidPin) {
            return res.status(401).json({ 
                message: req.langue === 'fr' ? 
                    'Code PIN invalide' : 
                    'Invalid PIN' 
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({ 
            message: req.langue === 'fr' ? 
                'Erreur lors de la vérification du PIN' : 
                'Error verifying PIN' 
        });
    }
};

// Middleware pour collecter les informations sur l'appareil et la localisation
const collecterInfoUtilisateur = async (req, res, next) => {
    try {
        const userAgent = req.headers['user-agent'];
        const ip = req.ip || req.connection.remoteAddress;
        
        // Détecter les informations sur l'appareil
        const appareil = deviceDetector.parse(userAgent);
        
        // Obtenir les informations de localisation
        const geo = geoip.lookup(ip);
        
        req.infoUtilisateur = {
            appareil: {
                type: appareil.device?.type || 'inconnu',
                marque: appareil.device?.brand || 'inconnue',
                modele: appareil.device?.model || 'inconnu',
                os: {
                    nom: appareil.os?.name || 'inconnu',
                    version: appareil.os?.version || 'inconnue'
                }
            },
            localisation: {
                pays: geo?.country || 'inconnu',
                region: geo?.region || 'inconnue',
                ville: geo?.city || 'inconnue'
            },
            ip: ip
        };
        
        next();
    } catch (error) {
        console.error('Erreur lors de la collecte des informations utilisateur:', error);
        // Continuer même en cas d'erreur
        next();
    }
};

module.exports = {
    verifierToken,
    verifierAdmin,
    verifierPin,
    collecterInfoUtilisateur
};
