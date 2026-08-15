/**
 * Service Notion — Envoie les scripts TikTok sur Notion via l'API officielle.
 *
 * Crée les pages de scripts avec une fiche de tournage structurée
 * directement dans le corps de la page pour une lecture facile sur mobile/desktop.
 */

import { Client } from "@notionhq/client";
import type { TikTokScript, ScoreResult } from "../types/index.js";

/**
 * Initialise le client Notion avec la clé API.
 *
 * @returns L'instance Notion configurée
 */
function initialiserNotion(): Client {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[Notion] ❌ NOTION_API_KEY manquante ! Configurez-la dans votre fichier .env"
    );
  }

  return new Client({ auth: apiKey });
}

/**
 * Récupère l'ID de la base de données Notion depuis l'environnement.
 *
 * @returns L'identifiant de la base de données Notion
 */
function obtenirDatabaseId(): string {
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!databaseId) {
    throw new Error(
      "[Notion] ❌ NOTION_DATABASE_ID manquant ! Configurez-le dans votre fichier .env"
    );
  }
  return databaseId;
}

/**
 * Construit les blocs visuels pour le corps de la page Notion (Fiche de tournage).
 *
 * @param script - Le script complet à formater
 * @returns Tableau de blocs au format Notion
 */
function construireBlocsPage(script: TikTokScript) {
  return [
    // En-tête / Callout de tournage
    {
      object: "block" as const,
      type: "callout" as const,
      callout: {
        icon: { type: "emoji" as const, emoji: "🎬" },
        rich_text: [
          {
            type: "text" as const,
            text: {
              content: `FICHE DE TOURNAGE | Format : ${script.format.toUpperCase()} | Durée : ${script.dureeCible}\n💡 Conseil : ${script.conseilTournage || "Ton direct et posé"}`,
            },
          },
        ],
      },
    },
    { object: "block" as const, type: "divider" as const, divider: {} },

    // 1. Accroche
    {
      object: "block" as const,
      type: "heading_2" as const,
      heading_2: {
        rich_text: [
          {
            type: "text" as const,
            text: { content: "🪝 1. ACCROCHE (0-3 secondes)" },
          },
        ],
      },
    },
    {
      object: "block" as const,
      type: "callout" as const,
      callout: {
        icon: { type: "emoji" as const, emoji: "🔥" },
        rich_text: [
          {
            type: "text" as const,
            text: { content: script.accroche1 },
            annotations: { bold: true },
          },
        ],
      },
    },
    {
      object: "block" as const,
      type: "callout" as const,
      callout: {
        icon: { type: "emoji" as const, emoji: "💥" },
        rich_text: [
          {
            type: "text" as const,
            text: { content: script.accroche2 },
            annotations: { bold: true },
          },
        ],
      },
    },
    {
      object: "block" as const,
      type: "callout" as const,
      callout: {
        icon: { type: "emoji" as const, emoji: "👁️" },
        rich_text: [
          {
            type: "text" as const,
            text: { content: script.accroche3 },
            annotations: { bold: true },
          },
        ],
      },
    },

    // 2. Le Concept
    {
      object: "block" as const,
      type: "heading_2" as const,
      heading_2: {
        rich_text: [
          {
            type: "text" as const,
            text: { content: "🧠 2. LE CONCEPT PSY (3-10 secondes)" },
          },
        ],
      },
    },
    {
      object: "block" as const,
      type: "paragraph" as const,
      paragraph: {
        rich_text: [
          {
            type: "text" as const,
            text: { content: script.conceptPsy },
          },
        ],
      },
    },

    // 3. La Preuve
    {
      object: "block" as const,
      type: "heading_2" as const,
      heading_2: {
        rich_text: [
          {
            type: "text" as const,
            text: { content: "📊 3. LA PREUVE SCIENTIFIQUE (10-20 secondes)" },
          },
        ],
      },
    },
    {
      object: "block" as const,
      type: "paragraph" as const,
      paragraph: {
        rich_text: [
          {
            type: "text" as const,
            text: { content: script.laPreuve },
          },
        ],
      },
    },

    // 4. L'Insight
    {
      object: "block" as const,
      type: "heading_2" as const,
      heading_2: {
        rich_text: [
          {
            type: "text" as const,
            text: { content: "💡 4. L'INSIGHT / CE QUE ÇA CHANGE (20-30 secondes)" },
          },
        ],
      },
    },
    {
      object: "block" as const,
      type: "paragraph" as const,
      paragraph: {
        rich_text: [
          {
            type: "text" as const,
            text: { content: script.insight },
          },
        ],
      },
    },

    // 5. Call To Action
    {
      object: "block" as const,
      type: "heading_2" as const,
      heading_2: {
        rich_text: [
          {
            type: "text" as const,
            text: { content: "❓ 5. APPEL À L'ACTION (30-35 secondes)" },
          },
        ],
      },
    },
    {
      object: "block" as const,
      type: "quote" as const,
      quote: {
        rich_text: [
          {
            type: "text" as const,
            text: { content: script.cta },
          },
        ],
      },
    },

    { object: "block" as const, type: "divider" as const, divider: {} },

    // Hashtags & Source
    {
      object: "block" as const,
      type: "paragraph" as const,
      paragraph: {
        rich_text: [
          {
            type: "text" as const,
            text: { content: `🏷️ Hashtags : ${script.hashtags.join(" ")}\n🔗 Source PubMed / DOI : ${script.sourceUrl || script.doi}` },
          },
        ],
      },
    },
  ];
}

