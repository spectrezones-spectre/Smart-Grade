# Smart Grade

Smart Grade est une application web de gestion scolaire orientee enseignant.
Le projet permet de gerer l'authentification, les eleves, les matieres, les notes, les bulletins et un tableau de bord analytique.

## Apercu

Fonctionnalites actuellement presentes :

- authentification avec Supabase Auth
- espace protege apres connexion
- gestion des eleves
- gestion des matieres
- saisie et suppression des notes
- consultation de bulletins
- tableau de bord avec indicateurs et visualisations

Le projet utilise une architecture frontend simple, lisible et evolutive autour de React, TypeScript et Supabase.

## Stack technique

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Radix UI
- React Router
- TanStack Query
- Supabase
- Recharts
- Sonner

## Structure du projet

```text
smart-grade/
├── public/
├── src/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── integrations/
│   │   └── supabase/
│   ├── lib/
│   ├── pages/
│   ├── App.tsx
│   └── main.tsx
├── supabase/
├── .env
├── netlify.toml
├── vercel.json
├── package.json
└── README.md
```

## Pages principales

- `Login` : connexion et inscription
- `Dashboard` : version locale de demonstration avec donnees fictives
- `Students` : gestion des eleves
- `StudentDetails` : detail d'un eleve
- `Subjects` : gestion des matieres
- `Grades` : gestion des notes
- `Reports` : consultation des bulletins
- `NotFound` : page 404

Note :
`src/pages/Dashboard.tsx` contient actuellement une version locale de test.
La version connectee aux vraies donnees a ete conservee dans `src/pages/Dashboard_old.tsx`.

## Demarrage rapide

### 1. Installer les dependances

```bash
npm install
```

### 2. Configurer les variables d'environnement

Creez ou completez le fichier `.env` avec :

```env
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
VITE_SUPABASE_PROJECT_ID="your-project-id"
```

## Scripts disponibles

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run test
```

Description rapide :

- `npm run dev` : lance le serveur de developpement
- `npm run build` : genere le build de production
- `npm run preview` : sert le build localement
- `npm run lint` : verifie la qualite statique du code
- `npm run test` : lance les tests

## Authentification et donnees

L'application s'appuie sur Supabase pour :

- l'authentification
- la persistance des sessions
- le stockage des donnees metier

Le contexte global centralise la session et plusieurs collections utiles :

- `students`
- `subjects`
- `grades`
- `classes`
- `schoolYears`
- `profile`

La logique principale de synchronisation est exposee dans :

- `src/context/GlobalContext.tsx`
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`

## Routage

Le routage est defini dans `src/App.tsx`.

Comportement actuel :

- utilisateur non connecte : affichage de `Login`
- utilisateur connecte : affichage du layout protege avec sidebar et navbar
- route racine `/` : redirection vers `/dashboard`

## Deploiement

Le projet contient deja des configurations de redirection SPA pour :

- Netlify via `netlify.toml`
- Vercel via `vercel.json`

### Build de production

```bash
npm run build
```

Le build doit produire un dossier `dist/`.

### Variables a definir en production

Pensez a ajouter ces variables dans votre plateforme de deploiement :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

## Etat actuel du projet

Le projet compile et peut produire un build de production.
Selon l'etat du depot, certaines regles ESLint peuvent encore devoir etre nettoyees avant un deploiement strict avec pipeline CI.

## Contribution

Si vous travaillez sur ce depot :

- gardez les composants et pages bien documentes
- privilegiez les types issus de `src/integrations/supabase/types.ts`
- evitez de casser les flux `GlobalContext` et `Supabase`
- testez au minimum le build avant de pousser

## Licence

Aucune licence n'est encore definie dans ce depot.
