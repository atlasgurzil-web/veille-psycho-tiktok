/**
 * Pipeline Quotidien Automatisé — Veille Psycho TikTok
 *
 * Scanne PubMed + les revues de l'APA, filtre les sujets réchauffés avec Gemini 3.5 Flash,
 * et génère la fiche de tournage prompteur dans Notion.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { Client } from "@notionhq/client";

console.log("═══════════════════════════════════════════════════════════════");
console.log("🚀 DÉMARRAGE DU PIPELINE QUOTIDIEN — VEILLE PSYCHO TIKTOK");
console.log("═══════════════════════════════════════════════════════════════\n");

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

function extraireBalise(xml, balise) {
  const regex = new RegExp(`<${balise}[^>]*>(.*?)</${balise}>`, "s");
  const match = xml.match(regex);
  return match?.[1]?.trim() ?? "";
}

function extraireToutesBalises(xml, balise) {
  const regex = new RegExp(`<${balise}[^>]*>(.*?)</${balise}>`, "gs");
  const resultats = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    resultats.push(match[1]?.trim() ?? "");
  }
  return resultats;
}

// ─────────────────────────────────────────────
// 1. COLLECTE SCIENTIFIQUE (PubMed + APA)
// ─────────────────────────────────────────────
async function collecterEtudes() {
  console.log("📡 1. Recherche des publications scientifiques récentes...");
  
  const query = [
    // Revues de prestige
    '"Am Psychol"[ta]',
    '"J Pers Soc Psychol"[ta]',
    '"Psychol Sci"[ta]',
    '"Nat Hum Behav"[ta]',
    '"Trends Cogn Sci"[ta]',
    // Mots-clés comportementaux et neurosciences
    '"cognitive bias"',
    '"behavioral psychology"',
    '"decision making"',
    '"dopamine"',
    '"sleep psychology"',
    '"emotional regulation"',
    '"habit formation"'
  ].join(" OR ");

  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&reldate=14&retmax=25&sort=pub_date`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  const pmids = searchData?.esearchresult?.idlist || [];

  console.log(`   ✅ ${pmids.length} études trouvées.`);
  if (pmids.length === 0) return [];

  const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmids.join(",")}&retmode=xml`;
  const fetchRes = await fetch(fetchUrl);
  const xml = await fetchRes.text();

  const articlesXml = xml.split("<PubmedArticle>");
  const articles = [];

  for (const artXml of articlesXml) {
    if (!artXml.includes("</PubmedArticle>")) continue;

    const pmid = extraireBalise(artXml, "PMID");
    const titre = extraireBalise(artXml, "ArticleTitle");
    const journal = extraireBalise(artXml, "Title") || "Revue Scientifique";
    const abstractParts = extraireToutesBalises(artXml, "AbstractText");
    const abstract = abstractParts.length > 0 ? abstractParts.join(" ") : extraireBalise(artXml, "Abstract");
    
    const doiMatch = artXml.match(/<ArticleId IdType="doi">(.*?)<\/ArticleId>/s) || artXml.match(/<ELocationID EIdType="doi"[^>]*>(.*?)<\/ELocationID>/s);
    const doi = doiMatch?.[1]?.trim() || `etude/${pmid}`;

    if (titre && abstract && abstract.length > 80) {
      articles.push({
        id: pmid,
        titre,
        abstract,
        journal,
        doi,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      });
    }
  }

  console.log(`   ✅ ${articles.length} études exploitables avec résumé complet.\n`);
  return articles;
}

// ─────────────────────────────────────────────
// 2. SCORING IA AVEC FILTRE ANTI-CLICHÉ
// ─────────────────────────────────────────────
async function scorerEtudes(articles) {
  console.log("🧠 2. Analyse et scoring par Gemini 3.5 Flash (Filtre anti-cliché)...");
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

  const resultats = [];

  for (let i = 0; i < Math.min(articles.length, 6); i++) {
    const art = articles[i];
    console.log(`   📊 [${i + 1}/6] Évaluation de : "${art.titre.slice(0, 60)}..."`);

    const prompt = `Tu es un directeur éditorial d'élite expert en vulgarisation de psychologie scientifique sur TikTok.

RÈGLE D'OR : ZÉRO RÉCHAUFFÉ.
Rejette impitoyablement les banalités, les poncifs ou les sujets clichés vus 1000 fois.

Évalue cette publication de psychologie sur 3 critères (0 à 10 chacun) :
1. POTENTIEL VIRAL (/10) : Parle directement à la vie quotidienne des gens (comportement, émotions, relations, travail, sommeil, concentration).
2. SIMPLICITÉ (/10) : Explicable clairement en 30-45s sans jargon incompréhensible.
3. EFFET SURPRISE / CONTRE-INTUITIF (/10) : Découverte inattendue qui remet en cause une croyance commune.

ÉTUDE :
Revue : ${art.journal}
Titre : ${art.titre}
Abstract : ${art.abstract}

Réponds UNIQUEMENT en JSON valide sans markdown :
{
  "score_viral": 8,
  "score_simplicite": 8,
  "score_wow": 9,
  "score_total": 25,
  "justification": "Explication courte en 1 phrase",
  "angle_tiktok": "L'angle d'attaque le plus percutant pour le hook"
}`;

    try {
      const res = await model.generateContent(prompt);
      let jsonText = res.response.text().trim();
      if (jsonText.startsWith("```json")) jsonText = jsonText.slice(7);
      if (jsonText.startsWith("```")) jsonText = jsonText.slice(3);
      if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3);
      const parsed = JSON.parse(jsonText.trim());

      const scoreViral = Number(parsed.score_viral) || 0;
      const scoreSimplicite = Number(parsed.score_simplicite) || 0;
      const scoreWow = Number(parsed.score_wow) || 0;
      const scoreTotal = Number(parsed.score_total) || (scoreViral + scoreSimplicite + scoreWow);

      resultats.push({
        article: art,
        scoreViral,
        scoreSimplicite,
        scoreWow,
        scoreTotal,
        justification: parsed.justification || "",
        angleTikTok: parsed.angle_tiktok || "",
      });

      console.log(`      -> Score : ${scoreTotal}/30 (Viral: ${scoreViral}, Simplicité: ${scoreSimplicite}, Surprise: ${scoreWow})`);
    } catch (err) {
      console.log(`      ⚠️ Erreur scoring : ${err.message}`);
    }

    await pause(500);
  }

  resultats.sort((a, b) => b.scoreTotal - a.scoreTotal);
  return resultats;
}

// ─────────────────────────────────────────────
// 3. RÉDACTION DE LA FICHE DE TOURNAGE
// ─────────────────────────────────────────────
async function redigerFiche(gagnant) {
  console.log(`\n✍️ 3. Rédaction de la fiche de tournage pour l'étude gagnante :`);
  console.log(`   🏆 "${gagnant.article.titre}"`);
  console.log(`   📚 Revue : ${gagnant.article.journal}`);
  console.log(`   📊 Score : ${gagnant.scoreTotal}/30 | Angle : ${gagnant.angleTikTok}\n`);

  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

  const prompt = `Tu es un créateur de contenu TikTok francophone d'élite en psychologie et comportement humain.

Transforme cette étude scientifique réelle en une FICHE DE TOURNAGE TikTok complète et percutante.

INFORMATIONS DE L'ÉTUDE RÉELLE :
- Revue scientifique : ${gagnant.article.journal}
- Titre : ${gagnant.article.titre}
- Résumé : ${gagnant.article.abstract}
- Angle d'attaque : ${gagnant.angleTikTok}

STRUCTURE OBLIGATOIRE :
1. ACCROCHE (0-3s) : Une phrase choc qui stoppe net le scroll. Parle directement au spectateur ("tu").
2. LE CONCEPT (3-10s) : Le phénomène psychologique expliqué avec un exemple du quotidien.
3. LA PREUVE (10-20s) : L'expérience scientifique ou les chiffres réels de l'étude.
4. L'INSIGHT (20-30s) : Ce que le spectateur doit appliquer ou comprendre différemment dans sa vie dès aujourd'hui.
5. LE CTA (30-35s) : Une question stimulante pour créer un débat en commentaires.

Réponds UNIQUEMENT en JSON valide sans markdown :
{
  "titre": "Titre percutant de la vidéo",
  "titre_interne": "Titre court d'organisation",
  "accroche": "La phrase exacte des 3 premières secondes",
  "concept_psy": "L'explication vulgarisée en 2-3 phrases",
  "la_preuve": "La preuve scientifique résumée de l'étude",
  "insight": "L'application concrète pour la vie quotidienne",
  "cta": "L'appel à l'action pour les commentaires",
  "duree_cible": "30s",
  "format": "face caméra",
  "conseil_tournage": "Indication visuelle ou de ton pour le tournage",
  "hashtags": ["#psychologie", "#comportement", "#cerveau", "#relations", "#developpementpersonnel", "#science"]
}`;

  const res = await model.generateContent(prompt);
  let jsonText = res.response.text().trim();
  if (jsonText.startsWith("```json")) jsonText = jsonText.slice(7);
  if (jsonText.startsWith("```")) jsonText = jsonText.slice(3);
  if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3);
  const parsed = JSON.parse(jsonText.trim());

  return {
    titre: parsed.titre || "Sans titre",
    titreInterne: parsed.titre_interne || parsed.titre,
    accroche: parsed.accroche || "",
    conceptPsy: parsed.concept_psy || "",
    laPreuve: parsed.la_preuve || "",
    insight: parsed.insight || "",
    cta: parsed.cta || "",
    dureeCible: parsed.duree_cible || "30s",
    format: parsed.format || "face caméra",
    conseilTournage: parsed.conseil_tournage || "Ton direct et posé face caméra",
    hashtags: parsed.hashtags || ["#psychologie", "#comportement"],
    sourceUrl: gagnant.article.url,
    scoreViral: gagnant.scoreTotal,
    doi: gagnant.article.doi,
    journal: gagnant.article.journal,
  };
}

// ─────────────────────────────────────────────
// 4. ENVOI NOTION
// ─────────────────────────────────────────────
async function envoyerNotion(script) {
  console.log("📤 4. Création de la fiche de tournage dans Notion...");
  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  const databaseId = process.env.NOTION_DATABASE_ID;
  const dateAujourdhui = new Date().toISOString().split("T")[0];

  const blocks = [
    {
      object: "block",
      type: "callout",
      callout: {
        icon: { type: "emoji", emoji: "🧠" },
        rich_text: [
          {
            type: "text",
            text: {
              content: `FICHE DE TOURNAGE | Revue : ${script.journal} | Durée : ${script.dureeCible}\n💡 Conseil réalisateur : ${script.conseilTournage}`,
            },
          },
        ],
      },
    },
    { object: "block", type: "divider", divider: {} },
    {
      object: "block",
      type: "heading_2",
      heading_2: { rich_text: [{ type: "text", text: { content: "🪝 1. ACCROCHE (0-3 secondes)" } }] },
    },
    {
      object: "block",
      type: "quote",
      quote: {
        rich_text: [{ type: "text", text: { content: script.accroche }, annotations: { bold: true } }],
      },
    },
    {
      object: "block",
      type: "heading_2",
      heading_2: { rich_text: [{ type: "text", text: { content: "🧠 2. LE CONCEPT PSY (3-10 secondes)" } }] },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: [{ type: "text", text: { content: script.conceptPsy } }] },
    },
    {
      object: "block",
      type: "heading_2",
      heading_2: { rich_text: [{ type: "text", text: { content: "📊 3. LA PREUVE SCIENTIFIQUE (10-20 secondes)" } }] },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: [{ type: "text", text: { content: script.laPreuve } }] },
    },
    {
      object: "block",
      type: "heading_2",
      heading_2: { rich_text: [{ type: "text", text: { content: "💡 4. L'INSIGHT (20-30 secondes)" } }] },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: [{ type: "text", text: { content: script.insight } }] },
    },
    {
      object: "block",
      type: "heading_2",
      heading_2: { rich_text: [{ type: "text", text: { content: "❓ 5. APPEL À L'ACTION (30-35 secondes)" } }] },
    },
    {
      object: "block",
      type: "quote",
      quote: { rich_text: [{ type: "text", text: { content: script.cta } }] },
    },
    { object: "block", type: "divider", divider: {} },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: `🏷️ Hashtags : ${script.hashtags.join(" ")}\n📚 Revue scientifique : ${script.journal}\n🔗 Source officielle : ${script.sourceUrl}\n📝 DOI : ${script.doi}` },
          },
        ],
      },
    },
  ];

  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      Titre: { title: [{ text: { content: script.titre } }] },
      Accroche: { rich_text: [{ text: { content: script.accroche } }] },
      "Concept Psy": { rich_text: [{ text: { content: script.conceptPsy } }] },
      "La Preuve": { rich_text: [{ text: { content: script.laPreuve } }] },
      Insight: { rich_text: [{ text: { content: script.insight } }] },
      CTA: { rich_text: [{ text: { content: script.cta } }] },
      "Durée Cible": { select: { name: script.dureeCible } },
      Format: { select: { name: script.format } },
      Hashtags: { rich_text: [{ text: { content: script.hashtags.join(" ") } }] },
      Source: { url: script.sourceUrl },
      "Score Viral": { number: script.scoreViral },
      Date: { date: { start: dateAujourdhui } },
      Statut: { status: { name: "Nouveau" } },
      DOI: { rich_text: [{ text: { content: script.doi } }] },
    },
    children: blocks,
  });

  console.log(`   ✅ Fiche de tournage créée avec succès dans Notion !`);
  console.log(`   🔗 ID de la page : ${page.id}\n`);
}

async function main() {
  const articles = await collecterEtudes();
  if (articles.length === 0) return;

  const resultats = await scorerEtudes(articles);
  if (resultats.length === 0) return;

  const gagnant = resultats[0];
  const script = await redigerFiche(gagnant);

  await envoyerNotion(script);

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("🎉 PIPELINE QUOTIDIEN TERMINÉ AVEC SUCCÈS !");
  console.log("═══════════════════════════════════════════════════════════════");
}

main().catch(console.error);
