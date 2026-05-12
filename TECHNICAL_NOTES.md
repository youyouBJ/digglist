# Notes techniques Digglist

## Architecture Supabase

### Deux clients Supabase

```
lib/supabase.ts        → client navigateur (NEXT_PUBLIC_* vars)
lib/supabase-server.ts → client serveur pour les Route Handlers API (service role)
```

Le client serveur est utilisé **uniquement** dans `app/api/fetch-metadata/route.ts` pour valider le token JWT de l'utilisateur avant d'exécuter la requête. Ne jamais exposer `supabaseServer` côté client.

---

## Tables principales

### `tracks`

```sql
create table public.tracks (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id),
  title           text not null default '',
  artist          text not null default '',
  label           text not null default '',
  record_type     text not null default 'track'
                  check (record_type in ('track', 'id_needed')),
  rating          integer check (rating is null or (rating between 1 and 5)),
  source_platform text not null default '',
  source_url      text not null default '',
  image_url       text not null default '',
  genre           text not null default '',
  mood            text not null default '',
  status          text not null default '',   -- dépréciée UI, conservée DB
  notes           text not null default '',
  source_timestamp integer,                   -- secondes depuis début
  timestamp_end   integer check (timestamp_end is null or timestamp_end > 0),
  video_author    text not null default '',   -- auteur YouTube/TikTok/Instagram
  track_id_hint   text not null default '',   -- indice pour identifier l'ID
  created_at      timestamptz not null default now()
);
```

### `crates`

```sql
create table public.crates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id),
  name        text not null,
  description text not null default '',
  color       text not null default '#3d9e87',
  parent_id   uuid references public.crates(id),
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
```

### `crate_tracks` (table de jonction)

```sql
create table public.crate_tracks (
  crate_id   uuid not null references public.crates(id) on delete cascade,
  track_id   uuid not null references public.tracks(id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (crate_id, track_id)
);
```

---

## RLS (Row Level Security)

Toutes les tables ont RLS activé. Pattern uniforme : `auth.uid() = user_id`.

```sql
-- tracks
create policy "Users manage own tracks"
  on public.tracks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- crates
create policy "Users manage own crates"
  on public.crates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- crate_tracks (accès via ownership de la crate)
create policy "Users manage own crate_tracks"
  on public.crate_tracks for all
  using (
    exists (
      select 1 from public.crates
      where id = crate_id and user_id = auth.uid()
    )
  );
```

**Piège RLS** : l'INSERT sur `tracks` requiert que `user_id` soit explicitement passé dans le payload. Si absent, la policy `with check` rejette silencieusement. Toujours appeler `supabase.auth.getUser()` avant un INSERT et passer `user_id: user.id`.

---

## Migrations SQL exécutées (dans l'ordre)

```sql
-- 1. Ajout user_id + RLS strict (remplace allow_all_temporary)
alter table public.tracks add column user_id uuid not null references auth.users(id);
-- + policies ci-dessus

-- 2. record_type — séparateur autoritaire Library/IDs
alter table public.tracks
  add column record_type text not null default 'track'
  check (record_type in ('track', 'id_needed'));

-- 3. Label
alter table public.tracks
  add column label text not null default '';

-- 4. Rating
alter table public.tracks
  add column rating integer
  check (rating is null or (rating between 1 and 5));

-- 5. Timestamp fin + auteur vidéo + track ID hint
alter table public.tracks
  add column timestamp_end integer check (timestamp_end is null or timestamp_end > 0);

alter table public.tracks
  add column video_author text not null default '';

alter table public.tracks
  add column track_id_hint text not null default '';

-- Crates (avec RLS)
create table public.crates (...);
create table public.crate_tracks (...);
-- + policies crates
```

---

## Mapping TypeScript ↔ DB

### `lib/types.ts` → `Track`
```
Track.id              → tracks.id
Track.recordType      → tracks.record_type   (camelCase ↔ snake_case)
Track.rating          → tracks.rating
Track.sourcePlatform  → tracks.source_platform
Track.sourceUrl       → tracks.source_url
Track.imageUrl        → tracks.image_url
Track.sourceTimestamp → tracks.source_timestamp
Track.timestampEnd    → tracks.timestamp_end
Track.videoAuthor     → tracks.video_author
Track.trackIdHint     → tracks.track_id_hint
Track.createdAt       → tracks.created_at
```

### Pattern `toTrack` / `toRow` dans `lib/supabase-tracks.ts`
- `toTrack(row: TrackRow): Track` — DB → domaine (camelCase)
- `toRow(data)` — domaine → DB (snake_case), utilisé dans `createTrack` et `updateTrack`
- `TrackRow.rating` est `rating?: number | null` (optionnel) pour compatibilité si la colonne manque en runtime

