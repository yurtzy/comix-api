import { NextRequest } from 'next/server';
import * as cheerio from 'cheerio';
import { getProxyUrl } from '@/lib/proxy';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return Response.json({ error: 'Missing path parameter "id"' }, { status: 400 });
    }

    const hashId = id.split('-')[0];

    const apiUrl = `https://comix.to/api/v2/manga/${hashId}`;
    const htmlUrl = `https://comix.to/title/${id}`;
    
    const [apiRes, htmlRes] = await Promise.all([
      fetch(getProxyUrl(apiUrl), { next: { revalidate: 3600 } }),
      fetch(getProxyUrl(htmlUrl), { next: { revalidate: 3600 } })
    ]);
    
    if (!apiRes.ok) {
      return Response.json({ error: 'Comic not found' }, { status: apiRes.status });
    }

    const data = await apiRes.json();
    const item = data.result;

    if (!item) {
       return Response.json({ error: 'Comic not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const sfw = searchParams.get('sfw') === 'true';

    // Apply SFW filter if requested
    if (sfw) {
      const NSFW_GENRE_IDS = [87264, 87266, 87268, 87265];
      if (item.is_nsfw) return Response.json({ error: 'Comic not found (NSFW)' }, { status: 404 });
      const itemGenreIds = item.genres?.map((g: any) => g.id) || [];
      if (itemGenreIds.some((id: number) => NSFW_GENRE_IDS.includes(id))) {
         return Response.json({ error: 'Comic not found (NSFW)' }, { status: 404 });
      }
    }

    let followed = `${item.follows_total} users`;
    let type = item.type || 'manga';
    let demographics = '';
    let authors = item.authors?.map((a: any) => a.title).join(', ') || 'Unknown';
    let artists = item.artists?.map((a: any) => a.title).join(', ') || 'Unknown';
    let genres = item.genres?.map((g: any) => g.title) || [];
    let themes: string[] = [];
    let originalLanguage = item.original_language || 'Unknown';
    let referrers: string[] = [];
    let scanlation_groups: { scanlation_group_id: number, name: string }[] = [];

    if (htmlRes.ok) {
      const html = await htmlRes.text();
      const $ = cheerio.load(html);

      const findStat = (label: string) => {
         const el = $(`*:contains("${label}")`).last().parent();
         return el;
      };

      const followedEl = findStat('Followed:');
      if (followedEl.length) followed = followedEl.find('span').text().trim() || followed;

      const typeEl = findStat('Type:');
      if (typeEl.length) type = typeEl.find('a').text().trim() || type;

      const demEl = findStat('Demographics:');
      if (demEl.length) demographics = demEl.find('span').text().trim() || demEl.find('a').text().trim();

      const authEl = findStat('Authors:');
      if (authEl.length) {
          const arr: string[] = [];
          authEl.find('a').each((i, el) => { arr.push($(el).text().trim()) });
          if (arr.length) authors = arr.join(', ');
      }

      const artEl = findStat('Artists:');
      if (artEl.length) {
          const arr: string[] = [];
          artEl.find('a').each((i, el) => { arr.push($(el).text().trim()) });
          if (arr.length) artists = arr.join(', ');
      }

      const genEl = findStat('Genres:');
      if (genEl.length) {
          const arr: string[] = [];
          genEl.find('a').each((i, el) => { arr.push($(el).text().trim()) });
          if (arr.length) genres = arr;
      }

      const themeEl = findStat('Themes:');
      if (themeEl.length) {
          const arr: string[] = [];
          themeEl.find('a').each((i, el) => { arr.push($(el).text().trim()) });
          themes = arr;
      }

      const langEl = findStat('Original language:');
      if (langEl.length) {
          const txt = langEl.find('span').text().trim() || langEl.text().replace('Original language:', '').trim();
          if (txt) originalLanguage = txt;
      }

      const refEl = findStat('Referrers:');
      if (refEl.length) {
         const arr: string[] = [];
         refEl.find('img').each((i, el) => {
            const alt = $(el).attr('alt');
            if (alt) arr.push(alt);
         });
         referrers = arr;
      }

      // Extract scanlation groups from Next.js payload
      const scriptMatch = html.match(/\\"scanlationGroups\\":(\[.*?\])/);
      if (scriptMatch) {
          try {
              const rawJson = scriptMatch[1].replace(/\\"/g, '"');
              scanlation_groups = JSON.parse(rawJson);
          } catch(e) {
              console.error("Failed to parse scanlation groups JSON", e);
          }
      }
    }

    const comic = {
      id: `${item.hash_id}-${item.slug}`,
      slug: item.slug,
      title: item.title,
      altTitles: item.alt_titles,
      cover: (item.poster?.large || item.poster?.medium) ? `/api/image?url=${encodeURIComponent(item.poster?.large || item.poster?.medium)}` : null,
      
      score: item.rated_avg,
      scoreUsers: item.rated_count,
      
      followed,
      type,
      demographics,
      authors,
      artists,
      genres,
      themes,
      originalLanguage,
      referrers,
      scanlation_groups,

      format: item.type || 'manga',
      status: item.status,
      synopsis: item.synopsis,
      latest_chapter: item.latest_chapter,
      year: item.year
    };

    return Response.json({ comic });

  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
