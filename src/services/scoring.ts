/**
 * Service de scoring — Évalue le potentiel TikTok de chaque article.
 *
 * Utilise en priorité Groq (Llama 3.3 70B) avec traitement concurrent (4 par 4)
 * pour un scoring ultra-rapide en moins de 10 secondes.
 * Bascule automatique sur Google Gemini 3.7 Flash si besoin.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Article, ScoreResult } from "../types/index.js";
import { buildScoringPrompt } from "../prompts/scoring-prompt.js";
import { ENV } from "../config/env.js";

/**
 * Pause utilitaire.
 */
function attendre(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Nettoie la réponse IA pour extraire le JSON.
 */
function nettoyerReponseJSON(texte: string): string {
  let propre = texte.trim();
  if (propre.startsWith("```json")) {
    propre = propre.slice(7);
  } else if (propre.startsWith("```")) {
    propre = propre.slice(3);
  }
  if (propre.endsWith("```")) {
    propre = propre.slice(0, -3);
  }
  return propre.trim();
}

/**
 * Évalue un article via Groq (Llama 3.3 70B).
 */
async function scorerAvecGroq(
  apiKey: string,
  titre: string,
  abstract: string
): Promise<any> {
  const prompt = buildScoringPrompt(titre, abstract);

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq HTTP ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Réponse vide de Groq");

  return JSON.parse(nettoyerReponseJSON(content));
}

/**
 * Évalue un article via Google AI Studio (Gemini 3.7 Flash) - Fallback.
 */
async function scorerAvecGemini(
  apiKey: string,
  titre: string,
  abstract: string
): Promise<any> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.7-flash" });
  const prompt = buildScoringPrompt(titre, abstract);
  const resultat = await model.generateContent(prompt);
  const reponse = resultat.response.text();
  return JSON.parse(nettoyerReponseJSON(reponse));
}

/**
 * Score un article unique avec gestion du fallback Groq -> Gemini.
 */
async function evaluerArticleIndividuel(
  article: Article,
  groqKey?: string,
  geminiKey?: string
): Promise<ScoreResult | null> {
  // 1. Tente Groq en priorité
  if (groqKey) {
    try {
      const scores = await scorerAvecGroq(groqKey, article.titre, article.abstract);
      const scoreViral = Number(scores.score_viral) || 0;
      const scoreSimplicite = Number(scores.score_simplicite) || 0;
      const scoreWow = Number(scores.score_wow) || 0;
      const scoreTotal = Number(scores.score_total) || (scoreViral + scoreSimplicite + scoreWow);

      return {
        article,
        scoreViral,
        scoreSimplicite,
        scoreWow,
        scoreTotal,
        justification: scores.justification || "Pas de justification fournie",
        angleTikTok: scores.angle_tiktok || "Angle non précisé",
      };
    } catch {
      // Échec silencieux pour basculer sur Gemini
    }
  }

  // 2. Fallback sur Gemini
  if (geminiKey) {
    try {
      const scores = await scorerAvecGemini(geminiKey, article.titre, article.abstract);
      const scoreViral = Number(scores.score_viral) || 0;
      const scoreSimplicite = Number(scores.score_simplicite) || 0;
      const scoreWow = Number(scores.score_wow) || 0;
      const scoreTotal = Number(scores.score_total) || (scoreViral + scoreSimplicite + scoreWow);

      return {
        article,
        scoreViral,
        scoreSimplicite,
        scoreWow,
        scoreTotal,
        justification: scores.justification || "Pas de justification fournie",
        angleTikTok: scores.angle_tiktok || "Angle non précisé",
      };
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Fonction principale — Score tous les articles à haute vitesse (parallélisé par lots).
 *
 * @param articles - Liste des articles à évaluer
 * @returns Liste des résultats de scoring, triée par score total décroissant
 */
export async function scoreArticles(
  articles: Article[]
): Promise<ScoreResult[]> {
  const groqKey = ENV.GROQ_API_KEY;
  const geminiKey = ENV.GOOGLE_AI_API_KEY;

  console.log(
    `[Scoring] ⚡ Démarrage du scoring turbo de ${articles.length} articles (traitement parallèle)...`
  );

  const tailleLot = groqKey ? 4 : 1; // 4 articles simultanés sur Groq, 1 sur Gemini seul
  const resultats: ScoreResult[] = [];

  for (let i = 0; i < articles.length; i += tailleLot) {
    const lot = articles.slice(i, i + tailleLot);
    const indexFin = Math.min(i + tailleLot, articles.length);
    console.log(`[Scoring] 📊 Évaluation lot ${Math.floor(i / tailleLot) + 1} (articles ${i + 1} à ${indexFin}/${articles.length})...`);

    const resultatsLot = await Promise.all(
      lot.map((article) => evaluerArticleIndividuel(article, groqKey, geminiKey))
    );

    for (const res of resultatsLot) {
      if (res) {
        resultats.push(res);
        console.log(`   ✅ [${res.scoreTotal}/30] ${res.article.titre.slice(0, 55)}...`);
      }
    }

    // Micro-pause pour respecter le rate-limit
    if (i + tailleLot < articles.length) {
      await attendre(groqKey ? 400 : 5000);
    }
  }

  // Trie par score décroissant
  resultats.sort((a, b) => b.scoreTotal - a.scoreTotal);

  console.log(
    `[Scoring] 🏁 Scoring turbo terminé : ${resultats.length}/${articles.length} articles évalués avec succès`
  );

  if (resultats.length > 0) {
    const top = resultats[0]!;
    console.log(
      `[Scoring] 🏆 Meilleur article : "${top.article.titre.slice(0, 60)}..." — Score : ${top.scoreTotal}/30`
    );
  }

  return resultats;
}
