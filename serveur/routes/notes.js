const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { verifierToken } = require('../middleware/auth');
const db = require('../utils/db');

// Validation pour l'ajout/modification de note
const validationNote = [
    body('titre').notEmpty().withMessage({
        fr: 'Le titre est requis',
        en: 'Title is required'
    }).isLength({ max: 255 }).withMessage({
        fr: 'Le titre ne doit pas dépasser 255 caractères',
        en: 'Title must not exceed 255 characters'
    }),
    body('contenu').notEmpty().withMessage({
        fr: 'Le contenu est requis',
        en: 'Content is required'
    })
];

// Créer une nouvelle note
router.post('/', verifierToken, validationNote, async (req, res) => {
    const erreurs = validationResult(req);
    if (!erreurs.isEmpty()) {
        return res.status(400).json({
            erreurs: erreurs.array().map(err => err.msg[req.langue])
        });
    }

    try {
        const { titre, contenu } = req.body;

        const resultat = await db.query(
            `INSERT INTO notes (utilisateur_id, titre, contenu)
            VALUES ($1, $2, $3)
            RETURNING id, titre, contenu, est_archive, cree_le`,
            [req.utilisateur.id, titre, contenu]
        );

        res.status(201).json({
            message: req.langue === 'fr' ?
                'Note créée avec succès' :
                'Note created successfully',
            note: resultat.rows[0]
        });

    } catch (error) {
        console.error('Erreur lors de la création de la note:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la création de la note' :
                'Error creating note'
        });
    }
});

// Récupérer toutes les notes
router.get('/', verifierToken, async (req, res) => {
    try {
        const { archive } = req.query;
        let query = `
            SELECT id, titre, contenu, est_archive, cree_le, modifie_le
            FROM notes
            WHERE utilisateur_id = $1
        `;

        // Filtrer par statut d'archivage si spécifié
        if (archive !== undefined) {
            query += ` AND est_archive = ${archive === 'true'}`;
        }

        query += ` ORDER BY modifie_le DESC`;

        const notes = await db.query(query, [req.utilisateur.id]);

        res.json({
            message: req.langue === 'fr' ?
                'Notes récupérées avec succès' :
                'Notes retrieved successfully',
            notes: notes.rows
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des notes:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la récupération des notes' :
                'Error retrieving notes'
        });
    }
});

// Récupérer une note spécifique
router.get('/:id', verifierToken, async (req, res) => {
    try {
        const { id } = req.params;

        const note = await db.query(
            `SELECT id, titre, contenu, est_archive, cree_le, modifie_le
            FROM notes
            WHERE id = $1 AND utilisateur_id = $2`,
            [id, req.utilisateur.id]
        );

        if (note.rows.length === 0) {
            return res.status(404).json({
                message: req.langue === 'fr' ?
                    'Note non trouvée' :
                    'Note not found'
            });
        }

        res.json({
            message: req.langue === 'fr' ?
                'Note récupérée avec succès' :
                'Note retrieved successfully',
            note: note.rows[0]
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de la note:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la récupération de la note' :
                'Error retrieving note'
        });
    }
});

// Modifier une note
router.put('/:id', verifierToken, validationNote, async (req, res) => {
    const erreurs = validationResult(req);
    if (!erreurs.isEmpty()) {
        return res.status(400).json({
            erreurs: erreurs.array().map(err => err.msg[req.langue])
        });
    }

    try {
        const { id } = req.params;
        const { titre, contenu } = req.body;

        const resultat = await db.query(
            `UPDATE notes
            SET titre = $1, contenu = $2, modifie_le = NOW()
            WHERE id = $3 AND utilisateur_id = $4
            RETURNING id, titre, contenu, est_archive, modifie_le`,
            [titre, contenu, id, req.utilisateur.id]
        );

        if (resultat.rows.length === 0) {
            return res.status(404).json({
                message: req.langue === 'fr' ?
                    'Note non trouvée' :
                    'Note not found'
            });
        }

        res.json({
            message: req.langue === 'fr' ?
                'Note modifiée avec succès' :
                'Note updated successfully',
            note: resultat.rows[0]
        });

    } catch (error) {
        console.error('Erreur lors de la modification de la note:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la modification de la note' :
                'Error updating note'
        });
    }
});

// Archiver/Désarchiver une note
router.patch('/:id/archive', verifierToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { estArchive } = req.body;

        const resultat = await db.query(
            `UPDATE notes
            SET est_archive = $1, modifie_le = NOW()
            WHERE id = $2 AND utilisateur_id = $3
            RETURNING id, titre, est_archive, modifie_le`,
            [estArchive, id, req.utilisateur.id]
        );

        if (resultat.rows.length === 0) {
            return res.status(404).json({
                message: req.langue === 'fr' ?
                    'Note non trouvée' :
                    'Note not found'
            });
        }

        res.json({
            message: req.langue === 'fr' ?
                estArchive ? 'Note archivée avec succès' : 'Note désarchivée avec succès' :
                estArchive ? 'Note archived successfully' : 'Note unarchived successfully',
            note: resultat.rows[0]
        });

    } catch (error) {
        console.error('Erreur lors de l\'archivage/désarchivage de la note:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de l\'archivage/désarchivage de la note' :
                'Error archiving/unarchiving note'
        });
    }
});

// Supprimer une note
router.delete('/:id', verifierToken, async (req, res) => {
    try {
        const { id } = req.params;

        const resultat = await db.query(
            `DELETE FROM notes
            WHERE id = $1 AND utilisateur_id = $2
            RETURNING id`,
            [id, req.utilisateur.id]
        );

        if (resultat.rows.length === 0) {
            return res.status(404).json({
                message: req.langue === 'fr' ?
                    'Note non trouvée' :
                    'Note not found'
            });
        }

        res.json({
            message: req.langue === 'fr' ?
                'Note supprimée avec succès' :
                'Note deleted successfully'
        });

    } catch (error) {
        console.error('Erreur lors de la suppression de la note:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la suppression de la note' :
                'Error deleting note'
        });
    }
});

// Rechercher des notes
router.get('/recherche/:terme', verifierToken, async (req, res) => {
    try {
        const { terme } = req.params;

        const notes = await db.query(
            `SELECT id, titre, contenu, est_archive, cree_le, modifie_le
            FROM notes
            WHERE utilisateur_id = $1
            AND (titre ILIKE $2 OR contenu ILIKE $2)
            ORDER BY modifie_le DESC`,
            [req.utilisateur.id, `%${terme}%`]
        );

        res.json({
            message: req.langue === 'fr' ?
                'Recherche effectuée avec succès' :
                'Search completed successfully',
            notes: notes.rows
        });

    } catch (error) {
        console.error('Erreur lors de la recherche des notes:', error);
        res.status(500).json({
            message: req.langue === 'fr' ?
                'Erreur lors de la recherche des notes' :
                'Error searching notes'
        });
    }
});

module.exports = router;
