const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { verifierAdmin } = require('../middleware/auth');
const db = require('../utils/db');
const bcrypt = require('bcryptjs');
const config = require('../config/config');

// Validation pour l'ajout d'un admin
const validationAdmin = [
    body('email').isEmail().withMessage({
        fr: 'Email invalide',
        en: 'Invalid email'
    }),
    body('motDePasse').isLength({ min: 8 }).withMessage({
        fr: 'Le mot de passe doit contenir au moins 8 caractères',
        en: 'Password must be at least 8 characters long'
    }),
    body('role').isIn(['admin', 'super_admin']).withMessage({
        fr: 'Rôle invalide',
        en: 'Invalid role'
    })
];

// Statistiques générales du système
router.get('/statistiques', verifierAdmin, async (req, res) => {
    try {
        const stats = await db.transaction(async (client) => {
            // Nombre total d'utilisateurs
            const utilisateurs = await client.query(
                'SELECT COUNT(*) as total FROM utilisateurs'
            );

            // Nombre de résumés par type
            const resumes = await client.query(
                `SELECT type, COUNT(*) as total 
                FROM resumes 
                GROUP BY type`
            );

            // Nombre total de notes
            const notes = await client.query(
                'SELECT COUNT(*) as total FROM notes'
            );

            // Nombre total de mots de passe stockés
            const motsDePasse = await client.query(
                'SELECT COUNT(*) as total FROM mots_de_passe_stockes'
            );

            // Utilisateurs actifs (connectés dans les 30 derniers jours)
            const utilisateursActifs = await client.query(
                `SELECT COUNT(DISTINCT utilisateur_id) as total 
                FROM sessions 
                WHERE cree_le > NOW() - INTERVAL '30 days'`
            );

            return {
                totalUtilisateurs: utilisateurs.rows[0].total,
                totalResumes: resumes.rows,
                totalNotes: notes.rows[0].total,
                totalMotsDePasse: motsDePasse.rows[0].total,
                utilisateursActifs: utilisateursActifs.rows[0].total
            };
        });

        res.json({
            message: req.langue === 'fr' ?
                'Statistiques récupérées avec succès' :
                'Statistics retrieved successfully',
            statistiques: stats
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la récupération des statistiques' :
                'Error retrieving statistics'
        });
    }
});

// Liste des utilisateurs avec leurs informations
router.get('/utilisateurs', verifierAdmin, async (req, res) => {
    try {
        const { page = 1, limite = 10 } = req.query;
        const offset = (page - 1) * limite;

        const utilisateurs = await db.query(
            `SELECT id, email, identifiant, pays, ville, region, 
                info_appareil, info_os, est_verifie, cree_le, derniere_connexion
            FROM utilisateurs
            ORDER BY cree_le DESC
            LIMIT $1 OFFSET $2`,
            [limite, offset]
        );

        const total = await db.query('SELECT COUNT(*) FROM utilisateurs');

        res.json({
            message: req.langue === 'fr' ?
                'Utilisateurs récupérés avec succès' :
                'Users retrieved successfully',
            utilisateurs: utilisateurs.rows,
            pagination: {
                page: parseInt(page),
                limite: parseInt(limite),
                total: parseInt(total.rows[0].count)
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la récupération des utilisateurs' :
                'Error retrieving users'
        });
    }
});

// Détails d'un utilisateur spécifique
router.get('/utilisateurs/:id', verifierAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const utilisateur = await db.transaction(async (client) => {
            // Informations de base de l'utilisateur
            const infoUtilisateur = await client.query(
                `SELECT id, email, identifiant, pays, ville, region, 
                    info_appareil, info_os, est_verifie, cree_le, derniere_connexion
                FROM utilisateurs WHERE id = $1`,
                [id]
            );

            if (infoUtilisateur.rows.length === 0) {
                return null;
            }

            // Statistiques de l'utilisateur
            const stats = await client.query(
                `SELECT 
                    (SELECT COUNT(*) FROM resumes WHERE utilisateur_id = $1) as total_resumes,
                    (SELECT COUNT(*) FROM notes WHERE utilisateur_id = $1) as total_notes,
                    (SELECT COUNT(*) FROM mots_de_passe_stockes WHERE utilisateur_id = $1) as total_mdp`,
                [id]
            );

            // Sessions récentes
            const sessions = await client.query(
                `SELECT token, info_appareil, adresse_ip, cree_le, expire_le
                FROM sessions
                WHERE utilisateur_id = $1
                ORDER BY cree_le DESC
                LIMIT 5`,
                [id]
            );

            return {
                ...infoUtilisateur.rows[0],
                statistiques: stats.rows[0],
                sessions: sessions.rows
            };
        });

        if (!utilisateur) {
            return res.status(404).json({
                message: req.langue === 'fr' ?
                    'Utilisateur non trouvé' :
                    'User not found'
            });
        }

        res.json({
            message: req.langue === 'fr' ?
                'Détails de l\'utilisateur récupérés avec succès' :
                'User details retrieved successfully',
            utilisateur
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des détails de l\'utilisateur:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la récupération des détails de l\'utilisateur' :
                'Error retrieving user details'
        });
    }
});

