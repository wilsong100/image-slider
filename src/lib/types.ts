export type Comparison = {
  id: string;
  title: string;
  room: string;
  notes: string;
  beforeImageId: string;
  afterImageId: string;
  /** How the after photo is moved/zoomed/rotated to line up with the before photo. */
  alignment?: Alignment;
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
