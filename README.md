# Digglist

**Music discovery tracking app for DJs and record diggers.**

Save tracks from sets, identify unknown music, organise your discoveries with crates.

---

## Vision produit

Digglist est un carnet de bord musical personnel. Il permet de :
- **Sauvegarder** un track entendu dans un mix, sur YouTube, SoundCloud, Instagram ou TikTok
- **Logger un ID** — un morceau inconnu entendu dans un set, avec timestamp et contexte
- **Organiser** ses découvertes en crates (catégories libres, colorées, nestables)
- **Retrouver** via recherche, filtres crate, timestamps, notes
- **Écouter** directement dans l'app via embed YouTube/SoundCloud

L'app est pensée **mobile-first**, usage principal : iPhone en club ou chez soi après un set.

---

## Stack technique

| Élément | Version / Outil |
|---------|----------------|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| UI | React 19.2.4 |
| Langage | TypeScript 5 |
| Style | Tailwind CSS v4 |
| Base de données | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Fonts | Geist Sans + JetBrains Mono (timestamps) |
| Déploiement | Vercel (recommandé) |

---

## Variables d'environnement

Fichier `.env.local` à la racine (jamais commité) :

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

Ces valeurs se trouvent dans **Supabase Dashboard → Settings → Data API**.

---

## Commandes utiles

```bash
npm run dev      # serveur de développement (localhost:3000)
npm run build    # build de production (vérifie TypeScript)
npm run lint     # ESLint
```

**Toujours lancer `npm run build` avant de committer.** Le build valide TypeScript strictement.

---

## Structure des routes

```
/                       → Landing / redirect vers /library si connecté
/login                  → Connexion
/signup                 → Inscription

/library                → Bibliothèque principale (tracks identifiés uniquement)
/quick-add              → Ajout rapide par URL (paste → fetch → save en 2 taps)
/add-track              → Form détaillé : titre, artiste, label, timestamps, rating, crates

/ids                    → Liste des IDs Needed (tracks inconnus)
/ids/new                → Log an ID — form dédié avec video_author, timestamps, track ID hint

/track/[id]             → Détail track : embed YouTube/SoundCloud, metadata, crates
/track/[id]/edit        → Édition — adaptatif : champs IDs si recordType=id_needed

/crates                 → Liste des crates + stats
/crates/new             → Créer une crate (nom, couleur, description, parent)
/crates/[id]            → Détail crate : tracks filtrés
/crates/[id]/edit       → Éditer la crate

/sets                   → Liste des sets (titre, artiste, party, date)
/sets/new               → Créer un set + moments en draft inline
/sets/[id]              → Détail set : embed, moments (tracks + IDs), sheet "Log from set"
/sets/[id]/edit         → Éditer infos set + gérer moments existants

/api/fetch-metadata     → Route API serveur : oEmbed YouTube/SoundCloud/TikTok + HTML scraping
```

---

## Fonctionnalités actuelles

### Tracks
- Ajout rapide par URL (`/quick-add`) — auto-fetch metadata + timestamp depuis l'URL
- Form détaillé (`/add-track`) — titre, artiste, label, genre, mood, notes, timestamps début/fin, rating 5 étoiles, crates
- `recordType` : `"track"` (identifié) ou `"id_needed"` (inconnu) — séparateur autoritaire Library/IDs
- Rating 1–5 étoiles amber, persisté en DB, tap même étoile = effacer
- Timestamps : extraction auto depuis URL YouTube (`?t=`) / SoundCloud (`#t=`), saisie manuelle `12:43` / `1:12:43` / secondes

### IDs
- `/ids` — page dédiée, séparée de Library, amber-themed
- `/ids/new` — form complet : auteur vidéo, timestamp début/fin, Track ID hint, artiste connu, notes, rating, crates
- Les IDs n'apparaissent **jamais** dans Library

### Sets
- Créer un set avec titre, artiste/DJ, party/event, date, URL source, cover, notes
- Ajouter des moments (tracks ou IDs) en draft avant de sauvegarder (New Set)
- Gérer les moments existants : add/edit/delete via bottom sheet (Edit Set)
- "Log from set" — sheet inline pour logger un moment depuis le détail du set
- Moments liés dans la table `tracks` via `set_id`, triés par timestamp

### Embeds
- YouTube : iframe avec `?start=timestamp` si timestamp défini
- SoundCloud : widget officiel, hash fragment strippé (fix embed cassé), lien fallback toujours visible
- Spotify : iframe embed (track/episode 152px, album/playlist 352px) ; link card pour les pages artiste
- TikTok/Instagram/Bandcamp : pas d'iframe — link card "Open on …"

### Crates
- Création libre, 24 couleurs (8 familles × 3 nuances)
- Sous-crates (parentId)
- Ajout/retrait de tracks depuis la page détail (sheet modal)
- Filtre par crate dans Library et IDs
- Sync via `syncTrackCrates` (compare initial vs final, add/remove en diff)

### Metadata auto-fetch
- YouTube : oEmbed officiel → titre, auteur, thumbnail
- SoundCloud : oEmbed officiel → titre, artiste, thumbnail
- TikTok : oEmbed → si caption contient "Artiste - Titre" = pré-remplit ; sinon caption → notes
- Instagram : scraping og: tags → description, image, auteur
- Discogs : scraping og:title → split artiste/titre
- Générique : og:title + og:description + og:image

### Navigation
- BottomNav "+" button opens a creation hub: **Discover** (Add Track, Log ID) + **Organise** (New Set, New Crate)
- Crate color dots shown inline next to track/ID titles in Library and IDs for instant visual context

### Auth
- Email/password via Supabase Auth
- `useRequireAuth` hook — redirige vers `/login` si non connecté
- RLS : chaque utilisateur ne voit que ses propres données (`auth.uid() = user_id`)

---

## État actuel du projet

**Version : Beta stable (mai 2026)**

L'app est fonctionnelle end-to-end. Auth, tracks, IDs, crates, sets, embeds — tout fonctionne.
Les status (To listen / To buy / To play / Inspiration) existent en DB mais sont **invisibles dans l'UI** — l'organisation se fait via crates.
Les sets supportent maintenant artist, party et set_date, avec gestion complète des moments (add/edit/delete).

Voir `ROADMAP.md` pour ce qui reste à faire.
