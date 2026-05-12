# 🌿 Refuto La Ferme Urbaine — Guide de déploiement

## Ce que vous allez faire (dans l'ordre)
1. Créer votre base de données Supabase (gratuit)
2. Mettre le code sur GitHub (gratuit)
3. Déployer sur Vercel (gratuit)
4. Créer vos comptes utilisateurs
5. Tester l'application en ligne

Durée estimée : 45–90 minutes

---

## ÉTAPE 1 — Supabase (Base de données)

### 1.1 Créer le compte
1. Allez sur **supabase.com**
2. Cliquez **Start your project** → Sign up avec Google ou votre courriel
3. Confirmez votre courriel si demandé

### 1.2 Créer le projet
1. Cliquez **New project**
2. Nom du projet : `refuto-ferme`
3. Database password : choisissez un mot de passe fort et **notez-le**
4. Region : **Canada (ca-central-1)**
5. Cliquez **Create new project** — attendez ~2 minutes

### 1.3 Créer les tables (copier-coller le SQL)
1. Dans votre projet Supabase, cliquez **SQL Editor** dans le menu gauche
2. Cliquez **+ New query**
3. Ouvrez le fichier `supabase_schema.sql` de ce dossier
4. Copiez TOUT le contenu et collez-le dans l'éditeur Supabase
5. Cliquez **Run** (bouton vert)
6. Vous devriez voir "Success. No rows returned" — c'est bon!

### 1.4 Récupérer vos clés API
1. Cliquez **Project Settings** (icône engrenage en bas à gauche)
2. Cliquez **API**
3. Notez ces deux valeurs (vous en aurez besoin plus tard) :
   - **Project URL** → ressemble à `https://abcdefgh.supabase.co`
   - **anon public key** → longue chaîne de caractères

### 1.5 Configurer l'authentification
1. Cliquez **Authentication** dans le menu gauche
2. Cliquez **Providers** → assurez-vous que **Email** est activé
3. Allez dans **Settings** → désactivez "Confirm email" pour l'instant
   (vous pourrez le réactiver plus tard)

---

## ÉTAPE 2 — GitHub (Code)

### 2.1 Créer le compte (si pas déjà fait)
1. Allez sur **github.com** → Sign up
2. Confirmez votre courriel

### 2.2 Créer le repository
1. Cliquez le **+** en haut à droite → **New repository**
2. Repository name : `refuto-ferme`
3. Laissez **Public** coché
4. Cliquez **Create repository**

### 2.3 Uploader les fichiers
Sur la page de votre nouveau repository :
1. Cliquez **uploading an existing file**
2. Glissez-déposez TOUS les fichiers de ce dossier `refuto/`
   - ⚠️ Important : glissez les fichiers ET les dossiers (src/, etc.)
3. En bas de la page, cliquez **Commit changes**

**Structure finale attendue sur GitHub :**
```
refuto-ferme/
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── supabase.js
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── .gitignore
├── .env.example
└── supabase_schema.sql
```

---

## ÉTAPE 3 — Vercel (Hébergement)

### 3.1 Créer le compte
1. Allez sur **vercel.com**
2. Cliquez **Sign Up** → choisissez **Continue with GitHub**
3. Autorisez Vercel à accéder à GitHub

### 3.2 Importer votre projet
1. Cliquez **Add New** → **Project**
2. Vous verrez votre repo `refuto-ferme` → cliquez **Import**
3. Framework : Vercel devrait détecter **Vite** automatiquement
4. **NE CLIQUEZ PAS DEPLOY ENCORE** — il faut d'abord les variables d'environnement

### 3.3 Ajouter les variables d'environnement (CRUCIAL)
Toujours sur la page de configuration Vercel :
1. Ouvrez la section **Environment Variables**
2. Ajoutez la première variable :
   - Name : `VITE_SUPABASE_URL`
   - Value : votre Project URL de Supabase (ex: `https://abcdefgh.supabase.co`)
3. Ajoutez la deuxième variable :
   - Name : `VITE_SUPABASE_ANON_KEY`
   - Value : votre anon public key de Supabase
4. Maintenant cliquez **Deploy**
5. Attendez ~2 minutes → vous obtenez une URL comme `refuto-ferme.vercel.app` 🎉

---

## ÉTAPE 4 — Créer les comptes utilisateurs

### 4.1 Créer le compte du propriétaire (vous)
Dans Supabase → **Authentication** → **Users** :
1. Cliquez **Add user** → **Create new user**
2. Email : `patron@refuto.ca` (ou votre vrai courriel)
3. Password : votre mot de passe
4. Cliquez **Create user**
5. Copiez le **UUID** de cet utilisateur (colonne User UID)

### 4.2 Ajouter le profil en base de données
Dans Supabase → **Table Editor** → table **users** :
1. Cliquez **Insert** → **Insert row**
2. Remplissez :
   - `auth_id` : le UUID copié à l'étape 4.1
   - `name` : votre nom ou "Patron"
   - `email` : même courriel qu'à l'étape 4.1
   - `role` : `admin`
   - `avatar` : 🌿
3. Sauvegardez

### 4.3 Répétez pour chaque employé(e)
Même processus — role : `employee`, ajoutez `hourly_rate` et `position`

### 4.4 Répétez pour chaque client
Même processus — role : `client`

---

## ÉTAPE 5 — Tester

1. Allez sur votre URL Vercel (ex: `refuto-ferme.vercel.app`)
2. Connectez-vous avec vos identifiants du propriétaire
3. Testez : ajoutez un produit à l'inventaire, placez une commande test
4. Ouvrez un autre onglet, connectez-vous en tant que client
5. Vérifiez que le produit apparaît dans la boutique
6. Placez une commande → retournez dans l'onglet admin → la commande apparaît instantanément ✓

---

## Domaine personnalisé (optionnel)

Pour avoir `app.refutoferme.ca` au lieu de `refuto-ferme.vercel.app` :
1. Achetez un domaine sur **Namecheap.com** (~15$/an)
2. Dans Vercel → votre projet → **Settings** → **Domains**
3. Ajoutez votre domaine et suivez les instructions DNS

---

## Problèmes courants

**"Invalid API key"** → vérifiez vos variables d'environnement dans Vercel

**"User not found"** → vérifiez que le profil existe dans la table `users` avec le bon `auth_id`

**Écran blanc après déploiement** → allez dans Vercel → votre projet → **Deployments** → cliquez le déploiement → **Functions** pour voir les erreurs

**Les données ne s'affichent pas** → vérifiez que le SQL a bien été exécuté dans Supabase (Tables Editor → vous devriez voir les tables)

---

## Assistance

Si vous êtes bloqué à une étape, prenez une capture d'écran et revenez me la montrer — je vous guiderai étape par étape.
