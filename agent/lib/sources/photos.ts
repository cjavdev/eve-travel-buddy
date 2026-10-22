import { cached, getJson } from './cache';

// Wikimedia Commons: free, keyless, and every file carries its license and author.
// We ask for 1080px-wide thumbnails so the reel's photos are sharp in a 1080x1920 video.
const API = 'https://commons.wikimedia.org/w/api.php';
// Wikimedia asks API clients to identify themselves.
const HEADERS = { 'User-Agent': 'eve-travel-buddy/0.1 (https://github.com/cjavdev/eve-travel-buddy)' };

export interface Photo {
  url: string;
  width: number;
  height: number;
  /** "Author, License", ready to print as a credit line. */
  credit: string;
  pageUrl: string;
}

const stripHtml = (s?: string) => (s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

export function parsePhotos(json: any): Photo[] {
  const pages: any[] = Object.values(json?.query?.pages ?? {});
  return pages
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((page) => {
      const info = page.imageinfo?.[0];
      if (!info?.thumburl) return null;
      const meta = info.extmetadata ?? {};
      const author = stripHtml(meta.Artist?.value).slice(0, 60) || 'Wikimedia Commons';
      const license = stripHtml(meta.LicenseShortName?.value);
      return {
        url: info.thumburl,
        width: info.thumbwidth,
        height: info.thumbheight,
        credit: license ? `${author}, ${license}` : author,
        pageUrl: info.descriptionurl,
      };
    })
    // Skip panoramas and tiny images; they crop badly into a vertical frame.
    .filter((p): p is Photo => p !== null && p.width >= 800 && p.width / p.height < 2.2);
}

async function searchCommons(query: string, limit: number): Promise<Photo[]> {
  return cached(`commons:${query}:${limit}`, async () => {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      origin: '*',
      generator: 'search',
      gsrsearch: `${query} filetype:bitmap`,
      gsrnamespace: '6',
      gsrlimit: String(limit + 5),
      prop: 'imageinfo',
      iiprop: 'url|extmetadata',
      iiurlwidth: '1080',
      iiextmetadatafilter: 'Artist|LicenseShortName',
    });
    return parsePhotos(await getJson(`${API}?${params}`, HEADERS)).slice(0, limit);
  });
}

// Openverse: keyless search over openly licensed photos (Flickr and more). Used to top up
// when Commons comes back short. Anonymous use is rate limited, which is fine for a demo.
const OPENVERSE = 'https://api.openverse.org/v1/images/';

export function parseOpenverse(json: any): Photo[] {
  return (json?.results ?? [])
    .filter((r: any) => r.url && (!r.width || (r.width >= 800 && r.width / r.height < 2.2)))
    .map((r: any) => ({
      url: r.url,
      width: r.width ?? 1080,
      height: r.height ?? 1350,
      credit: [r.creator, r.license && `CC ${String(r.license).toUpperCase()} ${r.license_version ?? ''}`.trim()].filter(Boolean).join(', ') || 'Openverse',
      pageUrl: r.foreign_landing_url ?? r.url,
    }));
}

async function searchOpenverse(query: string, limit: number): Promise<Photo[]> {
  return cached(`openverse:${query}:${limit}`, async () => {
    const params = new URLSearchParams({ q: query, page_size: String(limit + 5), category: 'photograph', mature: 'false' });
    return parseOpenverse(await getJson(`${OPENVERSE}?${params}`, HEADERS)).slice(0, limit);
  });
}

/** Up to `limit` distinct photos for a search, Commons first, Openverse to fill the gap. */
export async function searchPhotos(query: string, limit = 3): Promise<Photo[]> {
  const photos = await searchCommons(query, limit).catch(() => [] as Photo[]);
  if (photos.length >= limit) return photos;
  const more = await searchOpenverse(query, limit).catch(() => [] as Photo[]);
  return [...photos, ...more].slice(0, limit);
}
