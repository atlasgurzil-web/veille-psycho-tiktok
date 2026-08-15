// Configuration principale de Trigger.dev v3
// Définit le projet, le runtime, les retries et les répertoires de tâches

import "dotenv/config";
import { defineConfig } from "@trigger.dev/sdk/v3";
import { syncEnvVars } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  // Identifiant unique du projet sur Trigger.dev
  project: "proj_yfkcltxerzfxycklxume",

  // Environnement d'exécution Node.js
  runtime: "node",

  // Niveau de log — "log" pour un suivi normal
  logLevel: "log",

  // Durée maximale d'exécution autorisée pour les tâches (en secondes, ici 10 minutes)
  maxDuration: 600,

  // Synchronisation automatique des variables d'environnement depuis .env lors du déploiement
  build: {
    extensions: [
      syncEnvVars(async () => {
        return [
          {
            name: "NOTION_API_KEY",
            value: process.env.NOTION_API_KEY ?? "",
          },
          {
            name: "NOTION_DATABASE_ID",
            value: process.env.NOTION_DATABASE_ID ?? "",
          },
          {
            name: "GROQ_API_KEY",
            value: process.env.GROQ_API_KEY ?? "",
          },
          {
            name: "GOOGLE_AI_API_KEY",
            value: process.env.GOOGLE_AI_API_KEY ?? "",
          },
        ];
      }),
    ],
  },

  // Politique de retry en cas d'échec
  retries: {
    // Activer les retries même en développement local
    enabledInDev: true,
    default: {
      // Nombre maximum de tentatives avant abandon
      maxAttempts: 3,
      // Délai minimum entre les tentatives (1 seconde)
      minTimeoutInMs: 1000,
      // Délai maximum entre les tentatives (10 secondes)
      maxTimeoutInMs: 10000,
      // Facteur multiplicateur pour le backoff exponentiel
      factor: 2,
    },
  },

  // Répertoires contenant les définitions de tâches
  dirs: ["src/trigger"],
});
