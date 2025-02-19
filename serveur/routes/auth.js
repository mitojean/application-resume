const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../utils/db');
const config = require('../config/config');
const { collecterInfoUtilisateur } = require('../middleware/auth');
const nodemailer = require('nodemailer');

// Configuration du transporteur email
const transporteur = nodemailer.createTransport(config.EMAIL_CONFIG);

// Validation des données d'inscription
const validationInscription = [
    body('email').isEmail().withMessage({
        fr: 'Email invalide',
        en: 'Invalid email'
    }),
    body('identifiant').isLength({ min: 3 }).withMessage({
        fr: 'L\'identifiant doit contenir au moins 3 caractères',
        en: 'Username must be at least 3 characters long'
    }),
    body('motDePasse').isLength({ min: 8 }).withMessage({
        fr: 'Le mot de passe doit contenir au moins 8 caractères',
        en: 'Password must be at least 8 characters long'
    }),
    body('codePin').isLength({ min: 4, max: 4 }).isNumeric().withMessage({
        fr: 'Le code PIN doit contenir exactement 4 chiffres',
        en: 'PIN must be exactly 4 digits'
    })
];

// Inscription
router.post('/inscription', validationInscription, collecterInfoUtilisateur, async (req, res) => {
    const erreurs = validationResult(req);
    if (!erreurs.isEmpty()) {
        return res.status(400).json({ 
            erreurs: erreurs.array().map(err => err.msg[req.langue]) 
        });
    }

    const { email, identifiant, motDePasse, codePin } = req.body;
    const { appareil, localisation } = req.infoUtilisateur;

    try {
        // Vérifier si l'email ou l'identifiant existe déjà
        const utilisateurExistant = await db.query(
            'SELECT * FROM utilisateurs WHERE email = $1 OR identifiant = $2',
            [email, identifiant]
        );

        if (utilisateurExistant.rows.length > 0) {
            return res.status(400).json({
                message: req.langue === 'fr' ?
                    'Email ou identifiant déjà utilisé' :
                    'Email or username already in use'
            });
        }

        // Hasher le mot de passe et le code PIN
        const motDePasseHash = await bcrypt.hash(motDePasse, config.BCRYPT_SALT_ROUNDS);
        const codePinHash = await bcrypt.hash(codePin, config.PIN_SALT_ROUNDS);

        // Créer l'utilisateur
        const nouvelUtilisateur = await db.query(
            `INSERT INTO utilisateurs 
            (email, identifiant, mot_de_passe_hash, code_pin_hash, pays, ville, region, info_appareil, info_os) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING id, email, identifiant`,
            [
                email,
                identifiant,
                motDePasseHash,
                codePinHash,
                localisation.pays,
                localisation.ville,
                localisation.region,
                JSON.stringify(appareil),
                appareil.os.nom + ' ' + appareil.os.version
            ]
        );

        // Générer le jeton de vérification
        const jetonVerification = jwt.sign(
            { id: nouvelUtilisateur.rows[0].id },
            config.JWT_SECRET,
            { expiresIn: config.EXPIRATION_VERIFICATION_EMAIL }
        );

        // Sauvegarder le jeton de vérification
        await db.query(
            `INSERT INTO jetons_verification_email (utilisateur_id, jeton, expire_le)
            VALUES ($1, $2, NOW() + INTERVAL '24 hours')`,
            [nouvelUtilisateur.rows[0].id, jetonVerification]
        );

        // Envoyer l'email de vérification
        const lienVerification = `${req.protocol}://${req.get('host')}/api/auth/verifier-email/${jetonVerification}`;
        
        await transporteur.sendMail({
            from: config.EMAIL_CONFIG.auth.utilisateur,
            to: email,
            subject: req.langue === 'fr' ?
                'Vérification de votre compte' :
                'Verify your account',
            html: req.langue === 'fr' ?
                `<h1>Bienvenue sur notre application!</h1>
                <p>Cliquez sur ce lien pour vérifier votre compte: <a href="${lienVerification}">Vérifier mon compte</a></p>` :
                `<h1>Welcome to our application!</h1>
                <p>Click this link to verify your account: <a href="${lienVerification}">Verify my account</a></p>`
        });

        res.status(201).json({
            message: req.langue === 'fr' ?
                'Inscription réussie. Veuillez vérifier votre email.' :
                'Registration successful. Please check your email.',
            utilisateur: {
                id: nouvelUtilisateur.rows[0].id,
                email: nouvelUtilisateur.rows[0].email,
                identifiant: nouvelUtilisateur.rows[0].identifiant
            }
        });

    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de l\'inscription' :
                'Registration error'
        });
    }
});

