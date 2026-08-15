/**
 * Service PubMed — Récupère les articles de psychologie récents via l'API Entrez.
 *
 * Utilise les E-utilities de PubMed (ESearch + EFetch) pour chercher
 * les publications des 7 derniers jours sur des mots-clés de psychologie.
 * Aucune clé API n'est nécessaire pour PubMed.
 */

import type { Article } from "../types/index.js";

/** Mots-clés de recherche pour PubMed — couvrent les sujets psy viraux */
const PUBMED_QUERY = [
  '"cognitive bias"',
  '"decision making"',
  '"social psychology"',
  '"attachment theory"',
  '"anxiety disorder"',
  '"depression"',
  '"emotional regulation"',
  '"dopamine"',
  '"sleep psychology"',
  '"habit formation"',
  '"addiction"',
  '"parenting psychology"',
].join(" OR ");

/** URL de base pour l'API ESearch de PubMed */
const ESEARCH_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";

/** URL de base pour l'API EFetch de PubMed */
const EFETCH_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";

/**
 * Pause utilitaire — respecte les limites de débit de l'API PubMed.
 * PubMed demande max 3 requêtes/seconde sans clé API.
 *
 * @param ms - Durée de la pause en millisecondes
 */
function attendre(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Étape 1 : Recherche les PMIDs d'articles récents sur PubMed.
 * Utilise ESearch avec les mots-clés psy et un filtre de 7 jours.
 *
 * @returns Liste des identifiants PMID trouvés
 */
async function rechercherPMIDs(): Promise<string[]> {
  try {
    const params = new URLSearchParams({
      db: "pubmed",
      term: PUBMED_QUERY,
      retmode: "json",
      reldate: "7",
      datetype: "edat",
      retmax: "50",
      sort: "relevance",
    });

    const url = `${ESEARCH_BASE}?${params.toString()}`;
    console.log("[PubMed] 🔍 Lancement de la recherche ESearch...");

    const response = await fetch(url);

    if (!response.ok) {
      console.log(`[PubMed] ❌ Erreur HTTP ESearch : ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const pmids: string[] = data?.esearchresult?.idlist ?? [];

    console.log(`[PubMed] ✅ ${pmids.length} articles trouvés dans les 7 derniers jours`);
    return pmids;
  } catch (erreur) {
    console.log(`[PubMed] ❌ Erreur lors de la recherche ESearch : ${erreur}`);
    return [];
  }
}

/**
 * Extrait le texte contenu dans une balise XML donnée.
 * Gestion simple sans dépendance à un parseur XML externe.
 *
 * @param xml - Le contenu XML brut
 * @param balise - Le nom de la balise à extraire
 * @returns Le contenu textuel de la balise, ou chaîne vide si absente
 */
function extraireBalise(xml: string, balise: string): string {
  const regex = new RegExp(`<${balise}[^>]*>(.*?)</${balise}>`, "s");
  const match = xml.match(regex);
  return match?.[1]?.trim() ?? "";
}

/**
 * Extrait toutes les occurrences d'une balise XML.
 *
 * @param xml - Le contenu XML brut
 * @param balise - Le nom de la balise à extraire
 * @returns Tableau de contenus textuels trouvés
 */
function extraireToutesBalises(xml: string, balise: string): string[] {
  const regex = new RegExp(`<${balise}[^>]*>(.*?)</${balise}>`, "gs");
  const resultats: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    resultats.push(match[1]?.trim() ?? "");
  }
  return resultats;
}

/**
 * Extrait le contenu de l'abstract depuis le XML PubMed.
 * L'abstract peut contenir plusieurs sections (AbstractText) avec des labels.
 *
 * @param articleXml - Le XML d'un seul article PubMed
 * @returns Le texte complet de l'abstract
 */
function extraireAbstract(articleXml: string): string {
  const sections = extraireToutesBalises(articleXml, "AbstractText");
  if (sections.length > 0) {
    return sections.join(" ");
  }
  return extraireBalise(articleXml, "Abstract");
}

/**
 * Extrait les noms des auteurs depuis le XML PubMed.
 *
 * @param articleXml - Le XML d'un seul article PubMed
 * @returns Liste des noms d'auteurs au format "Nom Prénom"
 */
function extraireAuteurs(articleXml: string): string[] {
  const auteursXml = extraireToutesBalises(articleXml, "Author");
  return auteursXml.map((auteurXml) => {
    const nom = extraireBalise(auteurXml, "LastName");
    const prenom = extraireBalise(auteurXml, "ForeName");
    return `${nom} ${prenom}`.trim();
  }).filter((nom) => nom.length > 0);
}

/**
 * Extrait le DOI depuis le XML PubMed.
 *
 * @param articleXml - Le XML d'un seul article PubMed
 * @returns Le DOI trouvé ou chaîne vide
 */
function extraireDOI(articleXml: string): string {
  /* Cherche dans les ArticleId avec IdType="doi" */
  const doiMatch = articleXml.match(/<ArticleId IdType="doi">(.*?)<\/ArticleId>/s);
  if (doiMatch?.[1]) {
    return doiMatch[1].trim();
  }

  /* Cherche dans les ELocationID avec EIdType="doi" */
  const elocMatch = articleXml.match(/<ELocationID EIdType="doi"[^>]*>(.*?)<\/ELocationID>/s);
  if (elocMatch?.[1]) {
    return elocMatch[1].trim();
  }

  return "";
}

/**
 * Extrait la date de publication depuis le XML PubMed.
 *
 * @param articleXml - Le XML d'un seul article PubMed
 * @returns La date au format "YYYY-MM-DD" ou "YYYY" si jour/mois absents
 */
function extraireDate(articleXml: string): string {
  /* Essaie d'abord la date de publication électronique */
  const pubDateXml =
    articleXml.match(/<PubDate>(.*?)<\/PubDate>/s)?.[1] ?? "";

  const annee = extraireBalise(pubDateXml, "Year");
  const mois = extraireBalise(pubDateXml, "Month");
  const jour = extraireBalise(pubDateXml, "Day");

  if (annee && mois && jour) {
    /* Convertit le mois textuel (Jan, Feb...) en numéro si nécessaire */
    const moisNum = convertirMois(mois);
    return `${annee}-${moisNum}-${jour.padStart(2, "0")}`;
  }

  if (annee && mois) {
    return `${annee}-${convertirMois(mois)}`;
  }

  return annee || "date inconnue";
}

/**
 * Convertit un mois textuel anglais en numéro à 2 chiffres.
 *
 * @param mois - Le mois en texte (ex: "Jan", "Feb") ou déjà un numéro
 * @returns Le mois en format "01" à "12"
 */
function convertirMois(mois: string): string {
  const moisMap: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04",
    May: "05", Jun: "06", Jul: "07", Aug: "08",
    Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  return moisMap[mois] ?? mois.padStart(2, "0");
}

/**
 * Étape 2 : Récupère les détails complets des articles via EFetch.
 * Découpe les PMIDs en lots pour éviter les URLs trop longues.
 *
 * @param pmids - Liste des identifiants PMID à récupérer
 * @returns Liste d'articles parsés et structurés
 */
async function recupererDetailsArticles(pmids: string[]): Promise<Article[]> {
  if (pmids.length === 0) {
    console.log("[PubMed] ⚠️ Aucun PMID à récupérer");
    return [];
  }

  const articles: Article[] = [];

  /* Découpe en lots de 20 pour respecter les limites d'URL */
  const tailleLot = 20;
  for (let i = 0; i < pmids.length; i += tailleLot) {
    const lot = pmids.slice(i, i + tailleLot);
    console.log(
      `[PubMed] 📥 Récupération du lot ${Math.floor(i / tailleLot) + 1} (${lot.length} articles)...`
    );

    try {
      const params = new URLSearchParams({
        db: "pubmed",
        id: lot.join(","),
        retmode: "xml",
      });

      const url = `${EFETCH_BASE}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        console.log(
          `[PubMed] ❌ Erreur HTTP EFetch : ${response.status} ${response.statusText}`
        );
        continue;
      }

      const xml = await response.text();

      /* Découpe le XML en articles individuels */
      const articlesXml = xml.split("<PubmedArticle>");

      for (const articleXml of articlesXml) {
        /* Ignore les fragments vides (avant le premier article) */
        if (!articleXml.includes("</PubmedArticle>")) continue;

        const pmid = extraireBalise(articleXml, "PMID");
        const titre = extraireBalise(articleXml, "ArticleTitle");
        const abstract = extraireAbstract(articleXml);
        const auteurs = extraireAuteurs(articleXml);
        const datePublication = extraireDate(articleXml);
        const doi = extraireDOI(articleXml);

        /* Ignore les articles sans titre ou sans abstract */
        if (!titre || !abstract) {
          console.log(
            `[PubMed] ⚠️ Article PMID ${pmid} ignoré (titre ou abstract manquant)`
          );
          continue;
        }

        articles.push({
          id: pmid,
          titre,
          abstract,
          auteurs,
          datePublication,
          doi,
          url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
          source: "pubmed",
        });
      }
    } catch (erreur) {
      console.log(`[PubMed] ❌ Erreur lors de la récupération du lot : ${erreur}`);
    }

    /* Pause de 1 seconde entre les lots pour respecter les limites */
    if (i + tailleLot < pmids.length) {
      console.log("[PubMed] ⏳ Pause de 1 seconde (respect des limites API)...");
      await attendre(1000);
    }
  }

  console.log(`[PubMed] ✅ ${articles.length} articles récupérés avec succès`);
  return articles;
}

/**
 * Fonction principale — Récupère les articles de psychologie récents depuis PubMed.
 * Combine ESearch (recherche) et EFetch (détails) en un seul appel.
 *
 * @returns Liste d'articles structurés, prêts pour le scoring
 */
export async function fetchPubMedArticles(): Promise<Article[]> {
  console.log("[PubMed] 🚀 Début de la collecte des articles PubMed...");

  /* Étape 1 : Rechercher les PMIDs récents */
  const pmids = await rechercherPMIDs();

  if (pmids.length === 0) {
    console.log("[PubMed] ℹ️ Aucun article trouvé pour cette période");
    return [];
  }

  /* Pause entre les deux appels API */
  await attendre(1000);

  /* Étape 2 : Récupérer les détails de chaque article */
  const articles = await recupererDetailsArticles(pmids);

  console.log(`[PubMed] 🏁 Collecte terminée : ${articles.length} articles exploitables`);
  return articles;
}
