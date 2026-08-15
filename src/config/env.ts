import "dotenv/config";

/**
 * Configuration centralisée des variables d'environnement.
 */
export const ENV = {
  NOTION_API_KEY: process.env.NOTION_API_KEY || "",
  NOTION_DATABASE_ID: process.env.NOTION_DATABASE_ID || "",
  GROQ_API_KEY: process.env.GROQ_API_KEY || "",
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || "",
};
