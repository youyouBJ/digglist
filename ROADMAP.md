# Roadmap Digglist
> Dernière mise à jour : 2026-05-12
> État : Phase 1 Stabilisation **complète**. Sprint UX à lancer.

---

## Roadmap d'exécution — Vue d'ensemble

| Sprint | Nom | Sessions est. | État |
|--------|-----|---------------|------|
| 0 | UX Quick Wins | 1–2 | **À lancer** |
| 2A | Sets — Infrastructure | 2–3 | À faire |
| 2B | Sets — Flow + SC Timestamp | 2–3 | À faire |
| 3A | Rich Media — Bandcamp + TikTok preview | 1 | À faire |
| 3B | Rich Media — Spotify + Apple Music | 2–3 | À faire |
| 4 | Smart Metadata / AI | 2 | À faire |
| 5 | Crates Evolution | 1–2 | À faire |
| 6 | Polish V1 | 2–3 | À faire |

**Total estimé : 13–19 sessions Claude Code**

---

## Sprint 0 — UX Quick Wins
> Objectif : liquider les frictions visibles et bug restant avant d'entrer en Phase 2.
> Aucune migration SQL. Aucune nouvelle route. Sessions : 1–2.

### Ordre d'exécution

| Ordre | ID | Description | Fichier | Complexité | Dépendances | État |
|-------|----|-------------|---------|-----------|-------------|------|
| 1 | BUG-02 | Back button Track Detail conditionnel | `track/[id]/page.tsx` | S | aucune | ✅ |
| 2 | UX-01 | Rating ★ + crate dots dans les rows Library et IDs | `library/page.tsx`, `ids/page.tsx` | S | aucune | ✅ |
| 3 | UX-06 / UX-DENSITY-01 | Notes line-clamp-1 + timestamp range | `library/page.tsx`, `ids/page.tsx` | XS | aucune | ✅ |
| 4 | UX-03 / CRATES-COUNT-01 | Crate filter pills avec count `Techno 12` | `library/page.tsx`, `ids/page.tsx` | S | aucune | ✅ |
| 5 | SORT-01 | Tri Library et IDs : Date ↓, Rating ↓, A–Z | `library/page.tsx`, `ids/page.tsx` | S | aucune | ✅ |
| 6 | UX-FOUND-01 | "Mark as found" — sheet légère 3 champs | `track/[id]/page.tsx` | M | aucune | ✅ |
| 7 | CRATES-VIS-02 | Hiérarchie visuelle sous-crates | `crates/page.tsx` | S | aucune | À faire |

**À éviter dans ce sprint :**
- UX-08 (Add Track form reorder) — risque de régression sur un form complexe
- UX-09 (transitions) — prématuré, App Router + framer-motion = complexité non justifiée maintenant

---

## Sprint 2A — Sets System : Infrastructure
> Objectif : créer la base du Sets System (DB + page + nav).
> **1 migration SQL requise.**
> Sessions : 2–3.

### Migration SQL à préparer

```sql
-- Table sets
create table public.sets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id),
  title           text not null default '',
  source_url      text not null default '',
  source_platform text not null default '',
  image_url       text not null default '',
  notes           text not null default '',
  created_at      timestamptz not null default now()
);

-- RLS
alter table public.sets enable row level security;
create policy "Users manage own sets"
  on public.sets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Lien track → set (optionnel, utile pour "Log from a set")
alter table public.tracks
  add column set_id uuid references public.sets(id) on delete set null;
```

### Ordre d'exécution

| Ordre | ID | Description | Fichier | Complexité | Dépendances |
|-------|----|-------------|---------|-----------|-------------|
| 1 | DB-SET-01 | Migration SQL sets + set_id sur tracks | Supabase Dashboard | S | aucune |
| 2 | LIB-SET-01 | `lib/types.ts` + `lib/supabase-sets.ts` (Set type, CRUD) | lib/ | S | DB-SET-01 |
| 3 | FEAT-SET-01 | Page `/sets` — liste des sets sauvegardés | `app/sets/page.tsx` | M | LIB-SET-01 |
| 4 | NAV-01 | Remplacer "You" par "Sets" dans BottomNav | `BottomNav.tsx` | S | FEAT-SET-01 |
| 5 | NAV-02 | Déplacer logout/profil dans le Header | `Header.tsx` ou nouveau composant | S | NAV-01 |

**Dépendance clé** : NAV-01 ne peut pas précéder FEAT-SET-01 — l'onglet doit pointer sur une page existante.

---

## Sprint 2B — Sets System : Flow + SC Timestamp
> Objectif : compléter le flow "Log from a set" et le timestamp SoundCloud.
> Sessions : 2–3.