// Ajouter un nouvel administrateur
router.post('/administrateurs', verifierAdmin, validationAdmin, async (req, res) => {
    const erreurs = validationResult(req);
    if (!erreurs.isEmpty()) {
        return res.status(400).json({
            erreurs: erreurs.array().map(err => err.msg[req.langue])
        });
    }

    try {
        // Vérifier que l'admin actuel est un super_admin
        const adminActuel = await db.query(
            'SELECT role FROM administrateurs WHERE id = $1',
            [req.admin.id]
        );

        if (adminActuel.rows[0].role !== 'super_admin') {
            return res.status(403).json({
                message: req.langue === 'fr' ?
                    'Seuls les super administrateurs peuvent ajouter de nouveaux administrateurs' :
                    'Only super administrators can add new administrators'
            });
        }

        const { email, motDePasse, role } = req.body;

        // Vérifier si l'email existe déjà
        const adminExistant = await db.query(
            'SELECT id FROM administrateurs WHERE email = $1',
            [email]
        );

        if (adminExistant.rows.length > 0) {
            return res.status(400).json({
                message: req.langue === 'fr' ?
                    'Cet email est déjà utilisé' :
                    'This email is already in use'
            });
        }

        // Hasher le mot de passe
        const motDePasseHash = await bcrypt.hash(motDePasse, config.BCRYPT_SALT_ROUNDS);

        // Créer le nouvel administrateur
        const nouvelAdmin = await db.query(
            `INSERT INTO administrateurs (email, mot_de_passe_hash, role)
            VALUES ($1, $2, $3)
            RETURNING id, email, role, cree_le`,
            [email, motDePasseHash, role]
        );

        res.status(201).json({
            message: req.langue === 'fr' ?
                'Administrateur créé avec succès' :
                'Administrator created successfully',
            admin: nouvelAdmin.rows[0]
        });

    } catch (error) {
        console.error('Erreur lors de la création de l\'administrateur:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la création de l\'administrateur' :
                'Error creating administrator'
        });
    }
});

// Journaux système
router.get('/journaux', verifierAdmin, async (req, res) => {
    try {
        const { page = 1, limite = 50, type } = req.query;
        const offset = (page - 1) * limite;

        let query = `
            SELECT id, type, message, details, cree_le
            FROM journaux_systeme
        `;
        const params = [];

        if (type) {
            query += ` WHERE type = $1`;
            params.push(type);
        }

        query += ` ORDER BY cree_le DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limite, offset);

        const journaux = await db.query(query, params);
        const total = await db.query('SELECT COUNT(*) FROM journaux_systeme' + (type ? ' WHERE type = $1' : ''), 
            type ? [type] : []);

        res.json({
            message: req.langue === 'fr' ?
                'Journaux système récupérés avec succès' :
                'System logs retrieved successfully',
            journaux: journaux.rows,
            pagination: {
                page: parseInt(page),
                limite: parseInt(limite),
                total: parseInt(total.rows[0].count)
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des journaux système:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la récupération des journaux système' :
                'Error retrieving system logs'
        });
    }
});

module.exports = router;
