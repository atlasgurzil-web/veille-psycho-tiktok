/**
 * Service APA — Récupère les articles de référence de l'APA (American Psychological Association)
 * et des plus grandes revues mondiales de psychologie sociale et comportementale.
 */

import type { Article } from "../types/index.js";

function extraireBalise(xml: string, balise: string): string {
  const regex = new RegExp(`<${balise}[^>]*>(.*?)</${balise}>`, "s");
  const match = xml.match(regex);
  return match?.[1]?.trim() ?? "";
}

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
 * Récupère les publications récentes des revues phares de l'APA et de psychologie humaine.
 *
 * @returns Liste d'articles scientifiques avec résumé complet
 */
export async function fetchAPAArticles(): Promise<Article[]> {
  console.log("[APA] 🚀 Recherche des publications récentes dans les revues officielles de l'APA...");

  // Revues officielles de l'APA et de référence mondiale
  const revues = [
    '"Am Psychol"[ta]',          // American Psychologist (Revue officielle APA)
    '"J Pers Soc Psychol"[ta]',   // Journal of Personality and Social Psychology (APA)
    '"Psychol Sci"[ta]',          // Psychological Science
    '"Nat Hum Behav"[ta]',        // Nature Human Behaviour
    '"Trends Cogn Sci"[ta]'       // Trends in Cognitive Sciences
  ].join(" OR ");

  try {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(revues)}&retmode=json&reldate=30&retmax=20&sort=pub_date`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    const pmids: string[] = searchData?.esearchresult?.idlist || [];

    console.log(`[APA] ✅ ${pmids.length} études trouvées dans les revues phares de l'APA.`);
    if (pmids.length === 0) return [];

    const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmids.join(",")}&retmode=xml`;
    const fetchRes = await fetch(fetchUrl);
    const xml = await fetchRes.text();

    const articlesXml = xml.split("<PubmedArticle>");
    const articles: Article[] = [];

    for (const artXml of articlesXml) {
      if (!artXml.includes("</PubmedArticle>")) continue;

      const pmid = extraireBalise(artXml, "PMID");
      const titre = extraireBalise(artXml, "ArticleTitle");
      const abstractParts = extraireToutesBalises(artXml, "AbstractText");
      const abstract = abstractParts.length > 0 ? abstractParts.join(" ") : extraireBalise(artXml, "Abstract");
      
      const doiMatch = artXml.match(/<ArticleId IdType="doi">(.*?)<\/ArticleId>/s) || artXml.match(/<ELocationID EIdType="doi"[^>]*>(.*?)<\/ELocationID>/s);
      const doi = doiMatch?.[1]?.trim() || `apa/${pmid}`;

      if (titre && abstract && abstract.length > 80) {
        articles.push({
          id: pmid,
          titre,
          abstract,
          auteurs: [],
          datePublication: "date récente",
          doi,
          url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
          source: "apa",
        });
      }
    }

    console.log(`[APA] ✅ ${articles.length} publications APA exploitables avec résumé complet.`);
    return articles;
  } catch (err: any) {
    console.log(`[APA] ⚠️ Erreur lors de la récupération APA : ${err?.message || err}`);
    return [];
  }
}