---

## Timestamps

### Extraction depuis URL
- YouTube : paramètre `?t=` (integer secondes, ou `1h24m30s`, ou `84m30s`)
- SoundCloud : fragment `#t=1:24:30` ou `#t=84:30`
- Fonction : `extractTimestampFromUrl(url)` dans `lib/timestamp.ts`

### Saisie manuelle
- Formats acceptés : `12:43`, `1:12:43`, `90` (secondes pures)
- Fonction : `parseManualTimestamp(raw)` dans `lib/timestamp.ts`

### Affichage
- `formatTimestamp(seconds)` → `"1:24:30"` ou `"4:30"` ou `"0:45"`

### Build URL avec timestamp
- YouTube : `?t=<seconds>` ajouté/remplacé dans les query params
- SoundCloud : `#t=<M:SS>` dans le hash
- Fonction : `buildTimestampUrl(sourceUrl, timestamp)`

### Embed YouTube avec timestamp
- `https://www.youtube.com/embed/<id>?start=<seconds>` — fonctionne nativement

### Embed SoundCloud avec timestamp
- **Non supporté par l'URL du widget.** Pour jumper à un timestamp il faudrait la SC JS API (`SC.Widget.seekTo(ms)`). Non implémenté.
- Fix actuel : strip le hash `#t=...` de l'URL avant de la passer au widget (sinon erreur "invalid URL").

---

## Fetch metadata (oEmbed)

`app/api/fetch-metadata/route.ts` — route authentifiée (Bearer token vérifié par `supabaseServer`).

| Plateforme | Méthode | Notes |
|-----------|---------|-------|
| YouTube | oEmbed officiel | `author_name` = channel name, pas le vrai artiste dans les mixes |
| SoundCloud | oEmbed officiel | `splitArtistTitle` appliqué sur le titre |
| TikTok | oEmbed officiel | Si caption = "Artiste - Titre" → split ; sinon caption → notes |
| Instagram | Scraping og: tags | Instagram bloque souvent les bots — fallback vide |
| Discogs | Scraping og:title | Nettoyage " \| Discogs" suffix |
| Générique | Scraping og:title/description/image | — |

L'API retourne **toujours 200** avec des champs vides en cas d'échec (jamais 422). Le client gère l'état `"error"` visuellement sans bloquer le save.

---

## Pièges et points sensibles

### 1. `use client` sur toutes les pages
Toutes les pages sont en mode client (`"use client"`). Il n'y a pas de Server Components dans les pages — uniquement dans les Route Handlers API.

### 2. `AGENTS.md` et `CLAUDE.md`
Ces fichiers contiennent des instructions pour l'agent Claude Code. `CLAUDE.md` pointe vers `@AGENTS.md`. Ne pas supprimer.

### 3. TypeScript strict sur `Track`
`Track` est un type complet — tous les champs sont requis dans `createTrack` et `updateTrack`. Si on ajoute une colonne en DB, il faut mettre à jour :
1. `lib/types.ts` (Track type)
2. `lib/supabase-tracks.ts` (TrackRow + toTrack + toRow)
3. Tous les call sites de `createTrack` / `updateTrack`

### 4. `STATUSES` dans constants.ts
`STATUSES` et `STATUS_COLORS` sont encore dans `constants.ts` mais plus utilisés en UI. Ne pas les supprimer — des données historiques en DB peuvent avoir ces valeurs.

### 5. `syncTrackCrates` dans edit
`syncTrackCrates(id, selectedCrateIds, initialCrateIds)` calcule le diff entre l'état initial et final des crates, et fait uniquement les ADD/REMOVE nécessaires. Ne jamais faire un DELETE ALL + INSERT — ça causerait des flashs visuels et des races conditions.

### 6. `useRequireAuth`
Le hook redirige vers `/login` si l'utilisateur n'est pas connecté. Il retourne `null` pendant le chargement. Pattern dans toutes les pages :
```tsx
const user = useRequireAuth();
if (!user) return <PageLoader />;
```
Le `if (!user)` doit être **après** tous les hooks (useState, useEffect) pour respecter les règles React.

### 7. Embed SoundCloud — hash stripping
La cause de l'embed cassé était : l'URL stockée en DB peut contenir `#t=1:30` (SoundCloud timestamp). Le widget rejette les URLs avec fragment. Fix dans `getSoundCloudEmbedUrl` : `parsed.hash = ""` avant encoding.

### 8. RLS sur INSERT crates
La policy crates exige `user_id` dans l'INSERT. Avant l'INSERT, appeler `supabase.auth.getUser()` pour obtenir l'ID. Sans ça, la RLS rejette silencieusement avec `PGRST301`.
