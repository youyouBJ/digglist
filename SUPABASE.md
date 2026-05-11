# Configuration Supabase

## Prérequis

- Un projet Supabase actif sur [supabase.com](https://supabase.com)
- Node.js 18+

## Variables d'environnement

Crée un fichier `.env.local` à la racine du projet avec :

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ton-projet>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ta-clé-anon>
```

Ces valeurs se trouvent dans **Settings → Data API** de ton dashboard Supabase.

> `.env.local` est ignoré par git — ne jamais committer ce fichier.

## Structure de la base de données

### Table `tracks`

| Colonne          | Type        | Notes                        |
|------------------|-------------|------------------------------|
| `id`             | `uuid`      | Clé primaire, auto-générée   |
| `title`          | `text`      | Requis                       |
| `artist`         | `text`      | Requis                       |
| `source_platform`| `text`      | Ex : YouTube, SoundCloud     |
| `source_url`     | `text`      | URL de la source             |
| `genre`          | `text`      |                              |
| `mood`           | `text`      |                              |
| `status`         | `text`      | Ex : to_listen, liked        |
| `notes`          | `text`      | Notes libres                 |
| `created_at`     | `timestamptz` | Auto-générée à l'insertion |

### Correspondance avec le type TypeScript

```
Track.id             → tracks.id
Track.title          → tracks.title
Track.artist         → tracks.artist
Track.sourcePlatform → tracks.source_platform
Track.sourceUrl      → tracks.source_url
Track.genre          → tracks.genre
Track.mood           → tracks.mood
Track.status         → tracks.status
Track.notes          → tracks.notes
Track.createdAt      → tracks.created_at
```

### SQL de création

```sql
create table public.tracks (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  artist          text not null,
  source_platform text not null default '',
  source_url      text not null default '',
  genre           text not null default '',
  mood            text not null default '',
  status          text not null default '',
  notes           text not null default '',
  created_at      timestamptz not null default now()
);

alter table public.tracks enable row level security;

create policy "allow_all_temporary"
  on public.tracks
  for all
  using (true)
  with check (true);
```

## Utiliser le client dans l'app

```typescript
import { supabase } from "@/lib/supabase";

// Exemple : récupérer tous les tracks
const { data, error } = await supabase
  .from("tracks")
  .select("*")
  .order("created_at", { ascending: false });
```

## Sécurité

La politique RLS `allow_all_temporary` donne un accès complet sans authentification.
Elle devra être remplacée par des politiques user-based lors de l'ajout de l'authentification.
