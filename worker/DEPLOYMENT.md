# Guide de Déploiement et Configuration du Worker Cloudflare (SEP)

Ce guide décrit pas à pas la configuration, l'initialisation des ressources Cloudflare (D1, R2, Cron, Secrets) et le déploiement du backend serverless de l'application **Student Expense Tracker (SEP)**.

---

## Sommaire
1. [Architecture & Rôle du Worker](#1-architecture--rôle-du-worker)
2. [Prérequis](#2-prérequis)
3. [Étape 1 : Connexion au compte Cloudflare (Wrangler)](#étape-1--connexion-au-compte-cloudflare-wrangler)
4. [Étape 2 : Création de la Base D1 (SQLite Serverless)](#étape-2--création-de-la-base-d1-sqlite-serverless)
5. [Étape 3 : Création du Bucket R2 (Stockage Photos Reçus)](#étape-3--création-du-bucket-r2-stockage-photos-reçus)
6. [Étape 4 : Configuration des Variables Secrètes (Secrets)](#étape-4--configuration-des-variables-secrètes-secrets)
7. [Étape 5 : Test en Local](#étape-5--test-en-local)
8. [Étape 6 : Déploiement en Production](#étape-6--déploiement-en-production)
9. [Étape 7 : Configuration du Frontend Angular](#étape-7--configuration-du-frontend-angular)
10. [Étape 8 : Surveillance, Logs & Tâches Cron](#étape-8--surveillance-logs--tâches-cron)
11. [Dépannage & Erreurs Fréquentes](#dépannage--erreurs-fréquentes)

---

## 1. Architecture & Rôle du Worker

L'application SEP est **100% Offline-First**. IndexedDB dans le navigateur de l'utilisateur est la source de vérité locale. Le Worker Cloudflare intervient uniquement comme support cloud sécurisé pour :
- **Extraction OCR / Vision (OpenAI GPT-4o-mini)** : Évite d'exposer la clé OpenAI dans le code client.
- **Stockage R2 (`sep-captures`)** : Sauvegarde durable des reçus et factures photographiés sans frais d'egress AWS.
- **Base D1 (`sep-d1`)** : Sauvegarde miroir des dépenses, calcul des seuils de budget (70%, 90%, 100%).
- **Coach M. Pognon (`/api/chat`)** : Agent financier personnel alimenté par IA avec garde-fous budgétaires.
- **Tâches Automatiques (Cron Triggers)** :
  - `06:00 UTC` : Digest matinal par email (Resend).
  - `22:00 UTC` : Bilan du soir par email (Resend).
  - Toutes les heures : Vérification des achats en attente de réflexion (période de refroidissement de 24h).

---

## 2. Prérequis

Avant de commencer, munissez-vous de :
1. Un compte [Cloudflare](https://dash.cloudflare.com/) (le plan gratuit suffit largement).
2. [Node.js](https://nodejs.org/) (version 18+ ou 20+ recommandée) avec `npm`.
3. Une clé API [OpenAI](https://platform.openai.com/api-keys) (format `sk-proj-...`).
4. Une clé API [Resend](https://resend.com/api-keys) (format `re_...`) avec un domaine ou une adresse validée.

---

## Étape 1 : Connexion au compte Cloudflare (Wrangler)

Ouvrez un terminal dans le dossier `worker` du projet :

```bash
cd /home/jonas-dev/Bureau/SEP/worker
```

Connectez l'outil en ligne de commande Cloudflare (Wrangler) à votre compte :

```bash
npx wrangler login
```

> *Une fenêtre de navigateur s'ouvre. Connectez-vous et autorisez Wrangler.*

Vérifiez que vous êtes bien authentifié :

```bash
npx wrangler whoami
```

---

## Étape 2 : Création de la Base D1 (SQLite Serverless)

Cloudflare D1 est une base de données relationnelle SQLite distribuée mondialement à très faible latence.

### 1. Créer la base sur Cloudflare
Exécutez :

```bash
npx wrangler d1 create sep-d1
```

La commande affichera un résultat similaire à ceci :
```text
✅ Successfully created DB 'sep-d1'!

[[d1_databases]]
binding = "DB"
database_name = "sep-d1"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 2. Mettre à jour `wrangler.toml`
Ouvrez le fichier `worker/wrangler.toml` et remplacez `database_id = "sep-d1-placeholder-id"` par le vrai identifiant retourné :

```toml
[[d1_databases]]
binding = "DB"
database_name = "sep-d1"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" # <-- Votre vrai ID ici
```

### 3. Exécuter le schéma SQL en production
Initialisez les tables (`expenses`, `categories`, `purchases`, `captures`, `threshold_alerts`, `token_usage`) :

```bash
npx wrangler d1 execute sep-d1 --remote --file=./schema.sql
```

> **Note :** Le flag `--remote` applique le schéma sur l'infrastructure Cloudflare réelle (pas juste en local).

---

## Étape 3 : Création du Bucket R2 (Stockage Photos Reçus)

Cloudflare R2 stocke les images des reçus photographiés par l'utilisateur.

Créez le bucket avec la commande suivante :

```bash
npx wrangler r2 bucket create sep-captures
```

Le fichier `worker/wrangler.toml` est déjà configuré pour lier ce bucket :
```toml
[[r2_buckets]]
binding = "CAPTURES_BUCKET"
bucket_name = "sep-captures"
```

---

## Étape 4 : Configuration des Variables Secrètes (Secrets)

> [!CAUTION]
> **Règle de sécurité absolue :** Ne mettez **JAMAIS** vos clés secrètes (`OPENAI_API_KEY`, `RESEND_API_KEY`) dans `wrangler.toml`. Ce fichier est versionné dans Git.

### A. Pour le développement local
Les secrets locaux sont lus depuis le fichier `worker/.dev.vars` (qui est ignoré par Git).

1. Si ce n'est pas déjà fait, créez `.dev.vars` à partir de l'exemple :
   ```bash
   cp .dev.vars.example .dev.vars
   ```
2. Éditez `worker/.dev.vars` avec vos vraies clés :
   ```env
   OPENAI_API_KEY="sk-proj-..."
   RESEND_API_KEY="re_..."
   APP_SECRET_TOKEN="sep_secret_bearer_token_2026"
   JONAS_EMAIL="jonas@kgslab.com"
   RESEND_FROM_EMAIL="M. Pognon <coach@kgslab.com>"
   MONTHLY_AI_BUDGET_USD="5.00"
   ```

### B. Pour la production (sur Cloudflare)
Chaque clé secrète doit être enregistrée individuellement sur les serveurs sécurisés de Cloudflare :

```bash
# 1. Clé OpenAI
npx wrangler secret put OPENAI_API_KEY
# Collez votre clé sk-proj-... puis appuyez sur Entrée

# 2. Clé Resend
npx wrangler secret put RESEND_API_KEY
# Collez votre clé re_... puis appuyez sur Entrée

# 3. Token de sécurité partagé avec le frontend
npx wrangler secret put APP_SECRET_TOKEN
# Tapez votre mot de passe/token (ex: sep_secret_bearer_token_2026)
```

---

## Étape 5 : Test en Local

Pour démarrer et tester le Worker sur votre machine avant de déployer :

1. Initialisez la base D1 locale :
   ```bash
   npx wrangler d1 execute sep-d1 --local --file=./schema.sql
   ```
2. Lancez le serveur de développement :
   ```bash
   npm run dev
   # ou : npx wrangler dev --port 8787
   ```
3. Dans un autre terminal, testez la route de santé :
   ```bash
   curl http://localhost:8787/api/health
   ```
   Réponse attendue :
   ```json
   {"status":"healthy","env":"development","time":"2026-..."}
   ```

---

## Étape 6 : Déploiement en Production

Pour publier votre Worker sur le réseau mondial de Cloudflare :

```bash
npm run deploy
# ou : npx wrangler deploy
```

La sortie indiquera l'URL publique de votre backend, par exemple :
```text
Total Upload: 45.20 KiB / gzip: 11.80 KiB
Uploaded sep-backend (1.23 sec)
Deployed sep-backend triggers (0.45 sec)
  https://sep-backend.<votre-compte>.workers.dev
```

Testez immédiatement la santé de votre backend en production :
```bash
curl https://sep-backend.<votre-compte>.workers.dev/api/health
```

---

## Étape 7 : Configuration du Frontend Angular

Une fois le Worker déployé :

1. Ouvrez `src/environments/environment.prod.ts` à la racine de votre projet SEP.
2. Indiquez la vraie URL de votre Worker et votre token :
   ```typescript
   export const environment = {
     production: true,
     workerUrl: 'https://sep-backend.<votre-compte>.workers.dev',
     appSecretToken: 'sep_secret_bearer_token_2026'
   };
   ```
3. Testez la compilation du frontend :
   ```bash
   npm run build
   ```

---

## Étape 8 : Surveillance, Logs & Tâches Cron

### Voir les logs en direct (Streaming)
Pour voir les erreurs ou les requêtes des utilisateurs en temps réel :
```bash
npx wrangler tail
```

### Vérifier les Cron Triggers
Les triggers configurés dans `wrangler.toml` s'exécutent automatiquement sans serveur :
- `0 6 * * *` : Déclenche l'envoi du récapitulatif matinal.
- `0 22 * * *` : Déclenche l'envoi du bilan de la journée.
- `0 * * * *` : Déclenche la vérification des achats en période de réflexion (24h de refroidissement expirées).

Pour tester un cron manuellement en local sans attendre l'heure programmée :
```bash
curl "http://localhost:8787/__scheduled?cron=0+6+*+*+*"
```

---

## Dépannage & Erreurs Fréquentes

| Symptôme / Erreur | Cause probable | Solution |
| :--- | :--- | :--- |
| `D1_ERROR: no such table: expenses` | Le schéma SQL n'a pas été exécuté sur la base distante. | Lancez `npx wrangler d1 execute sep-d1 --remote --file=./schema.sql`. |
| `401 Unauthorized: Invalid or missing Bearer token` | Le header `Authorization: Bearer <token>` est absent ou incorrect. | Vérifiez que `APP_SECRET_TOKEN` dans le Worker correspond à `appSecretToken` dans `environment.ts`. |
| `400 / 500 sur /api/captures` | Le bucket R2 n'existe pas ou la clé OpenAI est vide. | Vérifiez `npx wrangler r2 bucket list` et réinitialisez `npx wrangler secret put OPENAI_API_KEY`. |
| `Monthly AI budget guardrail exceeded` | Le total mensuel d'utilisation de tokens a dépassé le plafond de `$5.00`. | Ajustez `MONTHLY_AI_BUDGET_USD` dans `wrangler.toml` ou réinitialisez le compteur du mois dans la table D1 `token_usage`. |
