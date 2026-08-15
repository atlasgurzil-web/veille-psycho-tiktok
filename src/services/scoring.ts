/**
 * Service de scoring — Évalue le potentiel TikTok de chaque article.
 *
 * Utilise en priorité Groq (Llama 3.3 70B) pour un scoring ultra-rapide et illimité,
 * avec bascule automatique (fallback) sur Google Gemini Flash si Groq n'est pas disponible.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Article, ScoreResult } from "../types/index.js";
import { buildScoringPrompt } from "../prompts/scoring-prompt.js";

/**
 * Pause utilitaire.
 *
 * @param ms - Durée de la pause en millisecondes
 */
function attendre(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Nettoie la réponse IA pour extraire le JSON.
 *
 * @param texte - La réponse brute
 * @returns Le texte nettoyé, prêt à être parsé en JSON
 */
function nettoyerReponseJSON(texte: string): string {
  let propre = texte.trim();

  /* Supprime les blocs de code markdown si présents */
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
 * Évalue un article via l'API Groq (Llama 3.3 70B).
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
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
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
  if (!content) {
    throw new Error("Réponse vide de Groq");
  }

  return JSON.parse(nettoyerReponseJSON(content));
}

/**
 * Évalue un article via Google AI Studio (Gemini Flash) - Fallback.
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
 * Fonction principale — Score tous les articles.
 *
 * Utilise Groq en priorité pour scorer rapidement sans épuiser les quotas Gemini.
 *
 * @param articles - Liste des articles à évaluer
 * @returns Liste des résultats de scoring, triée par score total décroissant
 */
export async function scoreArticles(
  articles: Article[]
): Promise<ScoreResult[]> {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GOOGLE_AI_API_KEY;

  const providerPrincipal = groqKey ? "Groq (Llama 3.3 70B)" : "Gemini Flash";
  console.log(
    `[Scoring] 🚀 Début du scoring de ${articles.length} articles via ${providerPrincipal}...`
  );

  const pauseEntreAppels = groqKey ? 1000 : 6000;
  const tempsEstime = Math.ceil((articles.length * (pauseEntreAppels / 1000)) / 60);
  console.log(
    `[Scoring] ⏱️ Temps estimé : ~${tempsEstime || 1} minute(s) (pause de ${pauseEntreAppels / 1000}s)`
  );

  const resultats: ScoreResult[] = [];

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i]!;
    console.log(
      `[Scoring] 📊 Évaluation ${i + 1}/${articles.length} : "${article.titre.slice(0, 60)}..."`
    );

    let reussi = false;

    // Tentative 1 : Groq si configuré
    if (groqKey && !reussi) {
      try {
        const scores = await scorerAvecGroq(groqKey, article.titre, article.abstract);

        const scoreViral = Number(scores.score_viral) || 0;
        const scoreSimplicite = Number(scores.score_simplicite) || 0;
        const scoreWow = Number(scores.score_wow) || 0;
        const scoreTotal = Number(scores.score_total) || (scoreViral + scoreSimplicite + scoreWow);

        resultats.push({
          article,
          scoreViral,
          scoreSimplicite,
          scoreWow,
          scoreTotal,
          justification: scores.justification || "Pas de justification fournie",
          angleTikTok: scores.angle_tiktok || "Angle non précisé",
        });

        console.log(
          `[Scoring] ✅ [Groq] Score : ${scoreTotal}/30 (viral: ${scoreViral}, simplicité: ${scoreSimplicite}, wow: ${scoreWow})`
        );
        reussi = true;
      } catch (errGroq: any) {
        console.log(
          `[Scoring] ⚠️ Échec Groq pour "${article.titre.slice(0, 40)}..." (${errGroq?.message || errGroq}) — Bascule sur Gemini...`
        );
      }
    }

    // Tentative 2 / Fallback : Gemini
    if (!reussi && geminiKey) {
      try {
        const scores = await scorerAvecGemini(geminiKey, article.titre, article.abstract);

        const scoreViral = Number(scores.score_viral) || 0;
        const scoreSimplicite = Number(scores.score_simplicite) || 0;
        const scoreWow = Number(scores.score_wow) || 0;
        const scoreTotal = Number(scores.score_total) || (scoreViral + scoreSimplicite + scoreWow);

        resultats.push({
          article,
          scoreViral,
          scoreSimplicite,
          scoreWow,
          scoreTotal,
          justification: scores.justification || "Pas de justification fournie",
          angleTikTok: scores.angle_tiktok || "Angle non précisé",
        });

        console.log(
          `[Scoring] ✅ [Gemini] Score : ${scoreTotal}/30`
        );
        reussi = true;
      } catch (errGemini: any) {
        console.log(
          `[Scoring] ❌ Échec Gemini pour "${article.titre.slice(0, 40)}..." : ${errGemini?.message || errGemini}`
        );
      }
    }

    if (!reussi) {
      console.log(`[Scoring] ℹ️ Article ignoré`);
    }

    // Pause respectueuse des API
    if (i < articles.length - 1) {
      await attendre(pauseEntreAppels);
    }
  }

  /* Trie les résultats par score total décroissant */
  resultats.sort((a, b) => b.scoreTotal - a.scoreTotal);

  console.log(
    `[Scoring] 🏁 Scoring terminé : ${resultats.length}/${articles.length} articles évalués avec succès`
  );

  if (resultats.length > 0) {
    const top = resultats[0]!;
    console.log(
      `[Scoring] 🏆 Meilleur article : "${top.article.titre.slice(0, 60)}..." — Score : ${top.scoreTotal}/30`
    );
  }

  return resultats;
}
