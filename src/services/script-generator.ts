/**
 * Service de génération de scripts TikTok — Transforme un article scoré en script prêt à tourner.
 *
 * Utilise Gemini 2.0 Flash pour générer un script TikTok structuré en français,
 * à partir de l'article et de l'angle suggéré par le scoring.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ScoreResult, TikTokScript } from "../types/index.js";
import { buildScriptPrompt } from "../prompts/script-prompt.js";

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
 * Valide et normalise la durée cible du script.
 *
 * @param duree - La durée brute renvoyée par Gemini
 * @returns La durée normalisée ("15s", "30s" ou "60s")
 */
function normaliserDuree(duree: string): "15s" | "30s" | "60s" {
  const propre = duree?.toLowerCase().trim() ?? "";
  if (propre.includes("15")) return "15s";
  if (propre.includes("60")) return "60s";
  return "30s"; /* Par défaut, 30 secondes */
}

/**
 * Valide et normalise le format de tournage.
 *
 * @param format - Le format brut renvoyé par Gemini
 * @returns Le format normalisé
 */
function normaliserFormat(
  format: string
): "face caméra" | "voix off" | "green screen" {
  const propre = format?.toLowerCase().trim() ?? "";
  if (propre.includes("voix")) return "voix off";
  if (propre.includes("green")) return "green screen";
  return "face caméra"; /* Par défaut, face caméra */
}

/**
 * Fonction principale — Génère un script TikTok complet à partir d'un article scoré.
 *
 * @param scoreResult - Le résultat de scoring contenant l'article et l'angle suggéré
 * @returns Le script TikTok structuré, prêt à être envoyé sur Notion
 * @throws Error si la génération échoue (erreur API ou JSON invalide)
 */
export async function generateScript(
  scoreResult: ScoreResult
): Promise<TikTokScript> {
  console.log(
    `[Script] 🎬 Génération du script pour : "${scoreResult.article.titre.slice(0, 60)}..."`
  );

  /* Vérifie que la clé API est configurée */
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[Script] ❌ GOOGLE_AI_API_KEY manquante ! Configurez-la dans votre fichier .env"
    );
  }

  /* Initialise le client Gemini */
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

  try {
    /* Construit le prompt avec les infos de l'article et l'angle suggéré */
    const prompt = buildScriptPrompt(
      scoreResult.article.titre,
      scoreResult.article.abstract,
      scoreResult.angleTikTok
    );

    /* Appelle Gemini pour générer le script */
    const resultat = await model.generateContent(prompt);
    const reponse = resultat.response.text();

    /* Nettoie et parse la réponse JSON */
    const jsonPropre = nettoyerReponseJSON(reponse);
    const scriptBrut = JSON.parse(jsonPropre);

    /* Mappe la réponse vers notre type TikTokScript */
    const script: TikTokScript = {
      titre: scriptBrut.titre || "Sans titre",
      accroche: scriptBrut.accroche || "",
      conceptPsy: scriptBrut.concept_psy || "",
      laPreuve: scriptBrut.la_preuve || "",
      insight: scriptBrut.insight || "",
      cta: scriptBrut.cta || "",
      dureeCible: normaliserDuree(scriptBrut.duree_cible),
      format: normaliserFormat(scriptBrut.format),
      conseilTournage: scriptBrut.conseil_tournage || "Face caméra avec un ton direct et calme",
      hashtags: Array.isArray(scriptBrut.hashtags)
        ? scriptBrut.hashtags
        : [],
      titreInterne: scriptBrut.titre_interne || scriptBrut.titre || "Sans titre",
      sourceUrl: scoreResult.article.url,
      doi: scoreResult.article.doi,
      scoreViral: scoreResult.scoreTotal,
    };

    console.log(`[Script] ✅ Script généré : "${script.titreInterne}"`);
    console.log(
      `[Script] 📏 Durée cible : ${script.dureeCible} | Format : ${script.format}`
    );
    console.log(`[Script] #️⃣ Hashtags : ${script.hashtags.join(" ")}`);

    return script;
  } catch (erreur) {
    console.log(
      `[Script] ❌ Erreur lors de la génération du script : ${erreur}`
    );
    throw new Error(
      `[Script] Impossible de générer le script pour "${scoreResult.article.titre.slice(0, 50)}..." — ${erreur}`
    );
  }
}
