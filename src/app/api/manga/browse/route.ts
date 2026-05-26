import { NextRequest } from 'next/server';
import { fetchDirect } from '@/lib/proxy';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Proxy the internal JSON API of comix.to v1
    const apiUrl = new URL('https://comix.to/api/v1/manga');

    // Default sorts for browsing if not provided
    if (!searchParams.has('sort')) {
      apiUrl.searchParams.set('sort', 'newest'); // e.g. newest, top, updated
    }

    for (const [key, value] of searchParams.entries()) {
      apiUrl.searchParams.append(key, value);
    }

    const res = await fetchDirect(apiUrl.toString(), { revalidate: 3600 });
    
    if (!res.ok) {
      return Response.json({ error: 'Failed to fetch browse results' }, { status: res.status });
    }

    const data = await res.json();

    let items = data.result?.items || [];
    
    // Apply SFW filter if requested
    const sfw = searchParams.get('sfw') === 'true';
    if (sfw) {
      const NSFW_GENRE_IDS = [87264, 87266, 87268, 87265];
      items = items.filter((item: any) => {
        if (item.is_nsfw) return false;
        const itemGenreIds = item.genres?.map((g: any) => g.id) || [];
        if (itemGenreIds.some((id: number) => NSFW_GENRE_IDS.includes(id))) return false;
        return true;
      });
    }

    const results = items.map((item: any) => {
      const hid = item.hid || item.hash_id;
      const score = item.ratedAvg !== undefined ? item.ratedAvg : item.rated_avg;
      const latestChapter = item.latestChapter !== undefined ? item.latestChapter : item.latest_chapter;

      const id = item.url ? item.url.replace('/title/', '') : `${hid}-${item.slug || ''}`;
      const slug = item.slug || (item.url ? item.url.replace('/title/', '').replace(`${hid}-`, '') : '');
      const link = item.url || `/title/${hid}-${slug}`;

      return {
        id,
        slug,
        title: item.title,
        alt_titles: item.altTitles || item.alt_titles,
        link,
        img: (item.poster?.large || item.poster?.medium) || null,
        chapter: latestChapter ? `Ch.${latestChapter}` : 'N/A',
        genres: item.genres?.map((g: any) => g.title) || [],
        synopsis: item.synopsis,
        status: item.status,
        score,
        year: item.year,
        type: item.type
      };
    });

    return Response.json({ results, pagination: data.result?.pagination });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
