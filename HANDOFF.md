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

**Beta stable. Phase 1 complète. Sprint 0 UX Quick Wins en cours (4/7).**

---

## Prochaine tâche recommandée : Sprint 0 — UX Quick Wins

**Sprint 0 en cours. 6/7 tâches faites.**

1. ~~BUG-02 — Back button conditionnel~~ ✅
2. ~~UX-01 — Rating ★ + crate dots dans les rows~~ ✅
3. ~~UX-DENSITY-01 — Notes line-clamp-1 + timestamp range~~ ✅
4. ~~CRATES-COUNT-01 — Crate filter pills avec count~~ ✅
5. ~~SORT-01 — Tri Library et IDs (Date ↓, Rating ↓, A–Z)~~ ✅
6. ~~UX-FOUND-01 — "Mark as found" sheet légère~~ ✅
6. **UX-FOUND-01** — "Mark as found" sheet légère 3 champs — `track/[id]/page.tsx` — complexité M
7. **CRATES-VIS-02** — Hiérarchie visuelle sous-crates — `crates/page.tsx` — complexité S

Aucune migration SQL dans ce sprint. Aucune nouvelle route. ~1–2 sessions.

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
| Metadata auto-fetch (YouTube, SC, TikTok, IG, Discogs) | ✅ |
| Navigation mobile Library ↔ IDs ↔ Crates | ✅ |
| Search dans Library et IDs | ✅ |
| Filtre par crate dans Library et IDs | ✅ |
| BottomNav : Add sheet (2 options claires) | ✅ |

---

## Bugs connus restants

Aucun. BUG-02 corrigé (2026-05-12).

---

## Ce qui N'est PAS encore fait

- Rating non visible dans les rows Library/IDs (persisté mais non affiché en liste)
- "Mark as found" flow dédié (actuellement ouvre le form edit complet)
- Tri / sort dans Library et IDs
- Crate pills sans count de tracks
- Sets — onglet, page, flow dédié (Sprint 2A/2B)
- PWA manifest + Add to Home Screen (Sprint 6)
- Partage public (Sprint 6)
- Embed SoundCloud avec timestamp (Sprint 2B)
- Support Spotify / Apple Music / Bandcamp (Sprint 3)
- IA metadata / résumé (Sprint 4)

---

## Fichiers clés à connaître

```
lib/types.ts              → type Track (source de vérité TypeScript)
lib/supabase-tracks.ts    → TrackRow, toTrack, toRow, CRUD functions
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
