/**
 * 🧠 VEILLE PSYCHO → SCRIPTS TIKTOK
 *
 * Tâche principale Trigger.dev — le cœur du pipeline.
 * Se déclenche automatiquement chaque dimanche à 16h (heure française).
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
import { pushToNotion, isDuplicate, pushBacklogToNotion } from "../services/notion.js";
import type { Article } from "../types/index.js";

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/** Score minimum pour qu'un article soit sélectionné (sur 30 = 3 critères × 10) */
const SCORE_MINIMUM = 21;

// ═══════════════════════════════════════════════════════════════
// TÂCHE PLANIFIÉE — CRON DIMANCHE 16H (HEURE FRANÇAISE, 1 SCRIPT/SEM)
// ═══════════════════════════════════════════════════════════════

export const veillePsychoTask = schedules.task({
  id: "veille-psycho-tiktok",
  // Cron : 15h UTC = 16h heure française (CET+1) / 17h en été (CEST+2)
  // Ajuste selon la saison si besoin
  cron: "0 15 * * 0",
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
    console.log(`   🪝 Accroche : "${script.accroche1}"`);
    console.log(`   ⏱️ Durée cible : ${script.dureeCible}`);
    console.log(`   🎬 Format : ${script.format}`);
    console.log(`   #️⃣ Hashtags : ${script.hashtags.join(" ")}`);

    // ─────────────────────────────────────────────
    // ÉTAPE 5b : Sauvegarde du Top 3 en backlog
    // ─────────────────────────────────────────────
    console.log("\n📋 Étape 5b — Sauvegarde des articles #2 et #3 en backlog Notion...");

    const backlogArticles = resultatsScoring.slice(1, 3);
    for (const backlogItem of backlogArticles) {
      if (backlogItem.scoreTotal >= SCORE_MINIMUM) {
        await pushBacklogToNotion(backlogItem);
      }
    }
    console.log(`   ✅ ${backlogArticles.filter(b => b.scoreTotal >= SCORE_MINIMUM).length} article(s) backlog sauvegardé(s)`);

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
