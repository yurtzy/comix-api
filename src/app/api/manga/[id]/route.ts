import { NextRequest } from 'next/server';


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

    const targetUrl = `https://comix.to/api/v2/manga/${hashId}`;
    const proxyUrl = `https://script.google.com/macros/s/AKfycbwp4VIpqcx-Dq06Ig7EKCjVqLy5WFDEdmqJTEyE-JwhJQywenfjhb-M1wL4R-i76vij/exec?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(proxyUrl, {
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
      cover: (item.poster?.large || item.poster?.medium) ? `/api/image?url=${encodeURIComponent(item.poster?.large || item.poster?.medium)}` : null,
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
