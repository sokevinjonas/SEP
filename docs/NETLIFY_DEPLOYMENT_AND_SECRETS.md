# Guide Déploiement Netlify & Gestion Automatique des Secrets

Ce guide détaille pas à pas la génération des clés secrètes, la configuration des variables d'environnement et leur importation automatique dans **Netlify** sans aucune saisie manuelle.

---

## 1. Génération des Clés Secrètes Cryptographiques

Deux clés secrètes sécurisées (256 bits / 32 octets hexadécimaux) sont nécessaires pour l'application :
1. **`JWT_SECRET`** : Clé privée utilisée par le backend Node.js pour signer et vérifier les jetons de session des étudiants après validation OTP.
2. **`APP_SECRET_TOKEN`** : Jeton d'autorisation interne partagé entre le frontend Angular et le backend pour sécuriser les routes de synchronisation, d'OCR et de chat IA.

### Commandes pour générer de nouvelles clés :

```bash
# Générer un JWT_SECRET :
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Générer un APP_SECRET_TOKEN :
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

*(Alternative avec OpenSSL : `openssl rand -hex 32`)*

---

## 2. Configuration Locale des Fichiers

### A. Côté Backend (`backend/.env`)
Renseignez les valeurs générées dans votre fichier `backend/.env` :

```env
PORT=3000
NODE_ENV=production

# Authentification & Sécurité
JWT_SECRET=80e78f3a70791c0e0266246ad349d82eb16d1bb83a2d6594eebecb4ed2e43b0e
APP_SECRET_TOKEN=a4b30acde57ee5b3860434b6e2b6fb890f4375825c201b0e4366bcc0cdae246c

# Service d'envoi des e-mails OTP (Resend)
RESEND_API_KEY=re_votre_cle_resend_ici
RESEND_FROM_EMAIL=M. Pognon <coach@mail-omnelyo.kgslab.com>

# Intelligence Artificielle Coach (Optionnel)
OPENAI_API_KEY=sk-proj-votre_cle_openai_ici
```

### B. Côté Frontend (`src/environments/`)
La variable `appSecretToken` du frontend doit **exactement correspondre** à la valeur `APP_SECRET_TOKEN` du backend.

- **Production** (`src/environments/environment.prod.ts`) :
  ```typescript
  export const environment = {
    production: true,
    apiUrl: 'https://student-savings.netlify.app',
    workerUrl: 'https://student-savings.netlify.app',
    appSecretToken: 'a4b30acde57ee5b3860434b6e2b6fb890f4375825c201b0e4366bcc0cdae246c'
  };
  ```

- **Développement local** (`src/environments/environment.ts`) :
  ```typescript
  export const environment = {
    production: false,
    apiUrl: 'http://localhost:3000',
    workerUrl: 'http://localhost:3000',
    appSecretToken: 'a4b30acde57ee5b3860434b6e2b6fb890f4375825c201b0e4366bcc0cdae246c'
  };
  ```

---

## 3. Importation Automatique des Variables dans Netlify (CLI)

Au lieu de saisir manuellement chaque variable dans l'interface web Netlify, utilisez la commande d'import automatique.

### Étape 1 : Se connecter et lier le dépôt au site Netlify
Exécutez cette commande à la racine du projet :
```bash
npx netlify link
```
- Choisissez : **"Use current git remote origin"** ou **"Search by name"** et sélectionnez votre site (ex: `student-savings`).
- Cela crée la liaison locale sécurisée dans `.netlify/state.json`.

### Étape 2 : Importer automatiquement toutes les variables de `backend/.env`
```bash
npx netlify env:import backend/.env
```
Netlify lit immédiatement toutes les paires clé/valeur du fichier et les injecte dans les **Environment Variables** de votre site de production.

### Étape 3 : Vérifier les variables importées
Pour afficher la liste des variables actuellement enregistrées sur Netlify :
```bash
npx netlify env:list
```

---

## 4. Configuration de l'Accès Public sur Netlify

Pour que l'API réponde librement aux requêtes HTTP (mobile Capacitor, requêtes web) sans redirection d'authentification :
1. Rendez-vous sur votre dashboard **Netlify**.
2. Allez dans **Site configuration > Access management > Visitor access**.
3. Assurez-vous que l'accès est défini sur **Public** (désactivez la protection par mot de passe ou restriction d'accès).

---

## 5. Déploiement et Test de l'API

### Déployer en production :
```bash
npx netlify deploy --prod
```
*(Ou poussez simplement sur votre branche principale avec `git push origin main` si le déploiement Git automatique est activé).*

### Tester le bon fonctionnement de l'API :
```bash
curl -i https://student-savings.netlify.app/api/health
```

**Réponse attendue (HTTP 200 OK) :**
```json
{
  "status": "healthy",
  "service": "Student Savings Backend (Node.js/Express)",
  "env": "production",
  "time": "2026-10-17T00:52:00.000Z"
}
```
