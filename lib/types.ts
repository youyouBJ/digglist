export type Track = {
  id: string;
  title: string;
  artist: string;
  label: string;
  recordType: string;   // 'track' | 'id_needed'
  rating: number | null;
  sourcePlatform: string;
  sourceUrl: string;
  imageUrl: string;
  genre: string;
  mood: string;
  status: string;
  notes: string;
  sourceTimestamp: number | null;
  timestampEnd: number | null;
  videoAuthor: string;
  trackIdHint: string;
  setId: string | null;
  createdAt: string;
};

export type MixSet = {
  id: string;
  userId: string;
  title: string;
  artist: string;
  party: string;
  setDate: string | null;
  sourceUrl: string | null;
  platform: string | null;
  coverUrl: string | null;
  notes: string;
  createdAt: string;
};

export type MixSetWithCount = MixSet & { momentCount: number };

export type TrackFormState = {
  title: string;
  artist: string;
  label: string;
  platform: string;
  url: string;
  imageUrl: string;
  genre: string;
  mood: string;
  status: string;
  notes: string;
};

export type Crate = {
  id: string;
  userId: string;
  name: string;
  description: string;
  color: string;
  parentId: string | null;
  position: number;
  createdAt: string;
};

export type CrateWithCount = Crate & { trackCount: number };
