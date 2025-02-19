-- Création des extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table des utilisateurs
CREATE TABLE IF NOT EXISTS utilisateurs (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    identifiant VARCHAR(50) UNIQUE NOT NULL,
    mot_de_passe_hash VARCHAR(255) NOT NULL,
    code_pin_hash VARCHAR(255) NOT NULL,
    est_verifie BOOLEAN DEFAULT FALSE,
    role VARCHAR(20) DEFAULT 'utilisateur' CHECK (role IN ('utilisateur', 'admin')),
    derniere_connexion TIMESTAMP WITH TIME ZONE,
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index sur l'email et l'identifiant pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_utilisateurs_email ON utilisateurs(email);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_identifiant ON utilisateurs(identifiant);

-- Table des sessions
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    info_appareil JSONB NOT NULL,
    adresse_ip VARCHAR(45) NOT NULL,
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expire_le TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index sur le token et l'expiration pour les vérifications rapides
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expire_le ON sessions(expire_le);

-- Table des tokens de vérification
CREATE TABLE IF NOT EXISTS tokens_verification (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(20) CHECK (type IN ('email', 'reset_password')),
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expire_le TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index sur le token pour les vérifications rapides
CREATE INDEX IF NOT EXISTS idx_tokens_verification_token ON tokens_verification(token);

-- Table des résumés
CREATE TABLE IF NOT EXISTS resumes (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK (type IN ('article', 'texte', 'pdf', 'youtube')),
    resume TEXT NOT NULL,
    source_url TEXT,
    langue VARCHAR(2) CHECK (langue IN ('fr', 'en')),
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index sur l'utilisateur et le type pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_resumes_utilisateur ON resumes(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_resumes_type ON resumes(type);

-- Table des mots de passe
CREATE TABLE IF NOT EXISTS mots_de_passe (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE,
    site_web VARCHAR(255) NOT NULL,
    identifiant VARCHAR(255) NOT NULL,
    mot_de_passe_crypte TEXT NOT NULL,
    notes TEXT,
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index sur l'utilisateur pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_mots_de_passe_utilisateur ON mots_de_passe(utilisateur_id);

-- Table des notes
CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    utilisateur_id INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE,
    titre VARCHAR(255) NOT NULL,
    contenu TEXT NOT NULL,
    est_archive BOOLEAN DEFAULT FALSE,
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    modifie_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index sur l'utilisateur pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_notes_utilisateur ON notes(utilisateur_id);

-- Table des logs système
CREATE TABLE IF NOT EXISTS logs_systeme (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) CHECK (type IN ('info', 'error', 'warning', 'security')),
    message TEXT NOT NULL,
    details JSONB,
    cree_le TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index sur le type et la date pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_logs_systeme_type ON logs_systeme(type);
CREATE INDEX IF NOT EXISTS idx_logs_systeme_cree_le ON logs_systeme(cree_le);

-- Fonction pour mettre à jour la date de modification
CREATE OR REPLACE FUNCTION update_modifie_le()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modifie_le = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour mettre à jour automatiquement modifie_le
CREATE TRIGGER update_utilisateurs_modifie_le
    BEFORE UPDATE ON utilisateurs
    FOR EACH ROW
    EXECUTE FUNCTION update_modifie_le();

CREATE TRIGGER update_resumes_modifie_le
    BEFORE UPDATE ON resumes
    FOR EACH ROW
    EXECUTE FUNCTION update_modifie_le();

CREATE TRIGGER update_mots_de_passe_modifie_le
    BEFORE UPDATE ON mots_de_passe
    FOR EACH ROW
    EXECUTE FUNCTION update_modifie_le();

CREATE TRIGGER update_notes_modifie_le
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_modifie_le();

-- Fonction pour nettoyer les sessions expirées
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM sessions WHERE expire_le < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour nettoyer les tokens de vérification expirés
CREATE OR REPLACE FUNCTION clean_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM tokens_verification WHERE expire_le < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;
