import { AppError, ResumeModel, SupportedLanguage } from '../types';
import { logService } from './common';
import db from '../utils/db';
import config from '../config/config';
import cheerio from 'cheerio';
import pdfParse from 'pdf-parse';
import { getSubtitles } from 'youtube-captions-scraper';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY
});

/**
 * Service de résumé
 */
export const resumeService = {
  /**
   * Résumer un article à partir d'une URL
   */
  async summarizeUrl(
    utilisateur_id: number,
    url: string,
    langue: SupportedLanguage
  ): Promise<ResumeModel> {
    try {
      // Récupérer le contenu de l'URL
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);

      // Extraire le texte principal (à adapter selon la structure du site)
      const article = $('article').text() || $('main').text() || $('body').text();
      const cleanText = article.replace(/\s+/g, ' ').trim();

      // Générer le résumé
      const resume = await this.generateSummary(cleanText, langue);

      // Sauvegarder dans la base de données
      const result = await db.query<ResumeModel>(
        `INSERT INTO resumes 
        (utilisateur_id, type, resume, source_url, langue)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [utilisateur_id, 'article', resume, url, langue]
      );

      logService.info('url_summarized', {
        utilisateur_id,
        url
      });

      return result.rows[0];
    } catch (error) {
      logService.error('url_summarization_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        utilisateur_id,
        url
      });
      throw error;
    }
  },

  /**
   * Résumer un texte
   */
  async summarizeText(
    utilisateur_id: number,
    texte: string,
    langue: SupportedLanguage
  ): Promise<ResumeModel> {
    try {
      const resume = await this.generateSummary(texte, langue);

      const result = await db.query<ResumeModel>(
        `INSERT INTO resumes 
        (utilisateur_id, type, resume, langue)
        VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [utilisateur_id, 'texte', resume, langue]
      );

      logService.info('text_summarized', {
        utilisateur_id,
        length: texte.length
      });

      return result.rows[0];
    } catch (error) {
      logService.error('text_summarization_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        utilisateur_id
      });
      throw error;
    }
  },

  /**
   * Résumer un PDF
   */
  async summarizePdf(
    utilisateur_id: number,
    pdfBuffer: Buffer,
    langue: SupportedLanguage
  ): Promise<ResumeModel> {
    try {
      const data = await pdfParse(pdfBuffer);
      const resume = await this.generateSummary(data.text, langue);

      const result = await db.query<ResumeModel>(
        `INSERT INTO resumes 
        (utilisateur_id, type, resume, langue)
        VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [utilisateur_id, 'pdf', resume, langue]
      );

      logService.info('pdf_summarized', {
        utilisateur_id,
        pages: data.numpages
      });

      return result.rows[0];
    } catch (error) {
      logService.error('pdf_summarization_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        utilisateur_id
      });
      throw error;
    }
  },

  /**
   * Résumer une vidéo YouTube
   */
  async summarizeYoutube(
    utilisateur_id: number,
    videoUrl: string,
    langue: SupportedLanguage
  ): Promise<ResumeModel> {
    try {
      // Extraire l'ID de la vidéo
      const videoId = this.extractYoutubeId(videoUrl);
      if (!videoId) {
        throw new AppError('URL YouTube invalide', 400);
      }

      // Récupérer les sous-titres
      const captions = await getSubtitles({
        videoID: videoId,
        lang: langue === 'fr' ? 'fr' : 'en'
      });

      // Concaténer les sous-titres
      const text = captions.map(caption => caption.text).join(' ');
      const resume = await this.generateSummary(text, langue);

      const result = await db.query<ResumeModel>(
        `INSERT INTO resumes 
        (utilisateur_id, type, resume, source_url, langue)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [utilisateur_id, 'youtube', resume, videoUrl, langue]
      );

      logService.info('youtube_summarized', {
        utilisateur_id,
        videoUrl
      });

      return result.rows[0];
    } catch (error) {
      logService.error('youtube_summarization_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        utilisateur_id,
        videoUrl
      });
      throw error;
    }
  },

  /**
   * Récupérer tous les résumés d'un utilisateur
   */
  async findAll(utilisateur_id: number): Promise<ResumeModel[]> {
    try {
      const result = await db.query<ResumeModel>(
        'SELECT * FROM resumes WHERE utilisateur_id = $1 ORDER BY cree_le DESC',
        [utilisateur_id]
      );

      return result.rows;
    } catch (error) {
      logService.error('resume_fetch_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        utilisateur_id
      });
      throw error;
    }
  },

  /**
   * Récupérer un résumé par son ID
   */
  async findById(id: number, utilisateur_id: number): Promise<ResumeModel> {
    try {
      const result = await db.query<ResumeModel>(
        'SELECT * FROM resumes WHERE id = $1 AND utilisateur_id = $2',
        [id, utilisateur_id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Résumé non trouvé', 404);
      }

      return result.rows[0];
    } catch (error) {
      logService.error('resume_fetch_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        utilisateur_id
      });
      throw error;
    }
  },

  /**
   * Supprimer un résumé
   */
  async delete(id: number, utilisateur_id: number): Promise<void> {
    try {
      const result = await db.query(
        'DELETE FROM resumes WHERE id = $1 AND utilisateur_id = $2 RETURNING id',
        [id, utilisateur_id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Résumé non trouvé', 404);
      }

      logService.info('resume_deleted', {
        id,
        utilisateur_id
      });
    } catch (error) {
      logService.error('resume_deletion_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        id,
        utilisateur_id
      });
      throw error;
    }
  },

  /**
   * Générer un résumé avec OpenAI
   */
  async generateSummary(text: string, langue: SupportedLanguage): Promise<string> {

    try {
      const prompt = langue === 'fr'
        ? `Résume le texte suivant en français en ${config.LONGUEUR_MAX_RESUME} mots maximum :\n\n${text}`
        : `Summarize the following text in English in ${config.LONGUEUR_MAX_RESUME} words or less:\n\n${text}`;

      const completion = await openai.chat.completions.create({
        model: config.MODELE_GPT,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: config.LONGUEUR_MAX_RESUME * 2,
        temperature: 0.7
      });

      return completion.choices[0].message.content || '';
    } catch (error) {
      logService.error('openai_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new AppError('Erreur lors de la génération du résumé', 500);
    }
  },

  /**
   * Extraire l'ID d'une vidéo YouTube depuis son URL
   */
  extractYoutubeId(url: string): string | null {

    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  }
};

export default resumeService;
