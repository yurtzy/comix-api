import { NextRequest } from 'next/server';
import { getProxyUrl } from '@/lib/proxy';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // The comix.to /api/v2/manga supports sorting, limiting, paging which acts like a browse feature
    const apiUrl = new URL('https://comix.to/api/v2/manga');

    // Default sorts for browsing if not provided
    if (!searchParams.has('sort')) {
      apiUrl.searchParams.set('sort', 'newest'); // e.g. newest, top, updated
    }

    for (const [key, value] of searchParams.entries()) {
      apiUrl.searchParams.append(key, value);
    }

    const proxyUrl = getProxyUrl(apiUrl.toString());
    const res = await fetch(proxyUrl, {
      next: { revalidate: 3600 }
    });
    
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

    const results = items.map((item: any) => ({
      id: `${item.hash_id}-${item.slug}`,
      slug: item.slug,
      title: item.title,
      alt_titles: item.alt_titles,
      link: `/title/${item.hash_id}-${item.slug}`,
      img: (item.poster?.large || item.poster?.medium) || null,
      chapter: item.latest_chapter ? `Ch.${item.latest_chapter}` : 'N/A',
      genres: item.genres?.map((g: any) => g.title) || [],
      synopsis: item.synopsis,
      status: item.status,
      score: item.rated_avg,
      year: item.year,
      type: item.type
    }));

    return Response.json({ results, pagination: data.result?.pagination });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
