# PRD — Veille Psycho → Scripts TikTok

## Problème

Un créateur de contenu TikTok spécialisé en psychologie doit manuellement chercher les dernières publications scientifiques, lire les abstracts, identifier celles qui ont du potentiel viral, puis rédiger un script adapté au format court. Ce processus prend plusieurs heures par semaine, demande des compétences de recherche académique, et repose entièrement sur la discipline du créateur. Résultat : la fréquence de publication est irrégulière, les sujets manquent de fraîcheur, et le créateur perd du temps à chercher au lieu de tourner.

## Solution

Chaque matin ouvré à 7h, un script TikTok prêt à tourner apparaît automatiquement dans une base de données en ligne. Le système surveille en continu les dernières publications en psychologie, identifie celles qui ont le plus fort potentiel viral, et génère un script structuré en français — avec accroche, explication du concept, preuve scientifique, application concrète, et appel à l'action. Le créateur n'a plus qu'à ouvrir sa base, lire le script du jour, et tourner.

## Utilisateur cible

Créateur de contenu TikTok francophone, pas psychologue de formation, qui veut publier du contenu de vulgarisation psychologique sourcé et engageant. Il n'est pas développeur — il a besoin d'un outil qui tourne sans intervention. Il est souvent occupé par son métier principal et veut maximiser son temps : chaque minute passée devant la caméra compte, pas de temps à perdre en recherche.

## User Stories

- **US-1** — En tant que créateur, je veux recevoir un script TikTok prêt chaque matin dans ma base Notion, afin de pouvoir tourner sans perdre de temps en recherche.
- **US-2** — En tant que créateur, je veux que chaque script soit basé sur une vraie publication scientifique récente, afin que mon contenu soit crédible et sourcé.
- **US-3** — En tant que créateur, je veux que le script contienne une accroche percutante, afin de stopper le scroll dès les 3 premières secondes.
- **US-4** — En tant que créateur, je veux que le concept psychologique soit expliqué simplement, afin que mon audience comprenne sans formation en psycho.
- **US-5** — En tant que créateur, je veux un lien vers le papier original dans chaque script, afin de pouvoir vérifier la source et renforcer ma crédibilité.
- **US-6** — En tant que créateur, je veux des hashtags suggérés en français, afin de ne pas perdre de temps sur l'optimisation de la distribution.
- **US-7** — En tant que créateur, je veux que le système ne me propose jamais deux fois le même article, afin d'éviter les doublons dans mon contenu.
- **US-8** — En tant que créateur, je veux un score de potentiel viral pour chaque script, afin de prioriser les meilleurs sujets quand j'ai peu de temps.
- **US-9** — En tant que créateur, je veux pouvoir marquer un script comme "Tourné" ou "Publié", afin de suivre ma progression dans la base.
- **US-10** — En tant que créateur, je veux que le pipeline fonctionne sans intervention de ma part, afin de ne jamais avoir à relancer ou surveiller le système.

## Critères de succès

1. Chaque matin ouvré, un script est présent dans la base avant 7h15.
2. 0 doublon dans la base sur une période de 30 jours.
3. Au moins 7 scripts sur 10 sont jugés "publiables" par le créateur lors de la phase de test.
4. Le pipeline tourne 5 jours consécutifs sans erreur avant mise en production.
5. Chaque script contient les 6 champs obligatoires : accroche, concept psy, preuve, insight, CTA, source.

## Hors périmètre

- Pas de publication automatique sur TikTok — le créateur tourne et publie lui-même.
- Pas de génération de visuels ou de vidéos — le livrable est un script texte.
- Pas de traduction — les scripts sont générés directement en français.
- Pas d'analytics TikTok intégrés — le suivi des performances se fait manuellement.
- Pas de multi-plateforme — TikTok uniquement, pas de Reels ni Shorts.
- Pas de curation manuelle — tout est automatique, pas d'étape de validation.

## Décisions d'implémentation

- Le script du jour apparaît comme une nouvelle page dans la base, avec le statut "Nouveau".
- Les statuts possibles sont : Nouveau → Tourné → Publié (modifiés manuellement par le créateur).
- La durée cible de chaque script est recommandée par le système : 15s, 30s ou 60s.
- Le format de tournage est suggéré : face caméra, voix off, ou green screen.
- Les hashtags sont en français, 6 par script.
- Le score viral est affiché sur 10, visible dans la base pour permettre le tri.
- Les 5 niches couvertes : biais cognitifs, psychologie sociale/relations, santé mentale, attachement/parentalité, sommeil/dopamine/habitudes.
- Le système surveille les publications des 7 derniers jours à chaque exécution.
- Si aucun article ne dépasse le seuil de score, aucun script n'est généré ce jour-là (pas de contenu médiocre).

## Notes complémentaires

Rien à signaler.