// Validation des données de connexion
const validationConnexion = [
    body('email').isEmail().withMessage({
        fr: 'Email invalide',
        en: 'Invalid email'
    }),
    body('motDePasse').notEmpty().withMessage({
        fr: 'Mot de passe requis',
        en: 'Password required'
    })
];

// Connexion
router.post('/connexion', validationConnexion, collecterInfoUtilisateur, async (req, res) => {
    const erreurs = validationResult(req);
    if (!erreurs.isEmpty()) {
        return res.status(400).json({ 
            erreurs: erreurs.array().map(err => err.msg[req.langue]) 
        });
    }

    const { email, motDePasse } = req.body;
    const { appareil, localisation, ip } = req.infoUtilisateur;

    try {
        // Récupérer l'utilisateur
        const utilisateur = await db.query(
            'SELECT * FROM utilisateurs WHERE email = $1',
            [email]
        );

        if (utilisateur.rows.length === 0) {
            return res.status(401).json({
                message: req.langue === 'fr' ?
                    'Email ou mot de passe incorrect' :
                    'Incorrect email or password'
            });
        }

        // Vérifier le mot de passe
        const motDePasseValide = await bcrypt.compare(
            motDePasse, 
            utilisateur.rows[0].mot_de_passe_hash
        );

        if (!motDePasseValide) {
            return res.status(401).json({
                message: req.langue === 'fr' ?
                    'Email ou mot de passe incorrect' :
                    'Incorrect email or password'
            });
        }

        // Vérifier si l'email est vérifié
        if (!utilisateur.rows[0].est_verifie) {
            return res.status(403).json({
                message: req.langue === 'fr' ?
                    'Veuillez vérifier votre email avant de vous connecter' :
                    'Please verify your email before logging in'
            });
        }

        // Générer le token JWT
        const token = jwt.sign(
            { id: utilisateur.rows[0].id },
            config.JWT_SECRET,
            { expiresIn: config.JWT_EXPIRE }
        );

        // Créer une nouvelle session
        await db.query(
            `INSERT INTO sessions 
            (utilisateur_id, token, info_appareil, adresse_ip, expire_le)
            VALUES ($1, $2, $3, $4, NOW() + INTERVAL '24 hours')`,
            [
                utilisateur.rows[0].id,
                token,
                JSON.stringify(appareil),
                ip
            ]
        );

        // Mettre à jour la dernière connexion
        await db.query(
            'UPDATE utilisateurs SET derniere_connexion = NOW() WHERE id = $1',
            [utilisateur.rows[0].id]
        );

        res.json({
            message: req.langue === 'fr' ?
                'Connexion réussie' :
                'Login successful',
            token,
            utilisateur: {
                id: utilisateur.rows[0].id,
                email: utilisateur.rows[0].email,
                identifiant: utilisateur.rows[0].identifiant
            }
        });

    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la connexion' :
                'Login error'
        });
    }
});

// Vérification de l'email
router.get('/verifier-email/:token', async (req, res) => {
    try {
        const { token } = req.params;

        // Vérifier si le token existe et n'est pas expiré
        const verification = await db.query(
            `SELECT utilisateur_id FROM jetons_verification_email 
            WHERE jeton = $1 AND expire_le > NOW()`,
            [token]
        );

        if (verification.rows.length === 0) {
            return res.status(400).json({
                message: req.langue === 'fr' ?
                    'Lien de vérification invalide ou expiré' :
                    'Invalid or expired verification link'
            });
        }

        // Marquer l'utilisateur comme vérifié
        await db.query(
            'UPDATE utilisateurs SET est_verifie = true WHERE id = $1',
            [verification.rows[0].utilisateur_id]
        );

        // Supprimer le token de vérification
        await db.query(
            'DELETE FROM jetons_verification_email WHERE jeton = $1',
            [token]
        );

        res.json({
            message: req.langue === 'fr' ?
                'Email vérifié avec succès' :
                'Email successfully verified'
        });

    } catch (error) {
        console.error('Erreur lors de la vérification de l\'email:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la vérification de l\'email' :
                'Email verification error'
        });
    }
});

// Déconnexion
router.post('/deconnexion', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (token) {
            // Supprimer la session
            await db.query(
                'DELETE FROM sessions WHERE token = $1',
                [token]
            );
        }

        res.json({
            message: req.langue === 'fr' ?
                'Déconnexion réussie' :
                'Logout successful'
        });

    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la déconnexion' :
                'Logout error'
        });
    }
});

module.exports = router;
