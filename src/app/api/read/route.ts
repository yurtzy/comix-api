import { NextRequest } from 'next/server';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');
    
    if (!chapterId) {
      return Response.json({ error: 'Missing query parameter "chapterId"' }, { status: 400 });
    }

    const res = await fetch(`https://comix.to/api/v2/chapters/${chapterId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://comix.to/'
      },
      next: { revalidate: 3600 }
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
      url: img.url,
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
