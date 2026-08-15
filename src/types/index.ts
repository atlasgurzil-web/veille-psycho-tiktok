// ============================================
// Types principaux du pipeline Veille Psycho TikTok
// ============================================
// Toutes les interfaces utilisées à travers le projet.
// Les noms de propriétés sont en français pour plus de lisibilité.

/**
 * Article scientifique récupéré depuis PubMed ou les flux RSS de l'APA.
 * Représente une publication brute avant scoring.
 */
export interface Article {
  /** Identifiant unique (PMID pour PubMed, GUID pour APA RSS) */
  id: string;

  /** Titre complet de la publication */
  titre: string;

  /** Résumé / abstract de l'article */
  abstract: string;

  /** Liste des auteurs (noms complets) */
  auteurs: string[];

  /** Date de publication (format ISO ou texte) */
  datePublication: string;

  /** Digital Object Identifier — identifiant unique de la publication */
  doi: string;

  /** Source d'où provient l'article */
  source: "pubmed" | "apa";

  /** URL directe vers l'article */
  url: string;
}

/**
 * Résultat du scoring par Gemini Flash.
 * Évalue le potentiel viral d'un article pour TikTok.
 */
export interface ScoreResult {
  /** L'article évalué */
  article: Article;

  /** Score de viralité (0–10) — est-ce que ça va buzzer ? */
  scoreViral: number;

  /** Score de simplicité (0–10) — est-ce explicable en 60 secondes ? */
  scoreSimplicite: number;

  /** Score "wow" (0–10) — effet de surprise, contre-intuitif ? */
  scoreWow: number;

  /** Score total combiné (somme des 3 scores, max 30) */
  scoreTotal: number;

  /** Justification du scoring par l'IA */
  justification: string;

  /** Angle TikTok suggéré par l'IA pour traiter cet article */
  angleTikTok: string;
}

/**
 * Script TikTok généré par Gemini Pro.
 * Prêt à être lu devant la caméra ou utilisé en voix off.
 */
export interface TikTokScript {
  /** Titre accrocheur du TikTok (visible par l'audience) */
  titre: string;

  /** Titre interne pour organiser dans Notion (non visible par l'audience) */
  titreInterne: string;

  /** Phrase d'accroche variante 1 — Style Curiosité / Question choc */
  accroche1: string;

  /** Phrase d'accroche variante 2 — Style Contre-intuitif / Mythe brisé */
  accroche2: string;

  /** Phrase d'accroche variante 3 — Style POV / Tu fais ça sans le savoir */
  accroche3: string;

  /** Explication vulgarisée du concept psychologique */
  conceptPsy: string;

  /** La preuve scientifique résumée (étude, résultats clés) */
  laPreuve: string;

  /** L'insight — ce que ça change concrètement dans la vie des gens */
  insight: string;

  /** Call to action — inciter l'engagement (commentaire, partage, follow) */
  cta: string;

  /** Durée cible du TikTok */
  dureeCible: "15s" | "30s" | "60s";

  /** Format de tournage recommandé */
  format: "face caméra" | "voix off" | "green screen";

  /** Conseil pratique de mise en scène / ton pour le tournage */
  conseilTournage?: string;

  /** Hashtags suggérés pour maximiser la portée */
  hashtags: string[];

  /** URL de la source scientifique originale */
  sourceUrl: string;

  /** Score viral hérité du scoring (pour tri dans Notion) */
  scoreViral: number;

  /** DOI de l'article source pour traçabilité et déduplication */
  doi: string;
}
