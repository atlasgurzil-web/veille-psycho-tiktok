/**
 * Service de scoring — Évalue le potentiel TikTok de chaque article via Gemini Flash.
 *
 * Envoie chaque article à Gemini 2.0 Flash pour obtenir un score sur 3 critères :
 * potentiel viral, simplicité d'explication et effet wow.
 * Les articles sont ensuite triés par score total décroissant.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Article, ScoreResult } from "../types/index.js";
import { buildScoringPrompt } from "../prompts/scoring-prompt.js";

/**
 * Pause utilitaire — respecte les limites de débit de l'API Gemini.
 *
 * @param ms - Durée de la pause en millisecondes
 */
function attendre(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Nettoie la réponse de Gemini pour extraire le JSON.
 * Gemini ajoute parfois des backticks ou du texte autour du JSON.
 *
 * @param texte - La réponse brute de Gemini
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
 * Fonction principale — Score tous les articles avec Gemini Flash.
 * Chaque article est évalué individuellement avec une pause de 500ms entre les appels.
 * Les articles qui échouent au parsing sont silencieusement ignorés.
 *
 * @param articles - Liste des articles à évaluer
 * @returns Liste des résultats de scoring, triée par score total décroissant
 */
export async function scoreArticles(
  articles: Article[]
): Promise<ScoreResult[]> {
  console.log(
    `[Scoring] 🚀 Début du scoring de ${articles.length} articles avec Gemini Flash...`
  );

  /* Vérifie que la clé API est configurée */
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.log(
      "[Scoring] ❌ GOOGLE_AI_API_KEY manquante ! Configurez-la dans votre fichier .env"
    );
    return [];
  }

  /* Initialise le client Gemini */
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

  const resultats: ScoreResult[] = [];

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i]!;
    console.log(
      `[Scoring] 📊 Évaluation ${i + 1}/${articles.length} : "${article.titre.slice(0, 60)}..."`
    );

    try {
      /* Construit le prompt et appelle Gemini */
      const prompt = buildScoringPrompt(article.titre, article.abstract);
      const resultat = await model.generateContent(prompt);
      const reponse = resultat.response.text();

      /* Nettoie et parse la réponse JSON */
      const jsonPropre = nettoyerReponseJSON(reponse);
      const scores = JSON.parse(jsonPropre);

      /* Valide que les scores sont bien des nombres */
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
        `[Scoring] ✅ Score total : ${scoreTotal}/30 (viral: ${scoreViral}, simplicité: ${scoreSimplicite}, wow: ${scoreWow})`
      );
    } catch (erreur) {
      /* En cas d'erreur (JSON invalide, erreur API...), on ignore l'article */
      console.log(
        `[Scoring] ⚠️ Impossible de scorer l'article "${article.titre.slice(0, 50)}..." — ${erreur}`
      );
      console.log(
        "[Scoring] ℹ️ Cet article sera ignoré et on passe au suivant"
      );
    }

    /* Pause de 500ms entre les appels pour respecter les limites Gemini */
    if (i < articles.length - 1) {
      await attendre(500);
    }
  }

  /* Trie les résultats par score total décroissant (meilleurs en premier) */
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
