/// <reference path="../types/jest.d.ts" />

import {
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
} from '../../utils/helpers';

describe('Helper Functions', () => {
  describe('generateToken', () => {
    it('devrait générer un token de la longueur spécifiée', () => {
      const token = generateToken(32);
      expect(token).toHaveLength(64); // Hex string est 2x plus long
      expect(token).toMatch(/^[0-9a-f]+$/); // Hex string
    });

    it('devrait générer des tokens uniques', () => {
      const token1 = generateToken();
      const token2 = generateToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('generatePin', () => {
    it('devrait générer un PIN de la longueur spécifiée', () => {
      const pin = generatePin(6);
      expect(pin).toHaveLength(6);
      expect(pin).toMatch(/^\d+$/); // Uniquement des chiffres
    });

    it('devrait générer des PINs uniques', () => {
      const pin1 = generatePin();
      const pin2 = generatePin();
      expect(pin1).not.toBe(pin2);
    });
  });

  describe('isValidEmail', () => {
    it('devrait valider les emails corrects', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true);
    });

    it('devrait rejeter les emails invalides', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@.com')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('devrait valider les mots de passe forts', () => {
      const result = isValidPassword('StrongP@ss123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('devrait identifier les faiblesses des mots de passe', () => {
      const result = isValidPassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Le mot de passe doit contenir au moins 8 caractères');
      expect(result.errors).toContain('Le mot de passe doit contenir au moins une majuscule');
      expect(result.errors).toContain('Le mot de passe doit contenir au moins un chiffre');
      expect(result.errors).toContain('Le mot de passe doit contenir au moins un caractère spécial');
    });
  });

  describe('isValidPin', () => {
    it('devrait valider les PINs corrects', () => {
      expect(isValidPin('123456')).toBe(true);
    });

    it('devrait rejeter les PINs invalides', () => {
      expect(isValidPin('12345')).toBe(false); // Trop court
      expect(isValidPin('1234567')).toBe(false); // Trop long
      expect(isValidPin('abcdef')).toBe(false); // Pas des chiffres
    });
  });

  describe('formatDate', () => {
    it('devrait formater les dates en français', () => {
      const date = new Date('2023-12-25T12:30:00');
      const formatted = formatDate(date, 'fr');
      expect(formatted).toMatch(/25 décembre 2023/);
      expect(formatted).toMatch(/12:30/);
    });

    it('devrait formater les dates en anglais', () => {
      const date = new Date('2023-12-25T12:30:00');
      const formatted = formatDate(date, 'en');
      expect(formatted).toMatch(/December 25, 2023/);
      expect(formatted).toMatch(/12:30/);
    });
  });

  describe('truncateText', () => {
    it('devrait tronquer le texte à la longueur spécifiée', () => {
      const text = 'Lorem ipsum dolor sit amet';
      expect(truncateText(text, 10)).toBe('Lorem ipsu...');
    });

    it('ne devrait pas tronquer les textes courts', () => {
      const text = 'Short text';
      expect(truncateText(text, 20)).toBe(text);
    });
  });

  describe('sanitizeHtml', () => {
    it('devrait nettoyer le HTML', () => {
      const html = '<p>Test <script>alert("xss")</script><b>content</b></p>';
      expect(sanitizeHtml(html)).toBe('Test content');
    });

    it('devrait gérer les espaces et caractères spéciaux', () => {
      const html = '<p>Test&nbsp;content  with   spaces</p>';
      expect(sanitizeHtml(html)).toBe('Test content with spaces');
    });
  });

  describe('extractYoutubeId', () => {
    it('devrait extraire l\'ID d\'une URL YouTube', () => {
      expect(extractYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))
        .toBe('dQw4w9WgXcQ');
      expect(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ'))
        .toBe('dQw4w9WgXcQ');
    });

    it('devrait retourner null pour les URLs invalides', () => {
      expect(extractYoutubeId('https://example.com')).toBeNull();
      expect(extractYoutubeId('invalid')).toBeNull();
    });
  });

  describe('isValidUrl', () => {
    it('devrait valider les URLs correctes', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://sub.example.com/path?query=1')).toBe(true);
    });

    it('devrait rejeter les URLs invalides', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('http:/example.com')).toBe(false);
    });
  });

  describe('slugify', () => {
    it('devrait créer un slug valide', () => {
      expect(slugify('Hello World!')).toBe('hello-world');
      expect(slugify('Éléphant à l\'école')).toBe('elephant-a-l-ecole');
    });

    it('devrait gérer les caractères spéciaux', () => {
      expect(slugify('Test & Demo')).toBe('test-demo');
      expect(slugify('Multiple   Spaces')).toBe('multiple-spaces');
    });
  });

  describe('formatFileSize', () => {
    it('devrait formater les tailles en bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
    });

    it('devrait formater les tailles en KB', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
    });

    it('devrait formater les tailles en MB', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    });

    it('devrait formater les tailles en GB', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });
  });

  describe('generateUniqueId', () => {
    it('devrait générer des IDs uniques', () => {
      const id1 = generateUniqueId();
      const id2 = generateUniqueId();
      expect(id1).not.toBe(id2);
    });

    it('devrait générer des IDs valides', () => {
      const id = generateUniqueId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    it('devrait débouncer une fonction', () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 1000);

      // Appels multiples
      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(fn).not.toHaveBeenCalled();

      // Avancer le temps
      jest.runAllTimers();

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    jest.useFakeTimers();

    it('devrait throttle une fonction', () => {
      const fn = jest.fn();
      const throttledFn = throttle(fn, 1000);

      // Appels multiples
      throttledFn();
      throttledFn();
      throttledFn();

      expect(fn).toHaveBeenCalledTimes(1);

      // Avancer le temps
      jest.advanceTimersByTime(1000);
      throttledFn();

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
