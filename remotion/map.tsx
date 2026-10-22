import { AbsoluteFill } from "remotion";

// A tiny slippy map for Remotion: CARTO's free Dark Matter raster tiles (OpenStreetMap data),
// placed by hand so every frame is a pure function of center and zoom. No WebGL, no key.
const TILE = 512; // @2x tiles drawn at 512px, so labels stay readable in a 1080px-wide video.
const SUBDOMAINS = ["a", "b", "c", "d"];
export const MAP_ATTRIBUTION = "© OpenStreetMap contributors © CARTO";

export interface LngLat {
  lng: number;
  lat: number;
}

/** Web Mercator world pixels at a zoom level. Longitudes outside ±180 keep going, for wrapping. */
export function project({ lng, lat }: LngLat, zoom: number) {
  const size = TILE * 2 ** zoom;
  const sin = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  };
}

/** Screen position of a point when the map is centered on `center` at `zoom`. */
export function toScreen(point: LngLat, center: LngLat, zoom: number, width: number, height: number) {
  const p = project(point, zoom);
  const c = project(center, zoom);
  return { x: p.x - c.x + width / 2, y: p.y - c.y + height / 2 };
}

/** Shift `to` by whole turns of longitude so the line from `from` takes the short way round. */
export function unwrap(from: LngLat, to: LngLat): LngLat {
  let lng = to.lng;
  while (lng - from.lng > 180) lng -= 360;
  while (lng - from.lng < -180) lng += 360;
  return { lng, lat: to.lat };
}

export function tilesFor(center: LngLat, level: number, scale: number, width: number, height: number) {
  const n = 2 ** level;
  const c = project(center, level);
  const halfW = width / 2 / scale;
  const halfH = height / 2 / scale;
  const tiles = [];
  for (let ty = Math.max(0, Math.floor((c.y - halfH) / TILE)); ty <= Math.min(n - 1, Math.floor((c.y + halfH) / TILE)); ty++) {
    for (let tx = Math.floor((c.x - halfW) / TILE); tx <= Math.floor((c.x + halfW) / TILE); tx++) {
      const x = ((tx % n) + n) % n;
      tiles.push({
        key: `${level}/${tx}/${ty}`,
        url: `https://${SUBDOMAINS[(x + ty) % 4]}.basemaps.cartocdn.com/dark_all/${level}/${x}/${ty}@2x.png`,
        left: (tx * TILE - c.x) * scale + width / 2,
        top: (ty * TILE - c.y) * scale + height / 2,
        size: TILE * scale,
      });
    }
  }
  return tiles;
}

/**
 * Draws the map at a fractional zoom. The level below is always drawn so there are no gaps;
 * the level above fades in on top as it gets sharp, and being mounted early preloads it.
 */
export function MapTiles({ center, zoom, width, height }: { center: LngLat; zoom: number; width: number; height: number }) {
  const base = Math.max(0, Math.min(17, Math.floor(zoom)));
  const levels = [base, base + 1];
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {levels.map((level) => {
        const scale = 2 ** (zoom - level);
        const opacity = level === base ? 1 : Math.min(1, Math.max(0, (zoom - base) * 2));
        return (
          <AbsoluteFill key={level} style={{ opacity, filter: "grayscale(1)" }}>
            {tilesFor(center, level, scale, width, height).map((t) => (
              // Plain <img>, not Remotion's <Img>: tiles come and go every frame and a missing
              // tile should leave the level below showing, not stall or fail the video.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                key={t.key}
                onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                src={t.url}
                style={{ position: "absolute", left: t.left, top: t.top, width: t.size + 0.5, height: t.size + 0.5 }}
              />
            ))}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
}
