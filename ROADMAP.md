# Roadmap Digglist
> Dernière mise à jour : 2026-05-12
> État : Beta stable. Phase 1 Stabilisation en cours.

---

## Phases de développement

| Phase | Nom | État |
|-------|-----|------|
| 1 | Stabilisation Beta | En cours |
| 2 | Sets System | À faire |
| 3 | Rich Media / Embeds | À faire |
| 4 | Smart Metadata / AI | À faire |
| 5 | Crates Evolution | À faire |
| 6 | Polish V1 | À faire |

---

## Phase 1 — Stabilisation Beta

Objectif : corriger les bugs critiques du test iPhone, clarifier les flows, consolider l'existant.

### Checklist

- [x] BUG-01 — Log an ID dans Add sheet crée un track normal → fix `/ids/new`
- [x] BUG-SC-01 — SoundCloud embed cassé sur certains sets (`m.soundcloud.com`, height)
- [x] STATUS-01 — Status `track.status === "IDs Needed"` encore présent dans crates/[id]
- [x] UX-ADD-01 — Add Track incomplet vs Edit (champ `videoAuthor` manquant)
- [x] UX-NAV-01 — "Log from a set" redondant avec "Add a track" dans la sheet
- [ ] BUG-03 — timestampEnd invisible s'il est seul (sans sourceTimestamp)
- [ ] BUG-06 — Embed absent pour les IDs (condition `!isIds`)

---

## Phase 2 — Sets System

Objectif : navigation Sets, onglet dédié, flow "Log from a set".

### Items

- [ ] NAV-01 — Remplacer "You" par "Sets" dans la BottomNav
- [ ] NAV-02 — Déplacer logout/profil en haut à droite (header) ou menu discret
- [ ] FEAT-SET-01 — Page `/sets` — liste des sets sauvegardés (SoundCloud/YouTube/Mix)
- [ ] FEAT-SET-02 — Flow "Log from a set" dédié — URL set + timestamp → track ou ID
- [ ] FEAT-SC-TS — SoundCloud embed avec timestamp (SC Widget JS API `seekTo`)
- [ ] FEAT-AUTOPLAY — Quand un track/moment vient d'un set, player lance automatiquement au timestamp

---

## Phase 3 — Rich Media / Embeds

Objectif : améliorer les previews TikTok/Instagram, préparer multi-plateformes.

### Items

- [ ] EMBED-TT-01 — TikTok/Instagram : afficher miniature ou preview si disponible
- [ ] EMBED-SP-01 — Support Spotify (embed + metadata auto)
- [ ] EMBED-AM-01 — Support Apple Music (embed + metadata auto)
- [ ] EMBED-BC-01 — Support Bandcamp (embed + metadata auto)

---

## Phase 4 — Smart Metadata / AI

Objectif : réduire la friction de saisie via IA et extraction automatique.

### Items

- [ ] AI-META-01 — API IA : extraire titre, artiste, genre depuis titre/description/caption
- [ ] AI-DESC-01 — API IA : résumer descriptions TikTok/Instagram dans IDs
- [ ] BPM-01 — Détection BPM automatique depuis YouTube/SoundCloud/Spotify (timestamp précis si possible)

---

## Phase 5 — Crates Evolution

Objectif : enrichir les crates visuellement et fonctionnellement.

### Items

- [ ] CRATES-VIS-01 — Motifs/icônes en plus des couleurs (patterns, emojis, symboles)
- [ ] CRATES-VIS-02 — Hiérarchie visuelle sous-crates : indentation + trait vertical
- [ ] CRATES-COUNT-01 — Crate filter pills avec count de tracks `Techno (12)`
- [ ] CRATES-SORT-01 — Réordonner les crates manuellement (drag ou flèches)

---

## Phase 6 — Polish V1

Objectif : finitions avant ouverture/partage.

### Items

- [ ] PWA-01 — Manifest + Add to Home Screen + icônes 192/512px
- [ ] SHARE-01 — Lien public read-only `/share/track/[id]` + `/share/crate/[id]`
- [ ] SORT-01 — Tri Library et IDs : Date ↓, Rating ↓, A–Z
- [ ] UX-FOUND-01 — Flow "Mark as found" allégé (sheet 3 champs max, pas le form complet)
- [ ] UX-DENSITY-01 — Notes line-clamp-1 en liste Library
- [ ] ANIM-01 — Transitions de page simples (si réalisable avec App Router)

---

---

## P0 — Bugs critiques (post-test iPhone)

Ces items cassent silencieusement un flow ou affichent une erreur visible.

---

