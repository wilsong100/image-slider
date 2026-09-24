export type Comparison = {
  id: string;
  title: string;
  room: string;
  notes: string;
  beforeImageId: string;
  afterImageId: string;
  createdAt: number;
  updatedAt: number;
};

export type StoredImage = {
  id: string;
  blob: Blob;
  thumb: Blob;
  width: number;
  height: number;
};
