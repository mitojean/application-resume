const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { verifierToken, verifierPin } = require('../middleware/auth');
const db = require('../utils/db');
const crypto = require('crypto');
const config = require('../config/config');

// Clé de chiffrement pour les mots de passe stockés
const ENCRYPTION_KEY = crypto.scryptSync(config.JWT_SECRET, 'sel', 32);
const IV_LENGTH = 16;

// Fonctions utilitaires pour le chiffrement/déchiffrement
const chiffrer = (texte) => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    const chiffre = Buffer.concat([cipher.update(texte, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + chiffre.toString('hex') + ':' + tag.toString('hex');
};

const dechiffrer = (texteChiffre) => {
    const [ivHex, chiffreHex, tagHex] = texteChiffre.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const chiffre = Buffer.from(chiffreHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(chiffre) + decipher.final('utf8');
};

// Validation pour l'ajout/modification de mot de passe
const validationMotDePasse = [
    body('siteWeb').notEmpty().withMessage({
        fr: 'Le site web est requis',
        en: 'Website is required'
    }),
    body('identifiant').notEmpty().withMessage({
        fr: 'L\'identifiant est requis',
        en: 'Username is required'
    }),
    body('motDePasse').notEmpty().withMessage({
        fr: 'Le mot de passe est requis',
        en: 'Password is required'
    })
];

// Ajouter un nouveau mot de passe
router.post('/', verifierToken, verifierPin, validationMotDePasse, async (req, res) => {
    const erreurs = validationResult(req);
    if (!erreurs.isEmpty()) {
        return res.status(400).json({
            erreurs: erreurs.array().map(err => err.msg[req.langue])
        });
    }

    try {
        const { siteWeb, identifiant, motDePasse, notes } = req.body;
        const motDePasseChiffre = chiffrer(motDePasse);

        const resultat = await db.query(
            `INSERT INTO mots_de_passe_stockes 
            (utilisateur_id, site_web, identifiant, mot_de_passe_crypte, notes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, site_web, identifiant, notes, cree_le`,
            [req.utilisateur.id, siteWeb, identifiant, motDePasseChiffre, notes]
        );

        res.status(201).json({
            message: req.langue === 'fr' ?
                'Mot de passe ajouté avec succès' :
                'Password added successfully',
            motDePasse: resultat.rows[0]
        });

    } catch (error) {
        console.error('Erreur lors de l\'ajout du mot de passe:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de l\'ajout du mot de passe' :
                'Error adding password'
        });
    }
});

// Récupérer tous les mots de passe
router.get('/', verifierToken, async (req, res) => {
    try {
        const motsDePasse = await db.query(
            `SELECT id, site_web, identifiant, notes, cree_le, modifie_le
            FROM mots_de_passe_stockes
            WHERE utilisateur_id = $1
            ORDER BY site_web ASC`,
            [req.utilisateur.id]
        );

        res.json({
            message: req.langue === 'fr' ?
                'Mots de passe récupérés avec succès' :
                'Passwords retrieved successfully',
            motsDePasse: motsDePasse.rows
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des mots de passe:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la récupération des mots de passe' :
                'Error retrieving passwords'
        });
    }
});

// Récupérer un mot de passe spécifique
router.get('/:id', verifierToken, verifierPin, async (req, res) => {
    try {
        const { id } = req.params;

        const motDePasse = await db.query(
            `SELECT *
            FROM mots_de_passe_stockes
            WHERE id = $1 AND utilisateur_id = $2`,
            [id, req.utilisateur.id]
        );

        if (motDePasse.rows.length === 0) {
            return res.status(404).json({
                message: req.langue === 'fr' ?
                    'Mot de passe non trouvé' :
                    'Password not found'
            });
        }

        // Déchiffrer le mot de passe
        const motDePasseDechiffre = dechiffrer(motDePasse.rows[0].mot_de_passe_crypte);
        motDePasse.rows[0].mot_de_passe = motDePasseDechiffre;
        delete motDePasse.rows[0].mot_de_passe_crypte;

        res.json({
            message: req.langue === 'fr' ?
                'Mot de passe récupéré avec succès' :
                'Password retrieved successfully',
            motDePasse: motDePasse.rows[0]
        });

    } catch (error) {
        console.error('Erreur lors de la récupération du mot de passe:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la récupération du mot de passe' :
                'Error retrieving password'
        });
    }
});

// Modifier un mot de passe
router.put('/:id', verifierToken, verifierPin, validationMotDePasse, async (req, res) => {
    const erreurs = validationResult(req);
    if (!erreurs.isEmpty()) {
        return res.status(400).json({
            erreurs: erreurs.array().map(err => err.msg[req.langue])
        });
    }

    try {
        const { id } = req.params;
        const { siteWeb, identifiant, motDePasse, notes } = req.body;
        const motDePasseChiffre = chiffrer(motDePasse);

        const resultat = await db.query(
            `UPDATE mots_de_passe_stockes
            SET site_web = $1, identifiant = $2, mot_de_passe_crypte = $3, 
                notes = $4, modifie_le = NOW()
            WHERE id = $5 AND utilisateur_id = $6
            RETURNING id, site_web, identifiant, notes, modifie_le`,
            [siteWeb, identifiant, motDePasseChiffre, notes, id, req.utilisateur.id]
        );

        if (resultat.rows.length === 0) {
            return res.status(404).json({
                message: req.langue === 'fr' ?
                    'Mot de passe non trouvé' :
                    'Password not found'
            });
        }

        res.json({
            message: req.langue === 'fr' ?
                'Mot de passe modifié avec succès' :
                'Password updated successfully',
            motDePasse: resultat.rows[0]
        });

    } catch (error) {
        console.error('Erreur lors de la modification du mot de passe:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la modification du mot de passe' :
                'Error updating password'
        });
    }
});

