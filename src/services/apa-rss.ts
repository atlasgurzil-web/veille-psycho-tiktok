/**
 * Service APA RSS — Récupère les articles récents des revues APA via leurs flux RSS.
 *
 * Parse les flux RSS de l'American Psychological Association pour extraire
 * les dernières publications en psychologie sociale, clinique et des médias.
 */

import Parser from "rss-parser";
import type { Article } from "../types/index.js";

/** Liste des flux RSS APA à surveiller */
const FLUX_APA = [
  {
    url: "https://psycnet.apa.org/journals/amp/rss",
    nom: "American Psychologist",
  },
  {
    url: "https://psycnet.apa.org/journals/psp/rss",
    nom: "Journal of Personality and Social Psychology",
  },
  {
    url: "https://psycnet.apa.org/journals/ppm/rss",
    nom: "Psychology of Popular Media",
  },
];

/**
 * Génère un identifiant à partir du lien de l'article.
 * Si pas de DOI réel, on crée un identifiant basé sur l'URL.
 *
 * @param lien - Le lien vers l'article
 * @returns Un identifiant unique dérivé du lien
 */
function genererIdDepuisLien(lien: string): string {
  try {
    /* Extrait la partie significative de l'URL pour créer un pseudo-DOI */
    const url = new URL(lien);
    const chemin = url.pathname.replace(/^\//, "").replace(/\//g, ".");
    return `apa/${chemin}`;
  } catch {
    /* Si l'URL est invalide, utilise un hash simple du lien */
    return `apa/${lien.replace(/[^a-zA-Z0-9]/g, "").slice(0, 40)}`;
  }
}

/**
 * Nettoie le HTML d'un texte (description RSS souvent en HTML).
 * Supprime les balises HTML et décode les entités courantes.
 *
 * @param texte - Le texte potentiellement en HTML
 * @returns Le texte nettoyé, sans balises
 */
function nettoyerHTML(texte: string): string {
  if (!texte) return "";
  return texte
    /* Supprime toutes les balises HTML */
    .replace(/<[^>]*>/g, "")
    /* Décode les entités HTML courantes */
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    /* Nettoie les espaces multiples */
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Récupère et parse un flux RSS APA individuel.
 *
 * @param fluxUrl - L'URL du flux RSS
 * @param fluxNom - Le nom du journal (pour les logs)
 * @returns Liste d'articles extraits du flux
 */
async function parserFluxAPA(
  fluxUrl: string,
  fluxNom: string
): Promise<Article[]> {
  const parser = new Parser({
    /* Timeout de 10 secondes pour éviter les blocages */
    timeout: 10000,
    headers: {
      /* Identifiant utilisateur pour être poli avec l'API */
      "User-Agent": "VeillePsychoTikTok/1.0 (recherche académique)",
    },
  });

  try {
    console.log(`[APA RSS] 📡 Récupération du flux "${fluxNom}"...`);

    const flux = await parser.parseURL(fluxUrl);
    const articles: Article[] = [];

    if (!flux.items || flux.items.length === 0) {
      console.log(`[APA RSS] ℹ️ Aucun article dans le flux "${fluxNom}"`);
      return [];
    }

    for (const item of flux.items) {
      /* Ignore les items sans titre */
      if (!item.title) continue;

      const titre = nettoyerHTML(item.title);
      const abstract = nettoyerHTML(item.contentSnippet || item.content || item.summary || "");
      const lien = item.link || "";
      const datePublication = item.pubDate || item.isoDate || "date inconnue";

      /* Ignore les articles sans abstract exploitable */
      if (!abstract || abstract.length < 50) {
        console.log(
          `[APA RSS] ⚠️ Article "${titre.slice(0, 50)}..." ignoré (abstract trop court ou absent)`
        );
        continue;
      }

      /* Essaie d'extraire un DOI depuis le lien */
      const doiMatch = lien.match(/doi\.org\/(.*)/);
      const doi = doiMatch?.[1] ?? genererIdDepuisLien(lien);

      articles.push({
        id: doi,
        titre,
        abstract,
        auteurs: [],
        datePublication: datePublication ?? "date inconnue",
        doi,
        url: lien,
        source: "apa",
      });
    }

    console.log(
      `[APA RSS] ✅ ${articles.length} articles extraits de "${fluxNom}"`
    );
    return articles;
  } catch (erreur) {
    /* Si un flux est en panne ou inaccessible, on continue avec les autres */
    console.log(
      `[APA RSS] ⚠️ Impossible de récupérer le flux "${fluxNom}" — ${erreur}`
    );
    console.log(
      `[APA RSS] ℹ️ Ce flux sera réessayé lors de la prochaine exécution`
    );
    return [];
  }
}

/**
 * Fonction principale — Récupère les articles récents depuis tous les flux RSS APA.
 * Si un flux est en panne, il est simplement ignoré (les autres continuent).
 *
 * @returns Liste combinée d'articles de tous les flux APA
 */
export async function fetchAPAArticles(): Promise<Article[]> {
  console.log("[APA RSS] 🚀 Début de la collecte des articles APA...");

  const tousLesArticles: Article[] = [];

  /* Récupère chaque flux séquentiellement pour éviter de surcharger l'API */
  for (const flux of FLUX_APA) {
    const articles = await parserFluxAPA(flux.url, flux.nom);
    tousLesArticles.push(...articles);
  }

  console.log(
    `[APA RSS] 🏁 Collecte APA terminée : ${tousLesArticles.length} articles au total`
  );
  return tousLesArticles;
}
