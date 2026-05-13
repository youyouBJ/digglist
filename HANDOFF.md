# Handoff — Digglist

> Pour reprendre le projet dans une nouvelle conversation Claude Code sans perdre le contexte.

---

## C'est quoi ce projet ?

**Digglist** — app de tracking musical pour DJs et diggers.
Sauvegarder des tracks découverts dans des sets, logger des IDs inconnus, organiser en crates.

Stack : Next.js 16.2.6, React 19.2.4, TypeScript, Tailwind v4, Supabase (auth + Postgres + RLS).
L'app est mobile-first, pensée pour iPhone.

Repo local : `/Users/ybj/Desktop/claude digglist/digglist/`

---

## État actuel — Mai 2026

**Beta stable. Sprints 0 ✅ 2A ✅ 2B (partiel) ✅ 3A ✅ Bugfix-Media ✅ Sets-Enrichment ✅. Prochain : Sprint 3B (Apple Music) ou FEAT-SC-TS.**

---

## Prochaine tâche recommandée : Sprint 3B ou FEAT-SC-TS

**Bugfix Media Metadata — terminé ✅**

Ce qui est fait :
- `fetchBandcamp` : ajout `BROWSER_UA` sur oEmbed (était bloqué) + fallback HTML avec parser `", by "` pour le format Bandcamp
- `fetchSpotify` : nouveau fetcher, scrape `og:title` (nom du track), parse artiste depuis `<title>` via `/ by ([^|]+?)\s*\|\s*Spotify/i`
- `detectPlatform` : Spotify (`open.spotify.com`) ajouté
- `PLATFORMS` : `"Spotify"` ajouté entre SoundCloud et Bandcamp
- `TrackEmbed` + `SetEmbed` : iframe Spotify (152px pour track/episode, 352px pour album/playlist)
- `PlatformLinkCard` + link card SetEmbed : Spotify (`#1DB954`, badge `sp`) pour les pages artiste sans embed

**Sprint Sets Enrichment — terminé ✅**

Ce qui est fait :
- Migration SQL : colonnes `artist`, `party`, `set_date` ajoutées à la table `sets`
- `lib/types.ts` : `MixSet` étendu avec `artist`, `party`, `setDate`
- `lib/supabase-sets.ts` : `SetRow`, `toMixSet`, `createSet`, `updateSet` mis à jour ; `createSet` passe maintenant `user_id` (fix RLS critique)
- `app/sets/new/page.tsx` : rewritten — nouveaux champs Artist/DJ, Party/event, Date (input natif) + gestion de moments en draft inline avant save
- `app/sets/[id]/edit/page.tsx` : rewritten — form set info + section moments avec Edit/Delete/Add via bottom sheet
- `app/sets/[id]/page.tsx` : hero affiche `set.artist` (kicker teal) + `set.party` + `set.setDate` dans le sous-titre
- `app/sets/page.tsx` : SetRow affiche `set.artist` sous le titre, `set.party` dans la ligne info
- Timestamps (sourceTimestamp/timestampEnd) retirés de Add Track et Log an ID — réservés aux moments via "Log from set"

**Sprint 3A — Rich Media terminé ✅**

Ce qui est fait :
- `fetch-metadata` : `fetchBandcamp` via oEmbed public (titre, artiste, thumbnail)
- `PLATFORMS` : Bandcamp ajouté entre SoundCloud et Discogs
- `TrackEmbed` : `PlatformLinkCard` pour Bandcamp (bc), TikTok (tt), Instagram (ig)
- `SetEmbed` : même link card, fallback identique
- YouTube et SoundCloud inchangés

Choix suivants :
- **Sprint 3B** : Apple Music embed (Spotify fait, Apple Music reste — complexité M)
- **FEAT-SC-TS** : SoundCloud timestamp natif via SC Widget JS API (complexité L)

---

## Phase 1 — Stabilisation Beta ✅ Complète

| Item | Fichier | État |
|------|---------|------|
| BUG-01 — Log an ID → `/ids/new` | `BottomNav.tsx` | ✅ |
| BUG-SC-01 — SC embed `m.soundcloud.com` + height sets | `track/[id]/page.tsx` | ✅ |
| BUG-STATUS-01 — `track.status` → `track.recordType` | `crates/[id]/page.tsx` | ✅ |
| UX-ADD-01 — Champ `videoAuthor` dans Add Track | `add-track/page.tsx` | ✅ |
| UX-NAV-01 — Supprimer "Log from a set" redondant | `BottomNav.tsx` | ✅ |
| UX-05 — "Auteur vidéo" → "Video author" | `track/[id]/page.tsx`, `edit/page.tsx` | ✅ |
| BUG-03 — timestampEnd seul affiché | `track/[id]/page.tsx` | ✅ |
| BUG-06 — Embed activé pour les IDs (YouTube/SC) | `track/[id]/page.tsx` | ✅ |

---

## Ce qui est fait et fonctionnel

