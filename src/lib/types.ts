/** A house (or any renovation project) that groups comparisons. */
export type Project = {
  id: string;
  name: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
};

export type Comparison = {
  id: string;
  projectId: string;
  title: string;
  room: string;
  notes: string;
  beforeImageId: string;
  afterImageId: string;
  /** How the after photo is moved/zoomed/rotated to line up with the before photo. */
  alignment?: Alignment;
  /** When each photo was taken, "YYYY-MM-DD" (read from the photo, editable). */
  beforeDate?: string;
  afterDate?: string;
  createdAt: number;
  updatedAt: number;
};

/**
 * Transform applied to the after photo, relative to the frame:
 * x/y are offsets in % of the frame's width/height, scale is a multiplier,
 * rotate is in degrees.
 */
export type Alignment = { x: number; y: number; scale: number; rotate: number };

export type StoredImage = {
  id: string;
  blob: Blob;
  thumb: Blob;
  width: number;
  height: number;
};
