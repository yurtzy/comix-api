import { NextRequest } from 'next/server';
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

    const apiUrl = `https://comix.to/api/v1/collections/${id}`;
    const res = await fetchDirect(apiUrl, { revalidate: 3600 });
    
    if (!res.ok) {
      return Response.json({ error: 'Collection not found' }, { status: res.status });
    }

    const data = await res.json();
    const result = data.result;

    if (!result) {
      return Response.json({ error: 'Collection not found' }, { status: 404 });
    }

    const collection = {
      id: result.id,
      name: result.name || 'Untitled Collection',
      description: result.description || '',
      itemCount: result.itemCount || 0,
      likeCount: result.likeCount || 0,
      cover: result.cover || null,
      createdAtFormatted: result.createdAtFormatted || null,
      updatedAtFormatted: result.updatedAtFormatted || null
    };

    const rawItems = result.items || [];
    const results = rawItems.map((item: any) => {
      const hid = item.hid || item.hash_id;
      const score = item.ratedAvg !== undefined ? item.ratedAvg : item.rated_avg;
      const latestChapter = item.latestChapter !== undefined ? item.latestChapter : item.latest_chapter;

      const mangaId = item.url ? item.url.replace('/title/', '') : `${hid}-${item.slug || ''}`;
      const slug = item.slug || (item.url ? item.url.replace('/title/', '').replace(`${hid}-`, '') : '');
      const link = item.url || `/title/${hid}-${slug}`;

      return {
        id: mangaId,
        slug,
        title: item.title,
        alt_titles: item.altTitles || item.alt_titles || [],
        link,
        img: (item.poster?.large || item.poster?.medium) || null,
        chapter: latestChapter ? `Ch.${latestChapter}` : 'N/A',
        genres: item.genres?.map((g: any) => g.title) || [],
        synopsis: item.synopsis || '',
        status: item.status || 'unknown',
        score: score || 0,
        year: item.year || null,
        type: item.type || 'manga'
      };
    });

    return Response.json({ collection, results });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
