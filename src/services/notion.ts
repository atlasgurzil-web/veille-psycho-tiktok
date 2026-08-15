/**
 * Service Notion — Envoie les scripts TikTok sur Notion via l'API officielle.
 *
 * Gère la création de pages dans la base de données Notion et
 * la vérification des doublons via le DOI des articles.
 * Utilise le SDK officiel @notionhq/client (stable, bien documenté).
 */

import { Client } from "@notionhq/client";
import type { TikTokScript } from "../types/index.js";

/**
 * Initialise le client Notion avec la clé API.
 * La clé se trouve dans ton fichier .env sous NOTION_API_KEY.
 *
 * @returns L'instance Notion configurée
 * @throws Error si la clé API est manquante
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
 * Vérifie que l'ID de la base de données Notion est configuré.
 *
 * @returns L'identifiant de la base de données Notion
 * @throws Error si NOTION_DATABASE_ID n'est pas défini
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
 * Envoie un script TikTok sur Notion en créant une nouvelle page.
 * Chaque champ du script est mappé vers une propriété de la base de données.
 *
 * @param script - Le script TikTok complet à envoyer
 */
export async function pushToNotion(script: TikTokScript): Promise<void> {
  console.log(
    `[Notion] 📤 Envoi du script "${script.titreInterne}" vers Notion...`
  );

  try {
    const notion = initialiserNotion();
    const databaseId = obtenirDatabaseId();

    /* Date du jour au format ISO pour la propriété Date */
    const dateAujourdhui = new Date().toISOString().split("T")[0]!;

    /* Crée la page avec toutes les propriétés */
    await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        /* Titre — propriété de type "title" */
        Titre: {
          title: [
            {
              text: {
                content: script.titre,
              },
            },
          ],
        },
        /* Accroche — propriété de type "rich_text" */
        Accroche: {
          rich_text: [
            {
              text: {
                content: script.accroche,
              },
            },
          ],
        },
        /* Concept Psy — propriété de type "rich_text" */
        "Concept Psy": {
          rich_text: [
            {
              text: {
                content: script.conceptPsy,
              },
            },
          ],
        },
        /* La Preuve — propriété de type "rich_text" */
        "La Preuve": {
          rich_text: [
            {
              text: {
                content: script.laPreuve,
              },
            },
          ],
        },
        /* Insight — propriété de type "rich_text" */
        Insight: {
          rich_text: [
            {
              text: {
                content: script.insight,
              },
            },
          ],
        },
        /* CTA — propriété de type "rich_text" */
        CTA: {
          rich_text: [
            {
              text: {
                content: script.cta,
              },
            },
          ],
        },
        /* Durée Cible — propriété de type "select" */
        "Durée Cible": {
          select: {
            name: script.dureeCible,
          },
        },
        /* Format — propriété de type "select" */
        Format: {
          select: {
            name: script.format,
          },
        },
        /* Hashtags — propriété de type "rich_text" */
        Hashtags: {
          rich_text: [
            {
              text: {
                content: script.hashtags.join(" "),
              },
            },
          ],
        },
        /* Source — propriété de type "url" */
        Source: {
          url: script.sourceUrl,
        },
        /* Score Viral — propriété de type "number" */
        "Score Viral": {
          number: script.scoreViral,
        },
        /* Date — propriété de type "date" */
        Date: {
          date: {
            start: dateAujourdhui,
          },
        },
        /* Statut — propriété de type "status" */
        Statut: {
          status: {
            name: "Nouveau",
          },
        },
        /* DOI — propriété de type "rich_text" (pour la déduplication) */
        DOI: {
          rich_text: [
            {
              text: {
                content: script.doi,
              },
            },
          ],
        },
      },
    });

    console.log(
      `[Notion] ✅ Script "${script.titreInterne}" envoyé avec succès sur Notion`
    );
  } catch (erreur) {
    console.log(`[Notion] ❌ Erreur lors de l'envoi sur Notion : ${erreur}`);
    throw new Error(
      `[Notion] Impossible d'envoyer le script "${script.titreInterne}" — ${erreur}`
    );
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
  /* Si pas de DOI, on ne peut pas vérifier */
  if (!doi) {
    return false;
  }

  try {
    const notion = initialiserNotion();
    const databaseId = obtenirDatabaseId();

    /* Cherche le DOI dans la base Notion */
    const resultat = await notion.dataSources.query({
      data_source_id: databaseId,
      filter: {
        property: "DOI",
        rich_text: {
          equals: doi,
        },
      },
      page_size: 1,
    });

    const estDoublon = resultat.results.length > 0;

    if (estDoublon) {
      console.log(
        `[Notion] ⚠️ Doublon détecté ! Le DOI "${doi}" existe déjà`
      );
    }

    return estDoublon;
  } catch (erreur) {
    /* En cas d'erreur, on laisse passer (mieux vaut un doublon qu'un article manqué) */
    console.log(
      `[Notion] ⚠️ Erreur lors de la vérification de doublon : ${erreur}`
    );
    return false;
  }
}