/**
 * Envoie un script TikTok sur Notion en créant une nouvelle page complète.
 *
 * @param script - Le script TikTok complet à envoyer
 */
export async function pushToNotion(script: TikTokScript): Promise<void> {
  console.log(
    `[Notion] 📤 Envoi de la fiche de tournage "${script.titreInterne}" vers Notion...`
  );

  try {
    const notion = initialiserNotion();
    const databaseId = obtenirDatabaseId();

    /* Date du jour au format ISO pour la propriété Date */
    const dateAujourdhui = new Date().toISOString().split("T")[0]!;

    /* Crée la page avec ses propriétés et son contenu visuel structuré */
    await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Titre: {
          title: [
            {
              text: {
                content: script.titre,
              },
            },
          ],
        },
        Accroche: {
          rich_text: [
            {
              text: {
                content: `🔥 ${script.accroche1}\n💥 ${script.accroche2}\n👁️ ${script.accroche3}`,
              },
            },
          ],
        },
        "Concept Psy": {
          rich_text: [
            {
              text: {
                content: script.conceptPsy,
              },
            },
          ],
        },
        "La Preuve": {
          rich_text: [
            {
              text: {
                content: script.laPreuve,
              },
            },
          ],
        },
        Insight: {
          rich_text: [
            {
              text: {
                content: script.insight,
              },
            },
          ],
        },
        CTA: {
          rich_text: [
            {
              text: {
                content: script.cta,
              },
            },
          ],
        },
        "Durée Cible": {
          select: {
            name: script.dureeCible,
          },
        },
        Format: {
          select: {
            name: script.format,
          },
        },
        Hashtags: {
          rich_text: [
            {
              text: {
                content: script.hashtags.join(" "),
              },
            },
          ],
        },
        Source: {
          url: script.sourceUrl || "https://pubmed.ncbi.nlm.nih.gov/",
        },
        "Score Viral": {
          number: script.scoreViral,
        },
        Date: {
          date: {
            start: dateAujourdhui,
          },
        },
        Statut: {
          status: {
            name: "Nouveau",
          },
        },
        DOI: {
          rich_text: [
            {
              text: {
                content: script.doi || "non-specifie",
              },
            },
          ],
        },
      },
      children: construireBlocsPage(script),
    });

    console.log(
      `[Notion] ✅ Fiche de tournage "${script.titreInterne}" créée avec succès dans Notion !`
    );
  } catch (erreur: any) {
    console.log(`[Notion] ❌ Erreur lors de l'envoi sur Notion : ${erreur?.message || erreur}`);
    throw new Error(
      `[Notion] Impossible d'envoyer le script "${script.titreInterne}" — ${erreur?.message || erreur}`
    );
  }
}

/**
 * Envoie un article en backlog dans Notion (résumé simplifié, sans script complet).
 * Utilisé pour sauvegarder les articles #2 et #3 du classement comme idées de réserve.
 *
 * @param scoreResult - Le résultat de scoring de l'article
 */
export async function pushBacklogToNotion(scoreResult: ScoreResult): Promise<void> {
  console.log(
    `[Notion] 📋 Envoi en backlog : "${scoreResult.article.titre.slice(0, 60)}..."`
  );

  try {
    const notion = initialiserNotion();
    const databaseId = obtenirDatabaseId();
    const dateAujourdhui = new Date().toISOString().split("T")[0]!;

    await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Titre: {
          title: [
            {
              text: {
                content: `[BACKLOG] ${scoreResult.article.titre.slice(0, 80)}`,
              },
            },
          ],
        },
        Accroche: {
          rich_text: [
            {
              text: {
                content: `Angle suggéré : ${scoreResult.angleTikTok}`,
              },
            },
          ],
        },
        Source: {
          url: scoreResult.article.url || "https://pubmed.ncbi.nlm.nih.gov/",
        },
        "Score Viral": {
          number: scoreResult.scoreTotal,
        },
        Date: {
          date: {
            start: dateAujourdhui,
          },
        },
        Statut: {
          status: {
            name: "Nouveau",
          },
        },
        DOI: {
          rich_text: [
            {
              text: {
                content: scoreResult.article.doi || "non-specifie",
              },
            },
          ],
        },
      },
    });

    console.log(
      `[Notion] ✅ Article backlog "${scoreResult.article.titre.slice(0, 50)}..." sauvegardé`
    );
  } catch (erreur: any) {
    console.log(
      `[Notion] ⚠️ Erreur lors de l'envoi backlog : ${erreur?.message || erreur}`
    );
    /* Ne pas throw — le backlog est non-critique */
  }
}

/**
 * Vérifie si un article a déjà été traité en cherchant son DOI dans Notion.
 * Permet d'éviter les doublons entre les exécutions du pipeline.
 *
 * @param doi - Le DOI de l'article à vérifier
 * @returns true si le DOI existe déjà dans la base, false sinon
 */
export async function isDuplicate(doi: string): Promise<boolean> {
  if (!doi || doi === "non-specifie") {
    return false;
  }

  try {
    const notion = initialiserNotion();

    const resultat = await notion.search({
      query: doi,
      page_size: 1,
    });

    const estDoublon = (resultat.results?.length ?? 0) > 0;

    if (estDoublon) {
      console.log(
        `[Notion] ⚠️ Doublon détecté ! Le DOI "${doi}" existe déjà dans Notion`
      );
    }

    return estDoublon;
  } catch (erreur: any) {
    console.log(
      `[Notion] ⚠️ Erreur lors de la vérification de doublon : ${erreur?.message || erreur}`
    );
    return false;
  }
}
