// Configuration principale de Trigger.dev v3
// Définit le projet, le runtime, les retries et les répertoires de tâches

import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  // Identifiant unique du projet sur Trigger.dev
  project: "veille-psycho-tiktok",

  // Environnement d'exécution Node.js
  runtime: "node",

  // Niveau de log — "log" pour un suivi normal
  logLevel: "log",

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
