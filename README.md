# Application Resume

Application web multilingue (Français/Anglais) permettant de résumer des articles, des vidéos YouTube, et de gérer des mots de passe de manière sécurisée.

## Fonctionnalités

### Authentification
- Inscription avec email, identifiant, mot de passe et code PIN
- Connexion sécurisée
- Vérification par email
- Restauration de mot de passe
- Protection des mots de passe par code PIN

### Résumés
- Résumé d'articles web via URL
- Résumé de textes saisis
- Résumé de documents PDF
- Résumé de vidéos YouTube
- Sauvegarde et partage des résumés

### Gestion des mots de passe
- Stockage sécurisé des mots de passe
- Génération de mots de passe forts
- Remplissage automatique
- Alertes de sécurité
- Protection par code PIN

### Notes
- Création et gestion de notes
- Organisation et archivage
- Interface intuitive

## Prérequis

- Node.js >= 18.0.0
- PostgreSQL >= 14
- npm ou yarn

## Installation

1. Cloner le dépôt :
```bash
git clone https://github.com/votre-username/application-resume.git
cd application-resume
```

2. Installer les dépendances :
```bash
npm install
```

3. Configurer les variables d'environnement :
```bash
cp .env.example .env
# Éditer .env avec vos configurations
```

4. Initialiser la base de données :
```bash
npm run init-db
```

5. Lancer le serveur de développement :
```bash
npm run dev
```

## Structure du projet

```
application-resume/
├── serveur/                # Code source du serveur
│   ├── base-de-donnees/   # Scripts SQL et migrations
│   ├── config/            # Configuration
│   ├── middleware/        # Middlewares Express
│   ├── routes/            # Routes API
│   ├── services/          # Logique métier
│   ├── types/            # Types TypeScript
│   └── utils/            # Utilitaires
├── scripts/               # Scripts utilitaires
├── uploads/              # Fichiers uploadés
└── logs/                 # Logs applicatifs
```

## Scripts disponibles

- `npm run dev` : Lance le serveur en mode développement
- `npm run build` : Compile le projet
- `npm start` : Lance le serveur en production
- `npm run init-db` : Initialise la base de données
- `npm test` : Lance les tests
- `npm run lint` : Vérifie le style du code
- `npm run format` : Formate le code

## API Documentation

### Authentification

#### POST /api/auth/register
Inscription d'un nouvel utilisateur
```json
{
  "email": "user@example.com",
  "identifiant": "username",
  "mot_de_passe": "Password123!",
  "code_pin": "123456"
}
```

#### POST /api/auth/login
Connexion utilisateur
```json
{
  "email": "user@example.com",
  "mot_de_passe": "Password123!"
}
```

### Résumés

#### POST /api/resumes/url
Résumer un article via URL
```json
{
  "url": "https://example.com/article",
  "langue": "fr"
}
```

#### POST /api/resumes/texte
Résumer un texte
```json
{
  "texte": "Votre texte ici...",
  "langue": "fr"
}
```

### Mots de passe

#### POST /api/mots-de-passe
Ajouter un mot de passe
```json
{
  "site_web": "example.com",
  "identifiant": "username",
  "mot_de_passe": "Password123!",
  "notes": "Notes optionnelles"
}
```

### Notes

#### POST /api/notes
Créer une note
```json
{
  "titre": "Titre de la note",
  "contenu": "Contenu de la note"
}
```

## Sécurité

- Chiffrement des mots de passe avec bcrypt
- Protection CSRF
- Rate limiting
- Validation des entrées
- Headers de sécurité avec Helmet
- Authentification JWT
- Protection par code PIN
- Logs de sécurité

## Tests

```bash
# Lancer tous les tests
npm test

# Lancer les tests avec couverture
npm run test:coverage
```

## Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.
