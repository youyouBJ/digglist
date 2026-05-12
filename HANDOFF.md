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

**Beta stable.** L'app est fonctionnelle end-to-end. Pas de build cassé, pas de bugs bloquants connus.

### Ce qui est fait et fonctionnel

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
| Embed YouTube (avec timestamp) | ✅ |
| Embed SoundCloud (widget, fallback link) | ✅ |
| Metadata auto-fetch (YouTube, SC, TikTok, IG, Discogs) | ✅ |
| Navigation mobile Library ↔ IDs ↔ Crates sans refresh | ✅ |
| Search dans Library et IDs | ✅ |
| Filtre par crate dans Library et IDs | ✅ |

### Ce qui N'est PAS encore fait

- Rating non visible dans les rows Library/IDs (persisté mais non affiché en liste)
- "Mark as found" flow dédié (actuellement ouvre le form edit)
- Timestamp fin affiché seul dans detail (affiché seulement en segment début→fin)
- Embed SoundCloud ne jump pas au timestamp (JS API non implémentée)
- Pas de sort/tri dans Library
- Pas de partage public
- Pas d'import/export

---

## Derniers commits importants

```
2313f4f  Beta bugfix: SoundCloud embed, status pills, timestamps, rating, crate colors
045dad1  Edit form: full ID support (videoAuthor, trackIdHint, timestampEnd)
1db5be9  Add /ids/new — dedicated Log an ID form + new DB fields
11d5c13  Audit fixes: status pills, timestamp input, embeds, TikTok split
2ed7ac2  Activate rating persistence in toRow (SQL column confirmed)
953b535  Step 3: 5-star rating system + remove status pills from UI
51e9fc1  feat: integrate record_type as authoritative Library/IDs separator
b1f82b1  fix(nav): separate IDs into dedicated /ids route
```

---

## Fichiers clés à connaître

```
lib/types.ts              → type Track (source de vérité TypeScript)
lib/supabase-tracks.ts    → TrackRow, toTrack, toRow, CRUD functions
lib/supabase-crates.ts    → Crate CRUD, syncTrackCrates
lib/timestamp.ts          → extractTimestampFromUrl, parseManualTimestamp, formatTimestamp
lib/constants.ts          → PLATFORMS, CRATE_COLORS (24 couleurs), STATUSES (dépréciées UI)
app/api/fetch-metadata/   → Route API : oEmbed + scraping, toujours retourne 200
```

---

## Prochaine tâche recommandée

### Option A — Rating dans les rows (impact UX immédiat)
Ajouter un indicateur compact dans `TrackRow` (Library) et `IdRow` (IDs) si `track.rating !== null`.
Exemple : petites étoiles amber `★★★★☆` ou juste `★ 4` en fin de ligne.
Fichiers : `app/library/page.tsx`, `app/ids/page.tsx`.

### Option B — "Mark as found" flow
Actuellement dans `track/[id]/page.tsx`, le bouton "Mark as found" ouvre juste `/track/${id}/edit`.
Créer un vrai flow : changer `recordType` → `"track"`, demander confirmation titre/artiste, rediriger vers Library.
Nécessite une action dédiée dans `supabase-tracks.ts`.

### Option C — Afficher timestamp fin seul
Dans `track/[id]/page.tsx`, le segment `début → fin` s'affiche seulement si les deux sont définis.
Afficher aussi `timestampEnd` seul si `sourceTimestamp` est null.

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
4. Mettre à jour tous les call sites de `createTrack` / `updateTrack` (TypeScript guide)

### Pièges à éviter
- **Ne jamais ré-ajouter des status pills** dans l'UI (To listen / To buy / To play / Inspiration)
- **Ne jamais utiliser `?ids=1` comme URL param** — c'est l'ancienne approche bugguée
- **Ne jamais supprimer la colonne `status`** en DB sans migration des données
- **Toujours strip le hash `#t=...`** avant d'encoder une URL SoundCloud pour le widget
- **Toujours passer `user_id` dans les INSERTs** (tracks, crates) — la RLS rejette sinon

### Style de code
- Pas de commentaires sauf si le WHY est non-évident
- Pas de `console.log` laissés
- CSS inline via `style={{}}` avec les CSS variables du design system (`var(--bg)`, `var(--t1)`, `var(--amber)`, etc.)
- Tailwind pour layout/spacing, CSS variables pour les couleurs thématiques
- Mobile-first : tester sur viewport 390px

---

## Variables d'environnement nécessaires

```env
# .env.local (jamais commité)
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

---

## Documentation complémentaire

- `README.md` — vision, stack, routes, fonctionnalités
- `ROADMAP.md` — backlog, bugs connus, décisions produit, choses à éviter
- `TECHNICAL_NOTES.md` — schema DB, RLS, migrations, pièges techniques
- `SUPABASE.md` — doc initiale (partiellement obsolète, se fier à TECHNICAL_NOTES.md)