### Ordre d'exécution

| Ordre | ID | Description | Fichier | Complexité | Dépendances |
|-------|----|-------------|---------|-----------|-------------|
| 1 | FEAT-SET-02 | Flow "Log from a set" : URL set + timestamp → form pré-rempli | `app/sets/log/page.tsx` | M | FEAT-SET-01 |
| 2 | FEAT-SC-TS | SoundCloud embed avec timestamp (SC Widget JS API `seekTo`) | `track/[id]/page.tsx` | L | aucune (indépendant) |
| 3 | FEAT-AUTOPLAY | Auto-play au timestamp quand track vient d'un set | `track/[id]/page.tsx` | M | FEAT-SC-TS + set_id sur Track |

**Risque SC Widget JS API** : l'API `SC.Widget` communique via `postMessage` cross-origin. Timing subtil — le widget doit être ready avant `seekTo`. Risque de régression sur l'embed existant. **Traiter FEAT-SC-TS en dernier dans ce sprint.**

---

## Sprint 3A — Rich Media : Bandcamp + TikTok preview
> Objectif : gains faciles sur les embeds manquants.
> Aucune migration SQL. Sessions : 1.

### Ordre d'exécution

| Ordre | ID | Description | Fichier | Complexité | Dépendances |
|-------|----|-------------|---------|-----------|-------------|
| 1 | EMBED-BC-01 | Bandcamp embed + metadata auto (oEmbed public) | `api/fetch-metadata/`, `track/[id]/page.tsx` | S | aucune |
| 2 | EMBED-TT-01 | TikTok/Instagram : afficher miniature ou placeholder coloré si thumbnail absent | `track/[id]/page.tsx`, `ids/page.tsx` | M | aucune |

**Note Bandcamp** : oEmbed est public (`https://bandcamp.com/oembed?url=...`). L'embed est une iframe standard. Complexité réelle : XS–S.

---

## Sprint 3B — Rich Media : Spotify + Apple Music
> Objectif : couvrir les plateformes streaming majeures.
> Aucune migration SQL. Sessions : 2–3.

### Ordre d'exécution

| Ordre | ID | Description | Fichier | Complexité | Dépendances |
|-------|----|-------------|---------|-----------|-------------|
| 1 | EMBED-SP-01 | Spotify embed (iframe `open.spotify.com/embed/track/…`) + oEmbed metadata | `api/fetch-metadata/`, `track/[id]/page.tsx` | M | aucune |
| 2 | EMBED-AM-01 | Apple Music embed (iframe `embed.music.apple.com`) + metadata scraping | `api/fetch-metadata/`, `track/[id]/page.tsx` | M | aucune |

**Risque Spotify** : oEmbed Spotify est public mais peut nécessiter une API key selon le endpoint utilisé. L'iframe embed fonctionne sans clé. À vérifier au moment de l'implémentation.

**Risque Apple Music** : l'API MusicKit JS est complexe. Pour le beta, viser l'iframe embed simple uniquement + og: scraping pour les métadonnées.

---

## Sprint 4 — Smart Metadata / AI
> Objectif : réduire la friction de saisie via IA.
> Sessions : 2.

### Infrastructure à décider avant

Option A : **Route API interne** (`/api/ai-metadata`) qui appelle Claude API (Anthropic) — cohérent avec la stack.
Option B : **Enrichissement côté client** — non recommandé (clé API exposée).

**Recommandation** : Option A, route authentifiée comme `/api/fetch-metadata`.

Variable d'env à ajouter : `ANTHROPIC_API_KEY` (ou `OPENAI_API_KEY` si OpenAI).

### Ordre d'exécution

| Ordre | ID | Description | Fichier | Complexité | Dépendances |
|-------|----|-------------|---------|-----------|-------------|
| 1 | AI-INFRA-01 | Route `/api/ai-metadata` — reçoit titre/description, retourne artist/title/genre | `app/api/ai-metadata/route.ts` | M | API key configurée |
| 2 | AI-META-01 | Intégrer AI-INFRA-01 dans Quick Add + Add Track : bouton "Suggest" ou auto-call | `quick-add/page.tsx`, `add-track/page.tsx` | M | AI-INFRA-01 |
| 3 | AI-DESC-01 | Résumé IA des longues descriptions TikTok/Instagram dans les notes d'un ID | `api/ai-metadata/route.ts` + `ids/new/page.tsx` | S | AI-INFRA-01 |

**BPM-01 — déféré** : complexité XL, aucune API publique fiable pour l'extraction BPM à un timestamp. Ne pas développer avant d'avoir un use case validé avec une API spécifique.

