/**
 * Service de génération de scripts TikTok — Transforme un article scoré en script prêt à tourner.
 *
 * Utilise Gemini en priorité pour un style francophone soigné,
 * avec bascule automatique sur Groq (Llama 3.3 70B) en cas de quota atteint ou d'indisponibilité.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ScoreResult, TikTokScript } from "../types/index.js";
import { buildScriptPrompt } from "../prompts/script-prompt.js";
import { ENV } from "../config/env.js";

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
 * Valide et normalise la durée cible du script.
 *
 * @param duree - La durée brute renvoyée par l'IA
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
 * @param format - Le format brut renvoyé par l'IA
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
 * Génère le script via Groq en fallback.
 */
async function genererAvecGroq(apiKey: string, prompt: string): Promise<string> {
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
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Groq HTTP ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * Fonction principale — Génère un script TikTok complet à partir d'un article scoré.
 *
 * @param scoreResult - Le résultat de scoring contenant l'article et l'angle suggéré
 * @returns Le script TikTok structuré, prêt à être envoyé sur Notion
 */
export async function generateScript(
  scoreResult: ScoreResult
): Promise<TikTokScript> {
  console.log(
    `[Script] 🎬 Génération du script pour : "${scoreResult.article.titre.slice(0, 60)}..."`
  );

  const geminiKey = ENV.GOOGLE_AI_API_KEY;
  const groqKey = ENV.GROQ_API_KEY;

  if (!geminiKey && !groqKey) {
    throw new Error(
      "[Script] ❌ Aucune clé API configurée (GOOGLE_AI_API_KEY ou GROQ_API_KEY) !"
    );
  }

  const prompt = buildScriptPrompt(
    scoreResult.article.titre,
    scoreResult.article.abstract,
    scoreResult.angleTikTok
  );

  let reponse = "";
  let source = "Gemini";

  // Tentative 1 : Gemini
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.7-flash" });
      const resultat = await model.generateContent(prompt);
      reponse = resultat.response.text();
    } catch (errGemini: any) {
      console.log(
        `[Script] ⚠️ Gemini indisponible ou quota dépassé (${errGemini?.message?.slice(0, 80)}...) — Bascule sur Groq...`
      );
    }
  }

  // Tentative 2 : Groq en fallback
  if (!reponse && groqKey) {
    try {
      reponse = await genererAvecGroq(groqKey, prompt);
      source = "Groq (Llama 3.3 70B)";
    } catch (errGroq: any) {
      console.log(`[Script] ❌ Échec Groq également : ${errGroq?.message || errGroq}`);
    }
  }

  if (!reponse) {
    throw new Error(
      `[Script] Impossible de générer le script avec les fournisseurs disponibles.`
    );
  }

  /* Nettoie et parse la réponse JSON */
  const jsonPropre = nettoyerReponseJSON(reponse);
  const scriptBrut = JSON.parse(jsonPropre);

  /* Mappe la réponse vers notre type TikTokScript */
  const script: TikTokScript = {
    titre: scriptBrut.titre || "Sans titre",
    accroche1: scriptBrut.accroche_1 || scriptBrut.accroche || "",
    accroche2: scriptBrut.accroche_2 || "",
    accroche3: scriptBrut.accroche_3 || "",
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

  console.log(`[Script] ✅ Script généré via ${source} : "${script.titreInterne}"`);
  console.log(`[Script] 🔥 Hook 1 : "${script.accroche1}"`);
  console.log(`[Script] 💥 Hook 2 : "${script.accroche2}"`);
  console.log(`[Script] 👁️ Hook 3 : "${script.accroche3}"`);
  console.log(
    `[Script] 📏 Durée cible : ${script.dureeCible} | Format : ${script.format}`
  );

  return script;
}
