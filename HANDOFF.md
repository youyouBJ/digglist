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

**Beta stable. Phase 1 Stabilisation en cours.**

Le test iPhone du 2026-05-12 a révélé plusieurs bugs P0 et demandes UX. La Phase 1 a été démarrée le même jour.

---

## Phase 1 — Stabilisation Beta (état)

### Fait (2026-05-12)

| Item | Fichier | État |
|------|---------|------|
| BUG-01 — Log an ID → `/ids/new` | `BottomNav.tsx` | ✅ |
| BUG-SC-01 — SC embed `m.soundcloud.com` + height sets | `track/[id]/page.tsx` | ✅ |
| BUG-STATUS-01 — `track.status` → `track.recordType` | `crates/[id]/page.tsx` | ✅ |
| UX-ADD-01 — Champ `videoAuthor` dans Add Track | `add-track/page.tsx` | ✅ |
| UX-NAV-01 — Supprimer "Log from a set" redondant | `BottomNav.tsx` | ✅ |
| UX-05 — "Auteur vidéo" → "Video author" | `track/[id]/page.tsx`, `edit/page.tsx` | ✅ |

### Restant Phase 1

| Item | Fichier | Complexité |
|------|---------|-----------|
| BUG-03 — timestampEnd seul invisible | `track/[id]/page.tsx` l.266 | XS |
| BUG-06 — Embed absent pour les IDs | `track/[id]/page.tsx` l.206 | XS |

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
| Log an ID — form dédié `/ids/new` (BUG-01 corrigé) | ✅ |
| Edit track — adaptatif (champs IDs si recordType=id_needed) | ✅ |
| Crates — création, édition, sous-crates, 24 couleurs | ✅ |
| Embed YouTube (avec timestamp natif) | ✅ |
| Embed SoundCloud (widget, hash strippé, fallback link) | ✅ |
| Metadata auto-fetch (YouTube, SC, TikTok, IG, Discogs) | ✅ |
| Navigation mobile Library ↔ IDs ↔ Crates sans refresh | ✅ |
| Search dans Library et IDs | ✅ |
| Filtre par crate dans Library et IDs | ✅ |
| BottomNav : Add sheet (2 options claires) + profil | ✅ |
| SC embed normalisé (m.soundcloud.com, height sets) | ✅ |
| crates/[id] : IDs détectés via `record_type` | ✅ |
| Video author dans Add Track | ✅ |

---

## Bugs connus restants

| ID | Sévérité | Description | Fichier | Complexité |
|----|----------|-------------|---------|-----------|
| BUG-02 | Moyenne | Back button Track Detail toujours vers /library même depuis /ids | `track/[id]/page.tsx` l.116 | S |
| BUG-03 | Moyenne | timestampEnd affiché seulement si les deux timestamps sont définis | `track/[id]/page.tsx` l.266 | XS |
| BUG-06 | Faible | Embed absent pour les IDs (condition `!isIds`) | `track/[id]/page.tsx` l.206 | XS |

---

## Ce qui N'est PAS encore fait

- Rating non visible dans les rows Library/IDs (persisté mais non affiché en liste)
- "Mark as found" flow dédié (actuellement ouvre le form edit complet)
- Tri / sort dans Library et IDs
- Crate pills sans count de tracks
- Sets — onglet, page, flow dédié (Phase 2)
- PWA manifest + Add to Home Screen (Phase 6)
- Partage public (Phase 6)
- Embed SoundCloud avec timestamp (Phase 2)
- Player global persistant (Phase 6)
- Support Spotify / Apple Music / Bandcamp (Phase 3)
- IA metadata / résumé / BPM (Phase 4)

---

## Prochaine tâche recommandée

### Phase 1 restante (15 min)

**BUG-03** — Afficher timestampEnd seul :
```tsx
// app/track/[id]/page.tsx ligne 266 — changer la condition :
{track.timestampEnd !== null && track.sourceTimestamp !== null && (  // ancien
{track.timestampEnd !== null && (                                    // nouveau
```
Si `sourceTimestamp` est null → afficher en row "End" au lieu de "Segment".

**BUG-06** — Embed pour les IDs :
```tsx
// app/track/[id]/page.tsx ligne 206 — changer :
{track.sourceUrl && !isIds && (    // ancien
{track.sourceUrl && (             // nouveau
```

### Phase 2 (prochain sprint)

1. Remplacer "You" par "Sets" dans BottomNav (nécessite page `/sets`)
2. Déplacer profil/logout dans le Header
3. Flow "Log from a set" dédié

---

## Fichiers clés à connaître

```
lib/types.ts              → type Track (source de vérité TypeScript)
lib/supabase-tracks.ts    → TrackRow, toTrack, toRow, CRUD functions
lib/supabase-crates.ts    → Crate CRUD, syncTrackCrates
lib/timestamp.ts          → extractTimestampFromUrl, parseManualTimestamp, formatTimestamp
lib/constants.ts          → PLATFORMS, CRATE_COLORS (24 couleurs), STATUSES (dépréciées UI)
app/api/fetch-metadata/   → Route API : oEmbed + scraping, toujours retourne 200
app/components/BottomNav.tsx → Nav mobile + sheet Add (2 options) — profil déplacé en Phase 2
app/track/[id]/page.tsx   → Détail track + embed SC normalisé (VOIR BUG-02/03/06)
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
4. Mettre à jour tous les call sites de `createTrack` / `updateTrack` (TypeScript guide)

### Règle documentation continue
**Après chaque tâche importante** : mettre à jour ROADMAP.md (cocher les items faits), HANDOFF.md (état actuel + prochaine priorité). Le README.md uniquement si les fonctionnalités ou la stack changent.

### Pièges à éviter
- **Ne jamais ré-ajouter des status pills** dans l'UI (To listen / To buy / To play / Inspiration)
- **Ne jamais utiliser `?ids=1` comme URL param** — c'est l'ancienne approche bugguée
- **Ne jamais utiliser `track.status === "IDs Needed"`** — utiliser `track.recordType === "id_needed"`
- **Ne jamais supprimer la colonne `status`** en DB sans migration des données
- **Toujours strip le hash `#t=...`** avant d'encoder une URL SoundCloud pour le widget
- **Toujours passer `user_id` dans les INSERTs** (tracks, crates) — la RLS rejette sinon
- **Ne jamais réintroduire `useSearchParams`** dans `/ids/page.tsx` — source du bug nav mobile original

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
- `ROADMAP.md` — backlog structuré par phases, bugs, décisions produit
- `TECHNICAL_NOTES.md` — schema DB, RLS, migrations, pièges techniques
- `SUPABASE.md` — doc initiale (partiellement obsolète, se fier à TECHNICAL_NOTES.md)
