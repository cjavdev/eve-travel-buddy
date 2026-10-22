import { describe, expect, it } from 'vitest';
import { formatWhen } from '../agent/lib/reel';
import { parseOpenverse, parsePhotos } from '../agent/lib/sources/photos';
import { project, tilesFor, toScreen, unwrap } from '../remotion/map';

describe('formatWhen', () => {
  it('formats a dated window and a typical month', () => {
    expect(formatWhen({ year: 2027, month: 4, start: '2027-04-02', end: '2027-04-06' })).toBe('Apr 2–6, 2027');
    expect(formatWhen({ year: 2027, month: 6, start: '2027-06-29', end: '2027-07-02' })).toBe('Jun 29–Jul 2, 2027');
    expect(formatWhen({ year: 2027, month: 7 })).toBe('July 2027');
  });
});

describe('map math', () => {
  it('projects the world into one tile at zoom 0', () => {
    expect(project({ lng: 0, lat: 0 }, 0)).toEqual({ x: 256, y: 256 });
    expect(project({ lng: -180, lat: 0 }, 1).x).toBe(0);
  });

  it('takes the short way across the date line', () => {
    expect(unwrap({ lng: -122.38, lat: 37.62 }, { lng: 139.65, lat: 35.68 }).lng).toBeCloseTo(-220.35);
    expect(unwrap({ lng: -122.38, lat: 37.62 }, { lng: 4.9, lat: 52.37 }).lng).toBe(4.9);
  });

  it('centers the center point on screen', () => {
    const c = { lng: 139.65, lat: 35.68 };
    expect(toScreen(c, c, 9.5, 1080, 1920)).toEqual({ x: 540, y: 960 });
  });

  it('wraps tile columns and covers the viewport', () => {
    const tiles = tilesFor({ lng: -180, lat: 0 }, 2, 1, 1080, 1920);
    const cols = new Set(tiles.map((t) => t.url.split('/').at(-2)));
    expect(cols).toContain('3');
    expect(tiles.every((t) => !t.url.includes('/-'))).toBe(true);
    expect(Math.min(...tiles.map((t) => t.left))).toBeLessThanOrEqual(0);
  });
});

describe('photo parsers', () => {
  it('reads Commons thumbnails with credits and drops panoramas', () => {
    const photos = parsePhotos({
      query: {
        pages: {
          '2': { index: 2, imageinfo: [{ thumburl: 'b.jpg', thumbwidth: 1080, thumbheight: 720, descriptionurl: 'B', extmetadata: { Artist: { value: '<a href="x">Ann</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' } } }] },
          '1': { index: 1, imageinfo: [{ thumburl: 'a.jpg', thumbwidth: 1080, thumbheight: 300, descriptionurl: 'A' }] },
        },
      },
    });
    expect(photos).toEqual([{ url: 'b.jpg', width: 1080, height: 720, credit: 'Ann, CC BY-SA 4.0', pageUrl: 'B' }]);
  });

  it('reads Openverse results', () => {
    const [photo] = parseOpenverse({ results: [{ url: 'o.jpg', width: 1600, height: 1067, creator: 'Bo', license: 'by', license_version: '2.0', foreign_landing_url: 'F' }] });
    expect(photo).toEqual({ url: 'o.jpg', width: 1600, height: 1067, credit: 'Bo, CC BY 2.0', pageUrl: 'F' });
  });
});
