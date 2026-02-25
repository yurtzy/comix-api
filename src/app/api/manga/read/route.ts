import { NextRequest } from 'next/server';
import { getProxyUrl } from '@/lib/proxy';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');
    
    if (!chapterId) {
      return Response.json({ error: 'Missing query parameter "chapterId"' }, { status: 400 });
    }

    const targetUrl = `https://comix.to/api/v2/chapters/${chapterId}`;
    const proxyUrl = getProxyUrl(targetUrl);
    const res = await fetch(proxyUrl, {
      next: { revalidate: 3600 },
      redirect: 'follow'
    });
    
    if (!res.ok) {
      return Response.json({ error: 'Chapter not found' }, { status: res.status });
    }

    const data = await res.json();
    const item = data.result;

    if (!item || !item.images) {
      return Response.json({ error: 'Failed to retrieve images' }, { status: 404 });
    }

    const images = item.images.map((img: any) => ({
      url: `/api/image?url=${encodeURIComponent(img.url)}`,
      width: img.width,
      height: img.height
    }));

    return Response.json({ 
      chapterId: item.chapter_id,
      images,
      total_images: images.length
    });

  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
