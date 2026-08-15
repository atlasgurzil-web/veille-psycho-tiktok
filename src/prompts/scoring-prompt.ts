/**
 * Prompt de scoring — Évalue le potentiel viral et la nouveauté d'un article scientifique.
 *
 * Filtre strictement les poncifs et les sujets réchauffés.
 */

export function buildScoringPrompt(titre: string, abstract: string): string {
  return `Tu es un directeur éditorial expert en vulgarisation scientifique et en viralité TikTok.

Ton rôle est d'analyser cette publication scientifique récente et de déterminer si elle mérite une vidéo TikTok.

RÈGLE D'OR : ZÉRO RÉCHAUFFÉ.
Rejette impitoyablement les sujets clichés déjà vus 1000 fois sur internet (ex: l'effet Dunning-Kruger basique, le biais de confirmation classique, la pyramide de Maslow, l'effet placebo de base).

Évalue l'étude sur ces 3 critères (note de 0 à 10 chacun) :

1. POTENTIEL VIRAL (/10) :
- Est-ce que le sujet touche une préoccupation quotidienne réelle (sommeil, relations, concentration, anxiété, procrastination, dopamine) ?
- L'audience va-t-elle se dire "c'est tellement moi" ou l'envoyer à un ami ?

2. SIMPLICITÉ & CLARTÉ (/10) :
- Le mécanisme est-il explicable en 30-45 secondes sans jargon incompréhensible ?

3. EFFET SURPRISE / CONTRE-INTUITIF (/10) :
- Le résultat remet-il en cause une idée reçue ou apporte-t-il un éclairage nouveau et inattendu ?

ARTICLE À ÉVALUER :
Titre : ${titre}
Résumé (Abstract) : ${abstract}

Réponds UNIQUEMENT en JSON valide sans aucun formatage Markdown :
{
  "score_viral": 8,
  "score_simplicite": 9,
  "score_wow": 8,
  "score_total": 25,
  "justification": "Explication courte en 1 phrase",
  "angle_tiktok": "L'angle d'attaque le plus percutant pour le hook"
}`;
}
