import { NextRequest } from 'next/server';
import * as cheerio from 'cheerio';
import { fetchDirect } from '@/lib/proxy';

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

    const apiUrl = `https://comix.to/api/v1/manga/${hashId}`;
    const htmlUrl = `https://comix.to/title/${id}`;
    
    const [apiRes, htmlRes] = await Promise.all([
      fetchDirect(apiUrl, { revalidate: 3600 }),
      fetchDirect(htmlUrl, { isHtml: true, revalidate: 3600 })
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

    const followsTotal = item.followsTotal !== undefined ? item.followsTotal : item.follows_total;
    let followed = `${followsTotal} users`;
    let type = item.type || 'manga';
    let demographics = '';
    let authors = item.authors?.map((a: any) => a.title).join(', ') || 'Unknown';
    let artists = item.artists?.map((a: any) => a.title).join(', ') || 'Unknown';
    let genres = item.genres?.map((g: any) => g.title) || [];
    let themes: string[] = [];
    let originalLanguage = item.originalLanguage || item.original_language || 'Unknown';
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

    let first_chapter_id = null;
    if (item.firstChapterUrl) {
      const parts = item.firstChapterUrl.split('/');
      const lastPart = parts[parts.length - 1]; // e.g. "9777916-chapter-0"
      first_chapter_id = lastPart.split('-')[0];
    }

    let latest_chapter_id = null;
    if (item.latestChapterUrl) {
      const parts = item.latestChapterUrl.split('/');
      const lastPart = parts[parts.length - 1]; // e.g. "9926639-chapter-71"
      latest_chapter_id = lastPart.split('-')[0];
    }

    const hid = item.hid || item.hash_id;
    const slug = item.slug || (item.url ? item.url.replace('/title/', '').replace(`${hid}-`, '') : '');
    const comic = {
      id: `${hid}-${slug}`,
      slug,
      title: item.title,
      altTitles: item.altTitles || item.alt_titles,
      cover: (item.poster?.large || item.poster?.medium) || null,
      
      score: item.ratedAvg !== undefined ? item.ratedAvg : item.rated_avg,
      scoreUsers: item.ratedCount !== undefined ? item.ratedCount : item.rated_count,
      
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
      latest_chapter: item.latestChapter !== undefined ? item.latestChapter : item.latest_chapter,
      year: item.year,
      first_chapter_id,
      latest_chapter_id
    };

    return Response.json({ comic });

  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
