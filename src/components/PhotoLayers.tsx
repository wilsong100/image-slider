import type { CSSProperties } from 'react';
import { layerStyles } from '../lib/alignment';
import type { Alignment } from '../lib/types';

type Props = {
  beforeSrc?: string;
  afterSrc?: string;
  /** width / height of the before photo; the frame is filled like object-fit: cover. */
  aspect: number;
  alignment?: Alignment;
  /** Empty alt text, for previews where the photos are decoration. */
  decorative?: boolean;
};

/**
 * The two stacked photos of a comparison. The before layer is clipped to the
 * left of `--pos` (set by the parent), and the after photo is transformed by
 * the saved alignment so both line up.
 */
export function PhotoLayers({ beforeSrc, afterSrc, aspect, alignment, decorative }: Props) {
  const styles = layerStyles(alignment, aspect);
  const box = { ['--aspect' as string]: aspect } as CSSProperties;
  return (
    <>
      <div className="layer">
        <div className="layer__box" style={box}>
          {afterSrc && <img src={afterSrc} alt={decorative ? '' : 'After'} style={styles.after} draggable={false} />}
        </div>
      </div>
      <div className="layer layer--before">
        <div className="layer__box" style={box}>
          {beforeSrc && <img src={beforeSrc} alt={decorative ? '' : 'Before'} style={styles.before} draggable={false} />}
        </div>
      </div>
    </>
  );
}
