import crypto from 'crypto';
import { SupportedLanguage } from '../types';

/**
 * Génère un token aléatoire
 */
export const generateToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Génère un code PIN aléatoire
 */
export const generatePin = (length: number = 6): string => {
  return Array.from(
    { length },
    () => Math.floor(Math.random() * 10)
  ).join('');
};

/**
 * Valide une adresse email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valide un mot de passe
 */
export const isValidPassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Valide un code PIN
 */
export const isValidPin = (pin: string): boolean => {
  return /^\d{6}$/.test(pin);
};

/**
 * Formate une date
 */
export const formatDate = (date: Date, locale: SupportedLanguage = 'fr'): string => {
  return date.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Tronque un texte
 */
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

import { sanitizeHtmlInput } from './sanitize-html';

/**
 * Nettoie un texte HTML
 */
export const sanitizeHtml = (html: string): string => {
  return sanitizeHtmlInput(html);
};

/**
 * Extrait l'ID d'une vidéo YouTube depuis son URL
 */
export const extractYoutubeId = (url: string): string | null => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
};

/**
 * Vérifie si une URL est valide
 * @param url - L'URL à valider
 * @returns true si l'URL est valide, false sinon
 */
export const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    
    // Validate protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
    
    // Validate hostname
    const hostname = urlObj.hostname;
    if (!hostname || !/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(hostname)) {
      return false;
    }
    
    // Validate path (optional)
    if (urlObj.pathname && !/^(\/[a-z0-9\-._~%!$&'()*+,;=:@\/]*)*$/i.test(urlObj.pathname)) {
      return false;
    }
    
    // Validate query parameters (optional)
    if (urlObj.search && !/^\?([a-z0-9\-._~%!$&'()*+,;=:@\/?]+\&?)*$/i.test(urlObj.search)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
};


/**
 * Génère un slug à partir d'une chaîne
 */
export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

/**
 * Formate une taille de fichier
 */
export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
};

/**
 * Génère un identifiant unique
 */
export const generateUniqueId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Retarde l'exécution d'une fonction
 */
export const debounce = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
): ((...args: Parameters<F>) => void) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<F>): void => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };
};

/**
 * Limite le nombre d'appels à une fonction
 */
export const throttle = <F extends (...args: any[]) => any>(
  func: F,
  waitFor: number
): ((...args: Parameters<F>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  let lastCall = 0;

  return (...args: Parameters<F>): void => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= waitFor) {
      func(...args);
      lastCall = now;
    } else if (!timeout) {
      timeout = setTimeout(() => {
        func(...args);
        lastCall = Date.now();
        timeout = null;
      }, waitFor - timeSinceLastCall);
    }
  };
};

export default {
  generateToken,
  generatePin,
  isValidEmail,
  isValidPassword,
  isValidPin,
  formatDate,
  truncateText,
  sanitizeHtml,
  extractYoutubeId,
  isValidUrl,
  slugify,
  formatFileSize,
  generateUniqueId,
  debounce,
  throttle
};