### BUG-SC-01 — SoundCloud embed cassé sur certains sets
**Priorité** : P0 / Critique
**Fichier** : `app/track/[id]/page.tsx` — `getSoundCloudEmbedUrl`
**Description** : Le player in-app affiche "You have not provided a valid SoundCloud URL" sur certains sets. Le lien source fonctionne mais le widget rejette l'URL.
**Causes probables** : URL mobile `m.soundcloud.com` non reconnue par le widget ; trailing `?` après stripping des params.
**Fix** : Normaliser `m.soundcloud.com` → `soundcloud.com`, nettoyer le `?` résiduel.
**Impact** : Élevé — les sets SoundCloud sont un usage fréquent.
**Complexité** : XS
**Dépendances** : aucune
**Phase** : 1

---

### BUG-ADD-01 — Add Track incomplet : champ `videoAuthor` manquant
**Priorité** : P0 / Critique
**Fichier** : `app/add-track/page.tsx`
**Description** : Le form Add Track n'a pas le champ "Video author" présent dans Edit. Pour les tracks YouTube/TikTok/Instagram, l'auteur vidéo ne peut pas être saisi à la création.
**Fix** : Ajouter le champ `videoAuthor` dans la section Source.
**Impact** : Moyen — données incomplètes à la création.
**Complexité** : XS
**Phase** : 1

---

### BUG-NAV-01 — "Log from a set" redondant et trompeur
**Priorité** : P0 / UX
**Fichier** : `app/components/BottomNav.tsx`
**Description** : La sheet Add a 3 options mais "Log from a set" pointe vers `/quick-add` — identique à "Add a track". L'utilisateur ne sait pas quelle option utiliser.
**Fix** : Supprimer "Log from a set" de la sheet. Garder 2 options claires : "Add a track" et "Log an ID". Le flow set dédié est Phase 2.
**Impact** : UX — confusion sur les flows disponibles.
**Complexité** : XS
**Phase** : 1

---

### BUG-STATUS-01 — crates/[id] : `track.status === "IDs Needed"` au lieu de `record_type`
**Priorité** : P0 / Critique (silencieux)
**Fichier** : `app/crates/[id]/page.tsx` lignes 350, 438
**Description** : Le composant `CrateTrackRow` détecte les IDs via `track.status` (legacy) au lieu de `track.recordType`. Les tracks dont le `status` n'est pas "IDs Needed" mais dont le `record_type` est `id_needed` s'affichent incorrectement.
**Fix** : Remplacer `track.status === "IDs Needed"` par `track.recordType === "id_needed"`.
**Impact** : Stylistique/data — les IDs peuvent s'afficher sans la mise en forme amber.
**Complexité** : XS
**Phase** : 1

---

