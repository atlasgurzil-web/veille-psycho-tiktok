/**
 * Prompt de génération de scripts TikTok — Rédige une fiche de tournage prête à l'emploi.
 */

export function buildScriptPrompt(
  titre: string,
  abstract: string,
  angle: string
): string {
  return `Tu es un créateur de contenu TikTok francophone spécialisé en neurosciences et psychologie comportementale de haut niveau (style vulgarisation percutante, moderne, sans condescendance).

Tu dois transformer cette étude scientifique réelle en un script TikTok captivant, mémorable et scientifiquement irréprochable.

INFORMATIONS DE L'ÉTUDE RÉELLE :
- Titre original : ${titre}
- Résumé scientifique : ${abstract}
- Angle d'attaque suggéré : ${angle}

STRUCTURE OBLIGATOIRE DU SCRIPT :
1. ACCROCHES (0-3 secondes) — Propose 3 VARIANTES DIFFÉRENTES :
   - Variante 1 (Curiosité / Question choc) : Une question ou affirmation irrésistible.
   - Variante 2 (Contre-intuitif / Mythe brisé) : Brise une croyance populaire.
   - Variante 3 (POV / Tu fais ça sans le savoir) : Implique directement le spectateur.
2. LE CONCEPT (3-10 secondes) :
   - Pose le problème ou le phénomène psychologique en termes simples de la vie de tous les jours.
3. LA PREUVE SCIENTIFIQUE (10-20 secondes) :
   - Mentionne l'expérience ou les résultats concrets de l'étude pour asseoir une autorité totale.
4. L'INSIGHT / LE BÉNÉFICE (20-30 secondes) :
   - Qu'est-ce que le spectateur doit faire ou comprendre différemment dans sa vie dès aujourd'hui ?
5. LE CALL TO ACTION (30-35 secondes) :
   - Une question ouverte pour déclencher des débats en commentaires ou inciter à s'abonner pour plus d'études décryptées.

CONSEILS DE TOURNAGE :
- Donne une indication claire de ton ou d'action visuelle (ex: "Ton calme et direct face caméra", "Montre ton téléphone").

Réponds UNIQUEMENT en JSON valide sans aucun formatage Markdown :
{
  "titre": "Titre court et percutant de la vidéo",
  "titre_interne": "Titre d'organisation pour Notion",
  "accroche_1": "Hook style Curiosité / Question choc",
  "accroche_2": "Hook style Contre-intuitif / Mythe brisé",
  "accroche_3": "Hook style POV / Tu fais ça sans le savoir",
  "concept_psy": "L'explication vulgarisée en 2-3 phrases",
  "la_preuve": "La preuve scientifique résumée",
  "insight": "Ce que ça change concrètement pour le spectateur",
  "cta": "L'appel à l'action pour les commentaires",
  "duree_cible": "30s",
  "format": "face caméra",
  "conseil_tournage": "Indication visuelle ou de ton pour le créateur",
  "hashtags": ["#psychologie", "#cerveau", "#neurosciences", "#developpementpersonnel", "#etude", "#apprendre"]
}`;
}
