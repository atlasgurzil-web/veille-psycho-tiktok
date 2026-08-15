# 🧠 Veille Psycho → Scripts TikTok

> Pipeline automatisé qui surveille les dernières publications en psychologie, identifie les plus virales, et génère des scripts TikTok prêts à tourner — directement dans Notion.

## Comment ça marche

```
⏰ Tous les matins (Lun-Ven, 7h)
    ↓
📥 Récupère les publications récentes (PubMed + APA)
    ↓
🔄 Vérifie qu'on ne les a pas déjà traitées
    ↓
⭐ Score chaque article (potentiel viral, simplicité, effet wow)
    ↓
✍️ Génère un script TikTok en français
    ↓
📤 Le pousse dans ta base Notion, prêt à tourner 🎬
```

## Guide d'installation pas à pas

### 1. Prérequis

- [Node.js](https://nodejs.org/) version 18 ou plus récente
- Un compte [Trigger.dev](https://trigger.dev/) (gratuit)
- Un compte [Composio](https://composio.dev/) (gratuit)
- Un espace [Notion](https://notion.so/) (gratuit)
- Une clé [Google AI Studio](https://aistudio.google.com/) (gratuit)

### 2. Installer les dépendances

Ouvre un terminal dans le dossier du projet et lance :

```bash
npm install
```

### 3. Créer ta base Notion

Dans Notion, crée une **nouvelle base de données** avec ces propriétés :

| Nom de la propriété | Type | Options |
|:---|:---|:---|
| Titre | Titre | _(par défaut)_ |
| Accroche | Texte | |
| Concept Psy | Texte | |
| La Preuve | Texte | |
| Insight | Texte | |
| CTA | Texte | |
| Durée Cible | Sélection | `15s`, `30s`, `60s` |
| Format | Sélection | `face caméra`, `voix off`, `green screen` |
| Hashtags | Texte | |
| Source | URL | |
| Score Viral | Nombre | |
| Date | Date | |
| Statut | Statut | `Nouveau`, `Tourné`, `Publié` |
| DOI | Texte | |

> 💡 **Astuce** : Copie l'ID de ta base de données depuis l'URL Notion.
> L'URL ressemble à : `https://notion.so/ta-base-**abc123def456**?v=...`
> L'ID c'est la partie en gras (32 caractères).

### 4. Connecter Composio à Notion

1. Va sur [app.composio.dev](https://app.composio.dev/)
2. Connecte ton compte Notion dans les **Integrations**
3. Autorise l'accès à ta base de données
4. Copie ta **clé API Composio** depuis les paramètres

### 5. Générer ta clé Google AI

1. Va sur [Google AI Studio](https://aistudio.google.com/apikey)
2. Clique sur **"Create API Key"**
3. Copie la clé

### 6. Configurer le projet

Copie le fichier `.env.example` en `.env` :

```bash
copy .env.example .env
```

Puis ouvre `.env` et remplis les 4 clés :

```env
TRIGGER_SECRET_KEY=tr_dev_xxxxx        # Depuis le dashboard Trigger.dev
GOOGLE_AI_API_KEY=AIzaSyxxxxx          # Depuis Google AI Studio
COMPOSIO_API_KEY=xxxxx                 # Depuis Composio
NOTION_DATABASE_ID=abc123def456        # Depuis l'URL de ta base Notion
```

### 7. Tester en local

Lance le mode développement :

```bash
npx trigger.dev@latest dev
```

Puis va sur le **dashboard Trigger.dev** pour déclencher la tâche manuellement et vérifier que tout marche.

### 8. Déployer en production

Une fois que tout fonctionne :

```bash
npx trigger.dev@latest deploy
```

C'est tout ! Le pipeline tournera automatiquement chaque matin à 7h. 🎉

## Structure du projet

```
├── src/
│   ├── trigger/
│   │   └── veille-psycho.ts        # 🎯 Tâche principale
│   ├── services/
│   │   ├── pubmed.ts               # 📥 Client PubMed
│   │   ├── apa-rss.ts              # 📥 Parser RSS APA
│   │   ├── scoring.ts              # ⭐ Scoring Gemini Flash
│   │   ├── script-generator.ts     # ✍️ Génération Gemini Pro
│   │   └── notion.ts               # 📤 Push Notion (Composio)
│   ├── prompts/
│   │   ├── scoring-prompt.ts       # Prompt de scoring
│   │   └── script-prompt.ts        # Prompt de génération
│   └── types/
│       └── index.ts                # Types TypeScript
├── docs/
│   ├── PRD.md                      # Cahier des charges
│   └── diagrams/                   # Diagrammes du pipeline
├── package.json
├── tsconfig.json
├── trigger.config.ts               # Config Trigger.dev
├── .env.example                    # Template des variables
└── README.md                       # ← Tu es ici
```

## Protocole de test

### Phase 1 — Qualité des scripts

1. Lance le pipeline 1 fois (`npx trigger.dev@latest dev` + déclenchement manuel)
2. Génère 10 scripts
3. Note chacun : "je le tournerais" ✅ ou ❌
4. Objectif : **≥ 7/10 de ✅**

### Phase 2 — Fiabilité technique (5 jours)

1. Déploie (`npx trigger.dev@latest deploy`)
2. Laisse tourner 5 jours
3. Vérifie chaque jour : script arrivé, pas de doublon, champs remplis

### Phase 3 — Performance éditoriale (2 semaines)

1. Publie les scripts sur TikTok
2. Compare les vues / engagement
3. Ajuste les prompts si besoin

## Coût

**$0 / mois** 🆓

| Service | Coût |
|:---|:---|
| PubMed API | Gratuit |
| APA RSS | Gratuit |
| Gemini Flash + Pro (free tier) | Gratuit |
| Trigger.dev (free tier) | Gratuit |
| Composio (free tier) | Gratuit |
| Notion (free tier) | Gratuit |

## Licence

Usage personnel.