// Supprimer un mot de passe
router.delete('/:id', verifierToken, verifierPin, async (req, res) => {
    try {
        const { id } = req.params;

        const resultat = await db.query(
            `DELETE FROM mots_de_passe_stockes
            WHERE id = $1 AND utilisateur_id = $2
            RETURNING id`,
            [id, req.utilisateur.id]
        );

        if (resultat.rows.length === 0) {
            return res.status(404).json({
                message: req.langue === 'fr' ?
                    'Mot de passe non trouvé' :
                    'Password not found'
            });
        }

        res.json({
            message: req.langue === 'fr' ?
                'Mot de passe supprimé avec succès' :
                'Password deleted successfully'
        });

    } catch (error) {
        console.error('Erreur lors de la suppression du mot de passe:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la suppression du mot de passe' :
                'Error deleting password'
        });
    }
});

// Vérifier les fuites de données
router.post('/verifier-fuite', verifierToken, async (req, res) => {
    try {
        const { motDePasse } = req.body;

        // TODO: Implémenter la vérification des fuites de données
        // Utiliser des services comme Have I Been Pwned API

        // Pour l'exemple, on simule une vérification
        const estCompromis = false;

        if (estCompromis) {
            // Créer une alerte
            await db.query(
                `INSERT INTO alertes_fuite_donnees (utilisateur_id, details_fuite)
                VALUES ($1, $2)`,
                [req.utilisateur.id, 'Mot de passe compromis détecté']
            );

            return res.json({
                message: req.langue === 'fr' ?
                    'Ce mot de passe a été compromis dans une fuite de données' :
                    'This password has been compromised in a data breach',
                compromis: true
            });
        }

        res.json({
            message: req.langue === 'fr' ?
                'Aucune fuite de données détectée pour ce mot de passe' :
                'No data breaches detected for this password',
            compromis: false
        });

    } catch (error) {
        console.error('Erreur lors de la vérification des fuites:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la vérification des fuites de données' :
                'Error checking for data breaches'
        });
    }
});

module.exports = router;
