const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { verifierToken } = require('../middleware/auth');
const db = require('../utils/db');
const config = require('../config/config');
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: config.OPENAI_API_KEY
});

// Validation des entrées
const validationResume = [
    body('contenu').notEmpty().withMessage({
        fr: 'Le contenu à résumer est requis',
        en: 'Content to summarize is required'
    }),
    body('type').isIn(['article', 'texte', 'pdf', 'youtube']).withMessage({
        fr: 'Type de contenu invalide',
        en: 'Invalid content type'
    })
];

// Fonction pour générer un résumé avec OpenAI
async function genererResume(contenu, langue) {
    try {
        const prompt = langue === 'fr' ?
            `Résume le texte suivant en conservant les points clés principaux:\n\n${contenu}` :
            `Summarize the following text keeping the main key points:\n\n${contenu}`;

        const completion = await openai.chat.completions.create({
            model: config.MODELE_GPT,
            messages: [
                { "role": "system", "content": langue === 'fr' ?
                    "Tu es un assistant spécialisé dans la création de résumés concis et pertinents." :
                    "You are an assistant specialized in creating concise and relevant summaries."
                },
                { "role": "user", "content": prompt }
            ],
            max_tokens: config.LONGUEUR_MAX_RESUME,
            temperature: 0.7
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Erreur OpenAI:', error);
        throw new Error(langue === 'fr' ?
            'Erreur lors de la génération du résumé' :
            'Error generating summary'
        );
    }
}

// Route pour résumer un article via URL
router.post('/url', verifierToken, async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({
                message: req.langue === 'fr' ?
                    'URL requise' :
                    'URL required'
            });
        }

        // Récupérer le contenu de l'URL
        const response = await fetch(url);
        const html = await response.text();
        
        // Extraire le texte principal (à implémenter avec une bibliothèque comme cheerio)
        const contenu = html; // À remplacer par l'extraction réelle du texte

        // Générer le résumé
        const resume = await genererResume(contenu, req.langue);

        // Sauvegarder dans la base de données
        const resultat = await db.query(
            `INSERT INTO resumes (utilisateur_id, type, source_url, contenu_original, resume)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, resume, cree_le`,
            [req.utilisateur.id, 'article', url, contenu, resume]
        );

        res.json({
            message: req.langue === 'fr' ?
                'Résumé généré avec succès' :
                'Summary generated successfully',
            resume: resultat.rows[0]
        });

    } catch (error) {
        console.error('Erreur lors du résumé d\'URL:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la génération du résumé' :
                'Error generating summary'
        });
    }
});

// Route pour résumer un texte
router.post('/texte', verifierToken, validationResume, async (req, res) => {
    const erreurs = validationResult(req);
    if (!erreurs.isEmpty()) {
        return res.status(400).json({
            erreurs: erreurs.array().map(err => err.msg[req.langue])
        });
    }

    try {
        const { contenu } = req.body;
        const resume = await genererResume(contenu, req.langue);

        // Sauvegarder dans la base de données
        const resultat = await db.query(
            `INSERT INTO resumes (utilisateur_id, type, contenu_original, resume)
            VALUES ($1, $2, $3, $4)
            RETURNING id, resume, cree_le`,
            [req.utilisateur.id, 'texte', contenu, resume]
        );

        res.json({
            message: req.langue === 'fr' ?
                'Résumé généré avec succès' :
                'Summary generated successfully',
            resume: resultat.rows[0]
        });

    } catch (error) {
        console.error('Erreur lors du résumé de texte:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la génération du résumé' :
                'Error generating summary'
        });
    }
});

// Route pour résumer une vidéo YouTube
router.post('/youtube', verifierToken, async (req, res) => {
    try {
        const { videoId } = req.body;

        if (!videoId) {
            return res.status(400).json({
                message: req.langue === 'fr' ?
                    'ID de la vidéo YouTube requis' :
                    'YouTube video ID required'
            });
        }

        // TODO: Implémenter la récupération des sous-titres YouTube
        // Utiliser une bibliothèque comme youtube-captions-scraper
        const sousTitres = ""; // À remplacer par les sous-titres réels

        const resume = await genererResume(sousTitres, req.langue);

        // Sauvegarder dans la base de données
        const resultat = await db.query(
            `INSERT INTO resumes (utilisateur_id, type, source_url, contenu_original, resume)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, resume, cree_le`,
            [req.utilisateur.id, 'youtube', `https://youtube.com/watch?v=${videoId}`, sousTitres, resume]
        );

        res.json({
            message: req.langue === 'fr' ?
                'Résumé de la vidéo généré avec succès' :
                'Video summary generated successfully',
            resume: resultat.rows[0]
        });

    } catch (error) {
        console.error('Erreur lors du résumé YouTube:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la génération du résumé de la vidéo' :
                'Error generating video summary'
        });
    }
});

// Route pour récupérer l'historique des résumés
router.get('/historique', verifierToken, async (req, res) => {
    try {
        const resumes = await db.query(
            `SELECT id, type, source_url, resume, cree_le
            FROM resumes
            WHERE utilisateur_id = $1
            ORDER BY cree_le DESC`,
            [req.utilisateur.id]
        );

        res.json({
            message: req.langue === 'fr' ?
                'Historique des résumés récupéré avec succès' :
                'Summary history retrieved successfully',
            resumes: resumes.rows
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la récupération de l\'historique' :
                'Error retrieving history'
        });
    }
});

// Route pour supprimer un résumé
router.delete('/:id', verifierToken, async (req, res) => {
    try {
        const { id } = req.params;

        const resultat = await db.query(
            `DELETE FROM resumes
            WHERE id = $1 AND utilisateur_id = $2
            RETURNING id`,
            [id, req.utilisateur.id]
        );

        if (resultat.rows.length === 0) {
            return res.status(404).json({
                message: req.langue === 'fr' ?
                    'Résumé non trouvé' :
                    'Summary not found'
            });
        }

        res.json({
            message: req.langue === 'fr' ?
                'Résumé supprimé avec succès' :
                'Summary deleted successfully'
        });

    } catch (error) {
        console.error('Erreur lors de la suppression du résumé:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la suppression du résumé' :
                'Error deleting summary'
        });
    }
});

module.exports = router;
