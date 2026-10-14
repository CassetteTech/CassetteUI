/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Inline SVG lets eight animated layers form one accessible image. */

import { useId, type CSSProperties } from 'react';

// A white face with a black outline, rendered at 4x by
// scripts/render-home-wordmark-layer.mjs. The browser shrinks it to its
// display size, which keeps the thin outline edges smooth on 1x displays.
export const homeWordmarkLayerImage = '/images/home-wordmark-layer.png';

// Where the layer image sits in the wordmark's SVG units, as printed by the script.
const layerFrame = { x: 5.5, y: 30.75, width: 626.5, height: 147 };

const layers = [
  { color: '#5865F2', offset: 45.54 },
  { color: '#7959F7', offset: 38.95 },
  { color: '#C626EE', offset: 32.36 },
  { color: '#ED2748', offset: 25.77 },
  { color: '#FFB960', offset: 19.18 },
  { color: '#EACB90', offset: 12.59 },
  { color: '#FFFFFF', offset: 6 },
  { color: '#FFFFFF', offset: 0 },
];

function tintMatrix(color: string) {
  const [red, green, blue] = [1, 3, 5].map(start => parseInt(color.slice(start, start + 2), 16) / 255);
  return `${red} 0 0 0 0  0 ${green} 0 0 0  0 0 ${blue} 0 0  0 0 0 1 0`;
}

export function HomeWordmark() {
  const filterId = useId();

  return (
    <svg
      role="img"
      aria-label="Cassette"
      viewBox="0 0 653 280.75"
      width="2612"
      height="1123"
      className="home-wordmark block h-auto w-full overflow-visible"
      data-testid="home-wordmark"
    >
      <defs>
        {layers.map(({ color, offset }) => color !== '#FFFFFF' && (
          <filter key={offset} id={`${filterId}-${offset}`} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={tintMatrix(color)} />
          </filter>
        ))}
      </defs>
      {layers.map(({ color, offset }, index) => (
        <g key={offset} transform={`translate(0 ${offset})`}>
          <image
            href={homeWordmarkLayerImage}
            {...layerFrame}
            filter={color === '#FFFFFF' ? undefined : `url(#${filterId}-${offset})`}
            className="home-wordmark-layer"
            // SAFETY: CSSProperties has no custom-property keys; both values are plain CSS lengths or numbers.
            style={{
              '--wordmark-depth': `${offset}px`,
              '--wordmark-index': layers.length - 1 - index,
            } as CSSProperties}
          />
        </g>
      ))}
    </svg>
  );
}
