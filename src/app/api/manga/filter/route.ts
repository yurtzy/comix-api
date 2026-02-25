import { NextRequest } from 'next/server';
import { getProxyUrl } from '@/lib/proxy';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Base internal JSON API of comix.to
    const apiUrl = new URL('https://comix.to/api/v2/manga');

    // Forward applicable search filters like limit, page, order
    for (const [key, value] of searchParams.entries()) {
      // comix.to expects 'genres[]' for multiple genres.
      // E.g., if client passes ?genres=action,adventure
      if (key === 'genres') {
        const genreList = value.split(',');
        genreList.forEach(g => apiUrl.searchParams.append('genres[]', g.trim()));
      } else {
        apiUrl.searchParams.append(key, value);
      }
    }

    const proxyUrl = getProxyUrl(apiUrl.toString());
    const res = await fetch(proxyUrl, {
      next: { revalidate: 3600 }
    });
    
    if (!res.ok) {
      return Response.json({ error: 'Failed to fetch filter results' }, { status: res.status });
    }

    const data = await res.json();

    // Map the internal API format to our concise API
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
      img: (item.poster?.large || item.poster?.medium) ? `/api/image?url=${encodeURIComponent(item.poster?.large || item.poster?.medium)}` : null,
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