(voir aussi BUG-01 à BUG-06 dans l'audit ci-dessous)

---

## P1 — UX importante (post-test iPhone)

Frictions majeures identifiées sur iPhone en usage réel.

---

### UX-SETS-01 — Remplacer "You" par "Sets" dans la BottomNav
**Description** : L'onglet "You" (profil sheet) est peu utilisé. Le remplacer par un onglet "Sets" pour accéder aux sets sauvegardés.
**Dépendance** : FEAT-SET-01 (page Sets) doit exister d'abord.
**Impact** : Élevé — navigation principale.
**Complexité** : S
**Phase** : 2

---

### UX-PROFILE-01 — Déplacer logout/profil en haut à droite
**Description** : Avec la suppression de "You" du nav, le logout doit être accessible depuis le Header (icône user en haut à droite) ou un menu discret.
**Impact** : Moyen — UX cohérente.
**Complexité** : S
**Phase** : 2

---

### UX-PLAYER-01 — Auto-play set au timestamp depuis un track/moment
**Description** : Quand un track vient d'un set avec timestamp défini, le player doit lancer automatiquement le set au bon timestamp.
**Dépendance** : FEAT-SC-TS (SC Widget JS API) pour SoundCloud.
**Impact** : Élevé — usage principal.
**Complexité** : M
**Phase** : 2

---

### UX-TT-01 — TikTok/Instagram : miniature ou preview
**Description** : Les IDs sauvegardés depuis TikTok/Instagram n'ont souvent pas de thumbnail. Afficher au minimum une preview ou une image de remplacement améliorée.
**Impact** : Moyen — scanabilité des IDs.
**Complexité** : M (dépend des APIs)
**Phase** : 3

---

(voir aussi UX-01 à UX-09 dans l'audit ci-dessous)

---

## P2 — Features enrichissement (post-test iPhone)

---

### FEAT-SP-01 — Support Spotify
**Description** : Embed Spotify + extraction metadata via oEmbed ou API. Priorité : embed et titre/artiste auto.
**Complexité** : M
**Dépendances** : API Spotify (oEmbed public disponible)
**Phase** : 3

---

### FEAT-AM-01 — Support Apple Music
**Description** : Embed Apple Music + extraction metadata.
**Complexité** : M
**Phase** : 3

---

### FEAT-BC-01 — Support Bandcamp
**Description** : Embed Bandcamp + extraction metadata. Bandcamp oEmbed est public.
**Complexité** : S
**Phase** : 3

---

### AI-META-01 — Extraction IA : titre, artiste, genre
**Description** : API IA (Claude ou autre) pour extraire titre, artiste, genre depuis le titre/description/caption d'une vidéo. Utile pour TikTok/Instagram.
**Complexité** : M
**Dépendances** : API Claude / OpenAI
**Phase** : 4

---

### AI-DESC-01 — Résumé IA des descriptions TikTok/Instagram
**Description** : Résumer automatiquement les longues descriptions dans les notes d'un ID.
**Complexité** : S (une fois l'infra IA en place)
**Phase** : 4

---

### BPM-01 — Détection BPM automatique
**Description** : Détection BPM depuis la source (YouTube/SoundCloud/Spotify) si possible, notamment à un timestamp précis.
**Complexité** : XL — très dépendant des APIs disponibles, souvent pas accessible publiquement.
**Phase** : 4

---

---

## Audit — état initial (2026-05-12)

### Ce qui fonctionne bien
- Auth email/password Supabase + RLS par user_id — solide
- Quick Add URL → auto-fetch → save en 2 taps — flow propre
- Library et IDs séparés par `record_type` — architecture correcte
- BottomNav avec sheets Add + Profile — UX mobile cohérente
- Crates CRUD : couleurs, sous-crates, filtre dans Library/IDs — fonctionnel
- Embed YouTube avec timestamp natif — fiable
- Embed SoundCloud avec hash stripping — fonctionnel (sauf sets mobiles)
- Design system CSS variables — cohérent et maintenable
- Extraction timestamp depuis URLs YouTube/SoundCloud — fiable

### Ce qui est fragile
- Embed SoundCloud : tracks vs sets non différenciés (height fixe 120px)
- Metadata TikTok/Instagram : scraping best-effort, thumbnails souvent absents
- "Log from a set" dans Add sheet : stub qui pointe vers quick-add (non distinct)
- Back button Track Detail : hard-codé vers /library même si on vient de /ids

### Dettes connues
- Rating persisté mais invisible dans les rows Library/IDs
- `timestampEnd` affiché seulement en segment (les deux timestamps requis)
- `status` colonne en DB, invisible en UI — dépréciée, pas migrée
- `image_url` sur crates : champ DB, UI non implémentée
- `STATUS_COLORS` + `getStatusColor` dans constants.ts : dead code
- Label "Auteur vidéo" en français dans UI anglaise (track detail + edit)
- "Mark as found" ouvre le form edit complet au lieu d'un micro-flow

---

## P0 — Bloquant Beta (audit initial)

### BUG-01 — Add sheet : "Log an ID" crée un track normal
**Fichier** : `app/components/BottomNav.tsx` ligne 193
**Fix** : Changer href vers `/ids/new` ✅ (Phase 1)
**Complexité** : XS

---

### BUG-02 — Back button Track Detail toujours vers /library
**Fichier** : `app/track/[id]/page.tsx` lignes 116–123
**Fix** : Passer `?from=ids` depuis /ids, conditionner le back link.
**Complexité** : S

---

### BUG-03 — timestampEnd invisible s'il est seul
**Fichier** : `app/track/[id]/page.tsx` ligne 266
**Fix** : Afficher `timestampEnd` seul si `sourceTimestamp` est null.
**Complexité** : XS

---

### BUG-04 — SoundCloud sets : embed height trop petit
**Fichier** : `app/track/[id]/page.tsx` ligne 596
**Fix** : Détecter `/sets/` et passer height 300. ✅ (Phase 1 — couplé à BUG-SC-01)
**Complexité** : XS

---

### BUG-05 — "Log from a set" dans Add sheet : stub non fonctionnel
**Fichier** : `app/components/BottomNav.tsx` ligne 215
**Fix** : Supprimer l'item. ✅ (Phase 1)
**Complexité** : XS

---

### BUG-06 — Embed absent pour les IDs
**Fichier** : `app/track/[id]/page.tsx` ligne 206
**Fix** : Supprimer la condition `!isIds` sur `<TrackEmbed />`.
**Complexité** : XS

---

## P1 — UX critique (audit initial)

### UX-01 — Rating invisible dans les rows Library et IDs
**Fichier** : `app/library/page.tsx` (TrackRow), `app/ids/page.tsx` (IdRow)
**Complexité** : S

---

### UX-02 — Mark as found — flow trop lourd
**Fichier** : `app/track/[id]/page.tsx`
**Fix** : Sheet modale avec 3 champs max.
**Complexité** : M

---

### UX-03 — Crate filter pills sans count de tracks
**Fichier** : `app/library/page.tsx`, `app/ids/page.tsx`
**Complexité** : S

---

### UX-04 — Tri / sort dans Library et IDs
**Complexité** : S

---

### UX-05 — Label "Auteur vidéo" en français ✅ (Phase 1)
**Fichier** : `app/track/[id]/page.tsx` ligne 251, `app/track/[id]/edit/page.tsx`
**Complexité** : XS

---

### UX-06 — Densité Library : notes trop verbeux en liste
**Complexité** : XS

---

### UX-07 — Crates : hiérarchie visuelle sous-crates peu lisible
**Complexité** : S

---

### UX-08 — Add Track form : hiérarchie des champs confuse
**Complexité** : S

---

### UX-09 — Transitions et animations manquantes
**Complexité** : M-L

---

## P2 — Features importantes (audit initial)

### FEAT-01 — PWA : manifest + Add to Home Screen
**Complexité** : S

### FEAT-02 — Embed SoundCloud avec timestamp (SC Widget JS API)
**Complexité** : L

### FEAT-03 — Partage public
**Complexité** : M

### FEAT-04 — Flow "Log from a set" dédié
**Complexité** : M

### FEAT-05 — Thumbnail placeholder coloré (initiales)
**Complexité** : XS

### FEAT-06 — Search global cross Library+IDs
**Complexité** : S

### FEAT-07 — Metadata améliorée TikTok/Instagram
**Complexité** : M

### FEAT-08 — Player global persistant
**Complexité** : XL

---

## Later — Idées futures (non prioritaires)

- Import playlist YouTube/SoundCloud en masse
- Export CSV/JSON Library ou crate
- Stats dashboard : tracks par plateforme, par genre, IDs ouverts depuis combien de temps
- Notifications IDs ouverts depuis longtemps (X jours)
- Tags libres multiples (compléter genre/mood)
- Historique des modifications sur un track
- Identification automatique (AudD, ACRCloud) — soumettre un clip
- Browser extension "Add to Digglist"
- App native (Expo/RN) si la base web est solide
- SoundCloud OAuth integration profonde (playlists, likes)
- Discogs integration (possédé / wishlist)
- Collaboration — partager une crate avec quelqu'un d'autre

---

## Parking Lot — Ne pas développer maintenant

- **Status pills** (To listen / To buy / To play / Inspiration) — décision finale, ne pas ré-ajouter dans l'UI
- **Filtrage `?ids=1` URL param** — source du bug de navigation mobile original, ne jamais revenir
- **Multi-user / équipes** — hors scope beta
- **Commentaires sociaux** — hors scope
- **Abonnement/paywall** — prématuré
- **Server Components** dans les pages — toutes les pages sont "use client", pas de SSR nécessaire (app auth-only)
- **IA / BPM** avant Phase 4

---

## Décisions produit arrêtées

### Status → Crates (final)
Les statuts `To listen / To buy / To play / Inspiration` sont définitivement invisibles dans l'UI. L'organisation se fait par crates. La colonne `status` en DB est conservée pour les données existantes. Ne jamais ré-exposer dans l'UI.

### record_type = source de vérité Library/IDs
`record_type` en DB (`"track"` vs `"id_needed"`) est le séparateur autoritaire. Ne jamais revenir au filtrage par URL params (`?ids=1`) ni au check `track.status === "IDs Needed"`.

### quick-add = tracks identifiés uniquement
`/quick-add` est exclusivement pour les tracks identifiés. Les IDs passent par `/ids/new`.

### Embed SoundCloud
Widget officiel avec hash strippé. Normaliser `m.soundcloud.com` → `soundcloud.com`. Height 120 pour tracks, 300 pour sets. Timestamp non supporté nativement — JS API en option future (Phase 2).

### BottomNav : 2 options dans Add sheet (Phase 1)
"Add a track" + "Log an ID". "Log from a set" supprimé (redondant) jusqu'à Phase 2 (flow dédié).

---

## Choses à éviter (rappel)

- **Ne pas supprimer la colonne `status`** de la DB sans migration préalable
- **Ne pas réintroduire `useSearchParams` dans `/ids/page.tsx`** — source du bug navigation mobile original
- **Ne pas utiliser `git add -A`** sans vérifier — risque d'inclure `.env.local`
- **Ne pas bypasser `npm run build`** — valide TypeScript strictement
- **Ne pas ajouter de dépendances npm** sans raison claire
- **Ne pas modifier `supabase-server.ts`** sans tester les routes API
- **Ne pas passer `user_id` manquant dans les INSERTs** — la RLS rejette silencieusement
- **Ne pas toucher IA / BPM / Spotify / Apple Music / Bandcamp** avant Phase 3/4
