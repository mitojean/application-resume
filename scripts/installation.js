const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Couleurs pour la console
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    red: '\x1b[31m'
};

console.log(`${colors.bright}${colors.blue}Démarrage de l'installation de l'Application Resume...${colors.reset}\n`);

try {
    // Création des dossiers nécessaires
    console.log(`${colors.blue}Création des dossiers...${colors.reset}`);
    const directories = [
        'client',
        'client/src',
        'client/public',
        'serveur/uploads',
        'serveur/logs'
    ];

    directories.forEach(dir => {
        const fullPath = path.join(__dirname, '..', dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            console.log(`Dossier créé: ${dir}`);
        }
    });

    // Installation des dépendances du serveur
    console.log(`\n${colors.blue}Installation des dépendances du serveur...${colors.reset}`);
    execSync('npm install', { stdio: 'inherit' });

    // Création du fichier .env à partir de .env.example
    console.log(`\n${colors.blue}Configuration de l'environnement...${colors.reset}`);
    if (!fs.existsSync(path.join(__dirname, '..', '.env'))) {
        fs.copyFileSync(
            path.join(__dirname, '..', '.env.example'),
            path.join(__dirname, '..', '.env')
        );
        console.log('Fichier .env créé à partir de .env.example');
    }

    // Création du client React
    console.log(`\n${colors.blue}Initialisation du client React...${colors.reset}`);
    process.chdir(path.join(__dirname, '..', 'client'));
    execSync('npx create-react-app . --template typescript', { stdio: 'inherit' });
    
    // Installation des dépendances supplémentaires du client
    console.log(`\n${colors.blue}Installation des dépendances supplémentaires du client...${colors.reset}`);
    const clientDependencies = [
        '@material-ui/core',
        '@material-ui/icons',
        'axios',
        'react-router-dom',
        'react-i18next',
        'i18next',
        'formik',
        'yup',
        'jwt-decode',
        'moment',
        'react-toastify',
        'styled-components'
    ];

    execSync(`npm install ${clientDependencies.join(' ')}`, { stdio: 'inherit' });

    // Retour au dossier racine
    process.chdir(path.join(__dirname, '..'));

    console.log(`\n${colors.bright}${colors.green}Installation terminée avec succès!${colors.reset}`);
    console.log(`\n${colors.blue}Prochaines étapes:${colors.reset}`);
    console.log('1. Configurez votre fichier .env avec vos propres variables d\'environnement');
    console.log('2. Créez et configurez votre base de données PostgreSQL');
    console.log('3. Exécutez les scripts SQL d\'initialisation');
    console.log('4. Démarrez le serveur avec: npm run dev');

} catch (error) {
    console.error(`\n${colors.red}Erreur lors de l'installation:${colors.reset}`, error);
    process.exit(1);
}
