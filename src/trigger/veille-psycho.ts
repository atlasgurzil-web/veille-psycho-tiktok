/**
 * 🧠 VEILLE PSYCHO → SCRIPTS TIKTOK
 *
 * Tâche principale Trigger.dev — le cœur du pipeline.
 * Se déclenche automatiquement du lundi au vendredi à 7h (heure française).
 *
 * Étapes :
 * 1. Récupère les publications récentes (PubMed + APA RSS)
 * 2. Déduplique contre la base Notion
 * 3. Score chaque article avec Gemini Flash
 * 4. Sélectionne le meilleur (score ≥ 7/10)
 * 5. Génère un script TikTok avec Gemini Pro
 * 6. Pousse le script dans Notion
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { fetchPubMedArticles } from "../services/pubmed.js";
import { fetchAPAArticles } from "../services/apa-rss.js";
import { scoreArticles } from "../services/scoring.js";
import { generateScript } from "../services/script-generator.js";
import { pushToNotion, isDuplicate } from "../services/notion.js";
import type { Article } from "../types/index.js";

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/** Score minimum pour qu'un article soit sélectionné (sur 30 = 3 critères × 10) */
const SCORE_MINIMUM = 21;

// ═══════════════════════════════════════════════════════════════
// TÂCHE PLANIFIÉE — CRON LUN-VEN 7H (HEURE FRANÇAISE)
// ═══════════════════════════════════════════════════════════════

export const veillePsychoTask = schedules.task({
  id: "veille-psycho-tiktok",
  // Cron : 6h UTC = 7h heure française (CET+1) / 8h en été (CEST+2)
  // Ajuste selon la saison si besoin
  cron: "0 6 * * 1-5",
  run: async () => {
    console.log("🧠 ═══════════════════════════════════════════════");
    console.log("🧠 Démarrage de la veille psycho — Scripts TikTok");
    console.log("🧠 ═══════════════════════════════════════════════");
    console.log(`📅 Date : ${new Date().toLocaleDateString("fr-FR")}`);
    console.log(`⏰ Heure : ${new Date().toLocaleTimeString("fr-FR")}`);

    // ─────────────────────────────────────────────
    // ÉTAPE 1 : Récupération des publications
    // ─────────────────────────────────────────────
    console.log("\n📥 Étape 1 — Récupération des publications...");

    const [pubmedArticles, apaArticles] = await Promise.all([
      fetchPubMedArticles(),
      fetchAPAArticles(),
    ]);

    // Fusion des deux sources
    const tousLesArticles: Article[] = [...pubmedArticles, ...apaArticles];
    console.log(
      `   ✅ ${pubmedArticles.length} articles PubMed + ${apaArticles.length} articles APA = ${tousLesArticles.length} au total`
    );

    if (tousLesArticles.length === 0) {
      console.log("   ⚠️ Aucun article trouvé. Fin du pipeline.");
      return { statut: "aucun_article", scriptsGeneres: 0 };
    }

    // ─────────────────────────────────────────────
    // ÉTAPE 2 : Déduplication contre Notion
    // ─────────────────────────────────────────────
    console.log("\n🔄 Étape 2 — Déduplication contre Notion...");

    const articlesNouveaux: Article[] = [];

    for (const article of tousLesArticles) {
      // Vérifie si le DOI existe déjà dans Notion
      const dejaTraite = await isDuplicate(article.doi);
      if (!dejaTraite) {
        articlesNouveaux.push(article);
      }
    }

    console.log(
      `   ✅ ${articlesNouveaux.length} articles nouveaux (${tousLesArticles.length - articlesNouveaux.length} doublons ignorés)`
    );

    if (articlesNouveaux.length === 0) {
      console.log(
        "   ⚠️ Tous les articles ont déjà été traités. Fin du pipeline."
      );
      return { statut: "tous_dupliques", scriptsGeneres: 0 };
    }

    // ─────────────────────────────────────────────
    // ÉTAPE 3 : Scoring IA (Gemini Flash)
    // ─────────────────────────────────────────────
    console.log("\n⭐ Étape 3 — Scoring des articles avec Gemini Flash...");

    const resultatsScoring = await scoreArticles(articlesNouveaux);

    console.log(`   ✅ ${resultatsScoring.length} articles scorés`);

    // Affiche le top 5
    console.log("   📊 Top 5 :");
    resultatsScoring.slice(0, 5).forEach((r, i) => {
      console.log(
        `      ${i + 1}. [${r.scoreTotal}/30] ${r.article.titre.substring(0, 60)}...`
      );
    });

    // ─────────────────────────────────────────────
    // ÉTAPE 4 : Filtrage — on garde le meilleur
    // ─────────────────────────────────────────────
    console.log("\n✂️ Étape 4 — Sélection du meilleur article...");

    const meilleur = resultatsScoring[0];

    if (!meilleur || meilleur.scoreTotal < SCORE_MINIMUM) {
      console.log(
        `   ⚠️ Aucun article ne dépasse le seuil de ${SCORE_MINIMUM}/30.`
      );
      console.log(
        `   Le meilleur score est ${meilleur?.scoreTotal ?? 0}/30.`
      );
      console.log("   Pas de script généré aujourd'hui — pas de contenu médiocre !");
      return {
        statut: "score_insuffisant",
        meilleurScore: meilleur?.scoreTotal ?? 0,
        scriptsGeneres: 0,
      };
    }

    console.log(`   🏆 Sélectionné : "${meilleur.article.titre}"`);
    console.log(`   📊 Score : ${meilleur.scoreTotal}/30`);
    console.log(`   🎯 Angle TikTok : ${meilleur.angleTikTok}`);

    // ─────────────────────────────────────────────
    // ÉTAPE 5 : Génération du script (Gemini Pro)
    // ─────────────────────────────────────────────
    console.log("\n✍️ Étape 5 — Génération du script TikTok...");

    const script = await generateScript(meilleur);

    console.log(`   ✅ Script généré : "${script.titreInterne}"`);
    console.log(`   🪝 Accroche : "${script.accroche}"`);
    console.log(`   ⏱️ Durée cible : ${script.dureeCible}`);
    console.log(`   🎬 Format : ${script.format}`);
    console.log(`   #️⃣ Hashtags : ${script.hashtags.join(" ")}`);

    // ─────────────────────────────────────────────
    // ÉTAPE 6 : Push vers Notion
    // ─────────────────────────────────────────────
    console.log("\n📤 Étape 6 — Envoi vers Notion...");

    await pushToNotion(script);

    console.log("   ✅ Script pushé dans Notion !");
    console.log("\n🧠 ═══════════════════════════════════════════════");
    console.log("🧠 Pipeline terminé avec succès ! 🎉");
    console.log("🧠 ═══════════════════════════════════════════════");
    console.log(`\n   📝 Ouvre Notion et cherche : "${script.titreInterne}"`);
    console.log("   🎬 Il te reste plus qu'à tourner !");

    return {
      statut: "succes",
      scriptsGeneres: 1,
      titre: script.titreInterne,
      scoreViral: script.scoreViral,
      dureeCible: script.dureeCible,
      format: script.format,
    };
  },
});
