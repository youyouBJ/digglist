# Roadmap Digglist

## Prochaines priorités (court terme)

### P0 — Stabilisation
- [ ] **Rating visible dans les rows Library/IDs** — actuellement le rating est persisté mais invisible dans les listes. Ajouter un indicateur compact (ex: `★ 4` en amber) dans `TrackRow` et `IdRow`.
- [ ] **"Mark as found" flow pour les IDs** — quand on clique "Mark as found" dans la page détail d'un ID, ça ouvre actuellement le form edit. Créer un flow dédié qui : change `recordType` vers `"track"`, pré-remplit ce qu'on sait, demande les infos manquantes (titre confirmé, artiste, label).
- [ ] **Vérifier navigation mobile** après derniers commits — tester Library ↔ IDs ↔ Crates sur iPhone Safari sans refresh.

### P1 — Fonctionnalités manquantes importantes
- [ ] **Timestamp fin visible dans detail page** — `timestampEnd` est stocké mais affiché uniquement si les deux timestamps sont définis (segment). Afficher aussi le timestamp fin seul.
- [ ] **Embed SoundCloud avec timestamp** — le widget ne supporte pas le saut direct par URL. Utiliser la SoundCloud Widget JS API (`SC.Widget.Events`) pour `seekTo()` au load. Complexe mais possible.
- [ ] **Log from a set — page dédiée** — `/log-set` ou flow dans quick-add qui force l'entrée des timestamps début/fin et redirige vers `/ids/new` ou `/add-track` selon si le track est identifié ou non.

### P2 — UX/Design
- [ ] **Rating dans les rows** (voir P0 ci-dessus)
- [ ] **Search global** — recherche cross Library + IDs depuis un seul endroit
- [ ] **Sort options** — trier la Library par date ajout, rating, alphabétique
- [ ] **Sous-crates** — l'UI de navigation des sous-crates est basique. Améliorer l'arborescence dans `/crates`.
- [ ] **Track count dans les pills crates** — les filter pills de Library/IDs ne montrent pas le nombre de tracks. Ajouter un badge.

---

## Backlog produit (moyen terme)

- **Partage** — lien public vers un track / une crate (page read-only sans auth)
- **Import** — importer une playlist YouTube ou SoundCloud en masse
- **Export** — export CSV / JSON de la Library ou d'une crate
- **Stats** — dashboard : tracks par plateforme, par genre, IDs ouverts depuis combien de temps
- **Notifications IDs** — rappel si un ID est ouvert depuis plus de X jours
- **Collaboration** — partager une crate avec quelqu'un d'autre (read-only ou write)
- **Tags libres** — compléter genre/mood avec des tags libres multiples
- **Historique** — log des modifications sur un track

---

## Idées futures (long terme)

- **Identification automatique** — soumettre un clip audio / timestamp à un service d'identification (AudD, ACRCloud)
- **Browser extension** — "Ajouter à Digglist" depuis n'importe quelle page web
- **App native** (Expo/RN) si la base web est solide
- **SoundCloud intégration profonde** — via API SoundCloud (OAuth) pour lire les playlists, likes, etc.
- **Discogs intégration** — marquer un track comme "possédé" / "wishlist" directement depuis Discogs

---

## Bugs connus (post-beta)

| # | Sévérité | Description | Fichier |
|---|----------|-------------|---------|
| 1 | Medium | SoundCloud embed ne saute pas au timestamp (widget API nécessaire) | `track/[id]/page.tsx` |
| 2 | Low | `status` colonne en DB mais invisble en UI — dépréciée mais pas supprimée | DB + constants.ts |
| 3 | Low | `image_url` des crates pas utilisé — champ UI non implémenté | `crates/new` |
| 4 | Info | `lib/constants.ts` : STATUS_COLORS et getStatusColor non utilisés en UI | constants.ts |

---

## Décisions produit importantes

### Status → Crates (décision finale)
Les statuts `To listen / To buy / To play / Inspiration` sont **invisibles dans l'UI** et ne seront probablement jamais ré-affichés. L'organisation se fait par crates. La colonne `status` en DB est conservée pour les données existantes mais ne sera plus exposée.

**Ne pas supprimer la colonne `status` avant d'avoir migré les données existantes** (si l'utilisateur a des tracks avec status significatif).

### IDs séparés de Library
`/ids` et `/library` sont des routes **complètement séparées** depuis le Step 1. Le séparateur autoritaire est `record_type` en DB (`"track"` vs `"id_needed"`). **Ne jamais revenir au filtrage par URL params** (`?ids=1`) — c'était le bug de navigation mobile original.

### record_type vs status
`record_type` est la source de vérité pour la séparation Library/IDs. Le champ `status = "IDs Needed"` est conservé dans les créations pour la cohérence DB mais ne drive plus l'UI.

### quick-add = tracks seulement
`/quick-add` est désormais exclusivement pour les tracks identifiés. Les IDs passent par `/ids/new`. **Ne pas ré-ajouter de pills de status dans quick-add.**

### embed SoundCloud
Le widget SoundCloud officiel (`w.soundcloud.com/player`) ne supporte pas les timestamps via URL. Pour jumper à un timestamp, il faudrait la JS API `SC.Widget`. Complexity élevée, en attente.

---

## Choses à éviter

- **Ne pas supprimer la colonne `status` de la DB** tant que des tracks ont des valeurs significatives
- **Ne pas toucher à `/ids/page.tsx` pour réintroduire `useSearchParams`** — source du bug navigation mobile original
- **Ne pas utiliser `git add -A` sans vérifier** — risque d'inclure `.env.local`
- **Ne pas bypasser le build TypeScript** — `npm run build` avant tout commit
- **Ne pas ajouter de dépendances npm** sans raison claire — le projet est intentionnellement léger
- **Ne pas modifier `supabase-server.ts`** sans tester les routes API — il utilise la service key côté serveur
