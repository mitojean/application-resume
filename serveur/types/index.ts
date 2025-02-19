// Types d'erreurs personnalisées
export class AppError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string) {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

// Types pour les modèles de base de données
export interface BaseModel {
  id: number;
  cree_le: Date;
  modifie_le: Date;
}

export interface UserModel extends BaseModel {
  email: string;
  identifiant: string;
  mot_de_passe_hash: string;
  code_pin_hash: string;
  est_verifie: boolean;
  role: 'utilisateur' | 'admin';
}

export interface UserPayload {
  id: number;
  email: string;
  identifiant: string;
  est_verifie: boolean;
  role: 'utilisateur' | 'admin';
}

export interface SessionModel extends BaseModel {
  utilisateur_id: number;
  token: string;
  info_appareil: UserInfo['appareil'];
  adresse_ip: string;
  expire_le: Date;
}

export interface ResumeModel extends BaseModel {
  utilisateur_id: number;
  type: 'article' | 'texte' | 'pdf' | 'youtube';
  resume: string;
  source_url?: string;
  langue: SupportedLanguage;
}

export interface PasswordModel extends BaseModel {
  utilisateur_id: number;
  site_web: string;
  identifiant: string;
  mot_de_passe_crypte: string;
  notes?: string;
}

export interface NoteModel extends BaseModel {
  utilisateur_id: number;
  titre: string;
  contenu: string;
  est_archive: boolean;
}

export interface SystemLogModel extends BaseModel {
  type: 'info' | 'error' | 'warning' | 'security';
  message: string;
  details?: Record<string, any>;
}

// Types pour les informations utilisateur
export interface UserInfo {
  appareil: {
    type: string;
    marque: string;
    modele: string;
    os: {
      nom: string;
      version: string;
    };
  };
  localisation: {
    pays: string;
    region: string;
    ville: string;
  };
}

// Types pour les langues supportées
export type SupportedLanguage = 'fr' | 'en';

// Types pour les validations
export interface ValidationRule {
  field: string;
  rules: string[];
  message: string;
}

// Types pour les réponses API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: any;
  };
}

// Types pour les options de configuration
export interface ConfigOptions {
  maxFileSize: number;
  allowedFileTypes: string[];
  maxSummaryLength: number;
  supportedLanguages: SupportedLanguage[];
}

// Types pour les événements système
export interface SystemEvent {
  type: string;
  timestamp: Date;
  details: Record<string, any>;
}

// Types pour les statistiques
export interface SystemStats {
  total_utilisateurs: number;
  resumes_par_type: {
    type: string;
    count: number;
  }[];
  total_mots_de_passe: number;
  total_notes: number;
  nouveaux_utilisateurs_aujourdhui: number;
  nouveaux_resumes_aujourdhui: number;
}

// Types pour les métriques de performance
export interface PerformanceMetrics {
  route: string;
  method: string;
  duration: number;
  timestamp: Date;
  status: number;
}

// Types pour le cache
export interface CacheEntry<T> {
  data: T;
  expires: Date;
}

// Types pour les tâches planifiées
export interface ScheduledTask {
  id: string;
  name: string;
  interval: number;
  lastRun?: Date;
  nextRun: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

// Types pour les notifications
export interface Notification {
  id: string;
  type: 'email' | 'system';
  recipient: string;
  subject: string;
  content: string;
  status: 'pending' | 'sent' | 'failed';
  createdAt: Date;
  sentAt?: Date;
}