---

## Sprint 5 — Crates Evolution
> Objectif : enrichir les crates visuellement et fonctionnellement.
> **1 migration SQL optionnelle** (icônes).
> Sessions : 1–2.

### Migration SQL optionnelle

```sql
-- Icône/symbole sur les crates (emoji ou identifiant de symbole)
alter table public.crates
  add column icon text not null default '';
-- Note : image_url est déjà en DB mais non utilisée en UI
```

### Ordre d'exécution

| Ordre | ID | Description | Fichier | Complexité | Dépendances |
|-------|----|-------------|---------|-----------|-------------|
| 1 | CRATES-SORT-01 | Réordonner les crates manuellement (flèches ou drag) | `crates/page.tsx` | S | `position` déjà en DB |
| 2 | CRATES-VIS-01 | Motifs/icônes en plus des couleurs (emojis ou symboles) | `crates/new/page.tsx`, `crates/[id]/edit/page.tsx` | M | migration icon |

**Note** : CRATES-COUNT-01 et CRATES-VIS-02 sont déjà dans Sprint 0 et faits en amont.

---

## Sprint 6 — Polish V1
> Objectif : finitions avant ouverture/partage.
> **1 migration SQL pour le partage public.**
> Sessions : 2–3.

### Migration SQL pour le partage

```sql
-- Token de partage public (UUID aléatoire par track/crate)
alter table public.tracks
  add column share_token uuid unique default gen_random_uuid();

alter table public.crates
  add column share_token uuid unique default gen_random_uuid();

-- Policy SELECT publique (sans auth) sur share_token
create policy "Public read by share_token — tracks"
  on public.tracks for select
  using (share_token is not null);

create policy "Public read by share_token — crates"
  on public.crates for select
  using (share_token is not null);
```

### Ordre d'exécution

| Ordre | ID | Description | Fichier | Complexité | Dépendances |
|-------|----|-------------|---------|-----------|-------------|
| 1 | PWA-01 | Manifest + Add to Home Screen + icônes 192/512px | `public/manifest.json`, `app/layout.tsx` | S | aucune |
| 2 | UX-08 | Add Track form : revoir hiérarchie des champs | `add-track/page.tsx` | S | aucune |
| 3 | SHARE-01 | Lien public `/share/track/[token]` + `/share/crate/[token]` | nouvelles routes + migration | M | migration share |
| 4 | ANIM-01 | Transitions de page simples (CSS uniquement, pas framer-motion) | `app/layout.tsx` | M | aucune |

---

## Migrations SQL — Récapitulatif global

| Sprint | Migration | Colonnes / Tables | Urgence |
|--------|-----------|-------------------|---------|
| 2A | `public.sets` + `tracks.set_id` | Nouvelle table + FK | Requis pour Phase 2 |
| 5 | `crates.icon` | Colonne text | Optionnel (si motifs) |
| 6 | `tracks.share_token` + `crates.share_token` + policies | 2 colonnes + 2 policies | Requis pour partage |

**Ce qui n'a PAS besoin de migration :**
- Bandcamp / Spotify / Apple Music embeds → uniquement code
- AI metadata → uniquement code + env var
- PWA → uniquement `public/` + layout
- Rating visible, sort, notes density, mark as found → uniquement code

---

## Risques par sprint

| Sprint | Risque | Mitigation |
|--------|--------|-----------|
| 2B | SC Widget JS API — timing `seekTo` cross-frame | Implémenter en dernier, avec fallback gracieux sur l'embed statique |
| 2B | Sets DB design — set_id nullable sur tracks, évolution possible | Garder set_id nullable, pas de contrainte trop stricte |
| 3B | Spotify oEmbed potentiellement authentifié | Tester l'endpoint public avant de s'engager |
| 3B | Apple Music embed — MusicKit JS complexe | Viser iframe simple uniquement, pas MusicKit |
| 4 | Latence IA dans Quick Add (dégrade la fluidité) | Appel IA optionnel (bouton "Suggest"), jamais bloquant |
| 4 | BPM — aucune API publique fiable | Ne pas développer, rester en "Later" |
| 6 | RLS policies publiques — risque d'exposition données | Tester en staging, vérifier que la policy est sur share_token non null |

---

## Tâches à ne pas toucher maintenant

