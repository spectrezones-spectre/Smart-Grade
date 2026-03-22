# 📘 Smart Grade

# 🚀 Objectif du projet

Créer une application moderne, scalable et pédagogique permettant :

- une gestion simple des données scolaires
- une architecture propre et maintenable
- une base solide pour évoluer vers un produit complet

---

# 🧱 Stack technique

- Frontend : React + TypeScript
- UI : TailwindCSS + composants personnalisés
- Backend : Supabase (Auth + Database + RLS)
- Routing : React Router
- State global : Context API
- Notifications : Sonner (toast)

# 🔐 Rapport d’implémentation actuel — Système de Login (Smart Grade)

---

## 🎯 Objectif

Mettre en place un système d’authentification complet permettant :

- la création de compte (signup)
- la connexion utilisateur (login)
- la gestion des sessions
- une expérience utilisateur fluide et sécurisée

---

## 🧱 Technologies utilisées

- React + TypeScript
- Supabase Auth
- TailwindCSS
- Sonner (notifications toast)

---

## ⚙️ Fonctionnement global

Le système repose sur Supabase Auth :

1. L’utilisateur remplit le formulaire  
2. Le frontend envoie les données à Supabase  
3. Supabase gère :
   - la création du compte
   - la validation
   - la session  
4. Le frontend affiche le résultat (succès ou erreur)

---

## 🧩 Implémentation

### 📄 Composant Login

Fonctionnalités :

- Toggle entre login et signup  
- Gestion des états :
  - email
  - password
  - fullName
  - loading  
- Soumission du formulaire avec `handleSubmit`

---

### 🔐 Signup

```ts
supabase.auth.signUp({
  email,
  password,
  options: {
    data: { full_name: fullName },
    emailRedirectTo: window.location.origin,
  },
});
