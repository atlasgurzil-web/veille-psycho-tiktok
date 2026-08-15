/**
 * Prompt de scoring — Évalue le potentiel TikTok d'un article scientifique.
 * Utilisé par le service de scoring pour demander à Gemini Flash de noter chaque article.
 */

/**
 * Construit le prompt de scoring pour Gemini.
 * On lui demande de noter l'article sur 3 critères : viral, simplicité, effet wow.
 *
 * @param titre - Le titre de l'article scientifique
 * @param abstract - Le résumé / abstract de l'article
 * @returns Le prompt complet à envoyer à Gemini Flash
 */
export function buildScoringPrompt(titre: string, abstract: string): string {
  return `Tu es un expert en contenu viral TikTok spécialisé en psychologie.

Évalue cet article scientifique sur 3 critères (note /10 chacun) :

1. POTENTIEL VIRAL — Est-ce que le sujet parle au grand public ? Les gens vont-ils s'identifier ?
2. SIMPLICITÉ — Le concept est-il explicable en 60 secondes à quelqu'un sans formation en psycho ?
3. EFFET WOW — Le résultat est-il surprenant, contre-intuitif, ou remet-il en question une croyance commune ?

Article : ${titre}
Abstract : ${abstract}

Réponds UNIQUEMENT en JSON valide, sans markdown :
{"score_viral": X, "score_simplicite": X, "score_wow": X, "score_total": X, "justification": "...", "angle_tiktok": "..."}`;
}
