import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return Response.json({ error: 'Missing query parameter "id"' }, { status: 400 });
    }

    const hashId = id.split('-')[0];

    const res = await fetch(`https://comix.to/api/v2/manga/${hashId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://comix.to/'
      },
      next: { revalidate: 3600 }
    });
    
    if (!res.ok) {
      return Response.json({ error: 'Comic not found' }, { status: res.status });
    }

    const data = await res.json();
    const item = data.result;

    if (!item) {
       return Response.json({ error: 'Comic not found' }, { status: 404 });
    }

    const comic = {
      id: `${item.hash_id}-${item.slug}`,
      slug: item.slug,
      title: item.title,
      altTitles: item.alt_titles,
      cover: item.poster?.large || item.poster?.medium,
      format: item.type || 'manga',
      status: item.status,
      author: item.authors?.map((a: any) => a.title).join(', ') || 'Unknown',
      artist: item.artists?.map((a: any) => a.title).join(', ') || 'Unknown',
      genres: item.genres?.map((g: any) => g.title) || [],
      synopsis: item.synopsis,
      latest_chapter: item.latest_chapter,
      score: item.rated_avg,
      year: item.year
    };

    return Response.json({ comic });

  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