| Tâche | Raison |
|-------|--------|
| BPM-01 | Complexité XL, aucune API fiable |
| Player global persistant | Complexité XL, architecture App Router — "Later" |
| IA / Spotify / Apple Music / Bandcamp | Avant Phase 3/4 respectivement |
| Sets System | Avant Sprint 0 terminé |
| Transitions/animations framer-motion | Overhead de dépendance non justifié |
| Export CSV/JSON | Hors scope beta |
| Multi-user / collaboration | Hors scope |
| Status pills (To listen / To buy / To play) | Décision produit finale — JAMAIS |
| `?ids=1` URL param | Source du bug nav mobile — JAMAIS |
| Supprimer colonne `status` en DB | Sans migration préalable des données |

---

## Phases de développement — Vue détaillée

| Phase | Nom | État |
|-------|-----|------|
| 1 | Stabilisation Beta | ✅ Complète |
| Sprint 0 | UX Quick Wins | **À lancer** |
| 2A | Sets System — Infrastructure | À faire |
| 2B | Sets System — Flow + SC Timestamp | À faire |
| 3A | Rich Media — Bandcamp + TikTok | À faire |
| 3B | Rich Media — Spotify + Apple Music | À faire |
| 4 | Smart Metadata / AI | À faire |
| 5 | Crates Evolution | À faire |
| 6 | Polish V1 | À faire |

---

## Phase 1 — Stabilisation Beta ✅

Tous les items sont complétés.

| Item | État |
|------|------|
| BUG-01 — Log an ID → `/ids/new` | ✅ |
| BUG-SC-01 — SC embed `m.soundcloud.com` + height sets | ✅ |
| BUG-STATUS-01 — `track.status` → `track.recordType` | ✅ |
| UX-ADD-01 — Champ `videoAuthor` dans Add Track | ✅ |
| UX-NAV-01 — Supprimer "Log from a set" redondant | ✅ |
| UX-05 — "Auteur vidéo" → "Video author" | ✅ |
| BUG-03 — timestampEnd seul affiché | ✅ |
| BUG-06 — Embed activé pour les IDs | ✅ |

---

## Bugs connus restants

Aucun. BUG-02 corrigé (2026-05-12).

---

## Audit initial — Dettes connues (état après Phase 1)

- Rating persisté mais invisible dans les rows Library/IDs — Sprint 0
- `timestampEnd` affiché seulement en segment — ✅ corrigé Phase 1
- `status` colonne en DB, invisible en UI — dépréciée, conservée
- `image_url` sur crates : champ DB, UI non implémentée — Sprint 5
- `STATUS_COLORS` + `getStatusColor` dans constants.ts : dead code (garder pour compatibilité)
- "Mark as found" ouvre le form edit complet — Sprint 0

---

## Décisions produit arrêtées

### Status → Crates (final)
Les statuts `To listen / To buy / To play / Inspiration` sont définitivement invisibles dans l'UI. Ne jamais ré-exposer.

### record_type = source de vérité Library/IDs
Ne jamais revenir au filtrage `?ids=1` ni au check `track.status === "IDs Needed"`.

### quick-add = tracks identifiés uniquement
`/quick-add` est exclusivement pour les tracks identifiés. Les IDs passent par `/ids/new`.

### Embed SoundCloud
Widget officiel, hash strippé, `m.soundcloud.com` normalisé, height 120 tracks / 300 sets. Timestamp via JS API en Phase 2.

### BottomNav (Phase 1)
"Add a track" + "Log an ID" dans la sheet. "Log from a set" supprimé jusqu'à Phase 2.

---

## Choses à éviter (rappel)

- **Ne pas supprimer la colonne `status`** de la DB sans migration préalable
- **Ne pas réintroduire `useSearchParams` dans `/ids/page.tsx`**
- **Ne pas utiliser `git add -A`** sans vérifier — risque `.env.local`
- **Ne pas bypasser `npm run build`** — valide TypeScript strictement
- **Ne pas ajouter de dépendances npm** sans raison claire
- **Ne pas modifier `supabase-server.ts`** sans tester les routes API
- **Ne pas passer `user_id` manquant dans les INSERTs** — RLS rejette silencieusement
- **Ne pas toucher IA / BPM / Spotify / Apple Music / Bandcamp** avant Phase 3/4

---

## Later — Idées futures (non prioritaires)

- Import playlist YouTube/SoundCloud en masse
- Export CSV/JSON Library ou crate
- Stats dashboard : tracks par plateforme, par genre, IDs ouverts depuis combien de temps
- Notifications IDs ouverts depuis longtemps
- Tags libres multiples (compléter genre/mood)
- Historique des modifications sur un track
- Identification automatique (AudD, ACRCloud)
- Browser extension "Add to Digglist"
- App native (Expo/RN)
- SoundCloud OAuth integration (playlists, likes)
- Discogs integration (possédé / wishlist)
- Player global persistant
- BPM detection
- Collaboration — partager une crate
