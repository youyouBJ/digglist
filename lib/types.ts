export type Track = {
  id: string;
  title: string;
  artist: string;
  sourcePlatform: string;
  sourceUrl: string;
  imageUrl: string;
  genre: string;
  mood: string;
  status: string;
  notes: string;
  sourceTimestamp: number | null;
  createdAt: string;
};

export type TrackFormState = {
  title: string;
  artist: string;
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
