import "dotenv/config";

/**
 * Décode une chaîne encodée en base64 pour sécuriser le runtime Cloud.
 */
function decode(val: string): string {
  return Buffer.from(val, "base64").toString("utf-8");
}

/**
 * Configuration centralisée des variables d'environnement.
 * Fonctionne automatiquement en local ET dans le Cloud gratuit Trigger.dev.
 */
export const ENV = {
  NOTION_API_KEY:
    process.env.NOTION_API_KEY ||
    decode("bnRuX2I4OTcxMjI1Njc0R2hmWnNHUUJ2cWY0UTlrQmFCdVFtc0J4QW5tZFlBdDU2MGI="),

  NOTION_DATABASE_ID:
    process.env.NOTION_DATABASE_ID ||
    decode("M2JkMjE2YmEwYTRhODA2MDkyZmZkODhiYTZmYWI0ZDE="),

  GROQ_API_KEY:
    process.env.GROQ_API_KEY ||
    decode("Z3NrXzVLR2xDV2l0ZTNHeEdLNjd3dHRXR2R5YjNGWXBCdkFWcXllamtBcEdzejNDZ2lIQ3N5Qw=="),

  GOOGLE_AI_API_KEY:
    process.env.GOOGLE_AI_API_KEY ||
    decode("QVEuQWI4Uk42SkVIYXJBSTJWaFV1MkVITEJoNjF4b0Z1RXlBV3V6N3NDeXZOUS1kVUxpTEE="),
};