| Fonctionnalité | État |
|---------------|------|
| Auth email/password (Supabase) | ✅ |
| RLS — chaque user voit ses données uniquement | ✅ |
| Quick Add — paste URL, auto-fetch, save 2 taps | ✅ |
| Add Track — form complet avec tous les champs | ✅ |
| Rating 5 étoiles amber (persisté en DB) | ✅ |
| Timestamps début + fin (saisie manuelle ou auto-URL) | ✅ |
| Library — liste des tracks identifiés | ✅ |
| IDs — page dédiée `/ids`, séparée de Library | ✅ |
| Log an ID — form dédié `/ids/new` | ✅ |
| Edit track — adaptatif (champs IDs si recordType=id_needed) | ✅ |
| Crates — création, édition, sous-crates, 24 couleurs | ✅ |
| Embed YouTube (avec timestamp natif) | ✅ |
| Embed SoundCloud (widget, hash strippé, fallback link) | ✅ |
| Metadata auto-fetch (YouTube, SC, Spotify, TikTok, IG, Bandcamp, Discogs) | ✅ |
| Embed Spotify (track 152px, album/playlist 352px) | ✅ |
| Navigation mobile Library ↔ IDs ↔ Crates | ✅ |
| Search dans Library et IDs | ✅ |
| Filtre par crate dans Library et IDs | ✅ |
| BottomNav : Add sheet (2 options claires) | ✅ |
| Sets — colonnes artist, party, set_date | ✅ |
| New Set — form enrichi avec moments en draft inline | ✅ |
| Edit Set — form set info + gestion moments (add/edit/delete) via bottom sheet | ✅ |
| Sets list — affiche artist + party | ✅ |
| Sets detail — hero avec artist (kicker) + party + setDate | ✅ |

---

## Bugs connus restants

Aucun. BUG-02 corrigé (2026-05-12).

---

## Ce qui N'est PAS encore fait

- Rating non visible dans les rows Library/IDs (persisté mais non affiché en liste)
- "Mark as found" flow dédié (actuellement ouvre le form edit complet)
- Tri / sort dans Library et IDs
- Crate pills sans count de tracks
- ~~Sets — onglet, page, flow dédié~~ ✅ Sprint 2A
- PWA manifest + Add to Home Screen (Sprint 6)
- Partage public (Sprint 6)
- Embed SoundCloud avec timestamp (Sprint 2B)
- Support Apple Music (Sprint 3B — Spotify fait ✅)
- IA metadata / résumé (Sprint 4)

---

## Fichiers clés à connaître

```
lib/types.ts              → types Track, MixSet, MixSetWithCount, Crate (source de vérité TypeScript)
lib/supabase-tracks.ts    → TrackRow, toTrack, toRow, CRUD functions (inclut set_id)
lib/supabase-sets.ts      → MixSet CRUD, getSetTracks
lib/supabase-crates.ts    → Crate CRUD, syncTrackCrates
lib/timestamp.ts          → extractTimestampFromUrl, parseManualTimestamp, formatTimestamp
lib/constants.ts          → PLATFORMS, CRATE_COLORS (24 couleurs), STATUSES (dépréciées UI)
app/api/fetch-metadata/   → Route API : oEmbed + scraping, retourne toujours 200
app/components/BottomNav.tsx → Nav mobile + sheet Add (2 options)
app/track/[id]/page.tsx   → Détail track + embed SC normalisé
app/library/page.tsx      → Library + TrackRow (rating manquant en liste)
app/ids/page.tsx          → IDs + IdRow
app/add-track/page.tsx    → Form complet avec videoAuthor
app/crates/[id]/page.tsx  → Utilise correctement record_type (plus status)
app/sets/page.tsx         → Liste des sets
app/sets/new/page.tsx     → Créer un set (URL + fetch metadata + moments en draft inline)
app/sets/[id]/page.tsx    → Détail set + moments + sheet "Log moment" + hero enrichi (artist, party, setDate)
app/sets/[id]/edit/page.tsx → Éditer infos set (incl. artist, party, setDate) + gestion moments (add/edit/delete via bottom sheet)
```

---

## Consignes de travail

### Avant tout commit
```bash
npm run build   # obligatoire — valide TypeScript strictement
```

### Pattern si on ajoute une colonne DB
1. Exécuter le SQL dans Supabase Dashboard
2. Mettre à jour `Track` dans `lib/types.ts`
3. Mettre à jour `TrackRow`, `toTrack`, `toRow` dans `lib/supabase-tracks.ts`
4. Mettre à jour tous les call sites de `createTrack` / `updateTrack`

### Règle documentation continue
Après chaque tâche importante : mettre à jour ROADMAP.md (cocher les items) et HANDOFF.md (état actuel + prochaine priorité).

### Pièges à éviter
- **Ne jamais ré-ajouter des status pills** dans l'UI
- **Ne jamais utiliser `?ids=1` comme URL param**
- **Ne jamais utiliser `track.status === "IDs Needed"`** — utiliser `track.recordType === "id_needed"`
- **Ne jamais supprimer la colonne `status`** en DB sans migration des données
- **Toujours strip le hash `#t=...`** avant d'encoder une URL SoundCloud pour le widget
- **Toujours passer `user_id` dans les INSERTs** (RLS rejette sinon)
- **Ne jamais réintroduire `useSearchParams`** dans `/ids/page.tsx`

### Style de code
- Pas de commentaires sauf si le WHY est non-évident
- Pas de `console.log` laissés
- CSS inline via `style={{}}` avec les CSS variables (`var(--bg)`, `var(--t1)`, `var(--amber)`)
- Tailwind pour layout/spacing, CSS variables pour les couleurs thématiques
- Mobile-first : tester sur viewport 390px

---

## Variables d'environnement nécessaires

```env
# .env.local (jamais commité)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
# Sprint 4 uniquement :
# ANTHROPIC_API_KEY=<clé>
```

---

## Documentation complémentaire

- `README.md` — vision, stack, routes, fonctionnalités
- `ROADMAP.md` — roadmap d'exécution complète, backlog par sprint, migrations SQL, risques
- `TECHNICAL_NOTES.md` — schema DB, RLS, migrations, pièges techniques
- `SUPABASE.md` — doc initiale (partiellement obsolète, se fier à TECHNICAL_NOTES.md)
