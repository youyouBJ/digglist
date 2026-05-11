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
