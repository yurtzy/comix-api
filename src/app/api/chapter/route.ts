import { NextRequest } from 'next/server';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const comicId = searchParams.get('comicId');
    const page = searchParams.get('page') || '1';
    
    if (!comicId) {
      return Response.json({ error: 'Missing query parameter "comicId"' }, { status: 400 });
    }

    const hashId = comicId.split('-')[0];

    const apiUrl = new URL(`https://comix.to/api/v2/manga/${hashId}/chapters`);
    apiUrl.searchParams.set('limit', '50');
    apiUrl.searchParams.set('page', page);
    apiUrl.searchParams.set('order[number]', 'desc');

    const proxyUrl = `https://script.google.com/macros/s/AKfycbwp4VIpqcx-Dq06Ig7EKCjVqLy5WFDEdmqJTEyE-JwhJQywenfjhb-M1wL4R-i76vij/exec?url=${encodeURIComponent(apiUrl.toString())}`;
    const res = await fetch(proxyUrl, {
      next: { revalidate: 3600 }
    });
    
    if (!res.ok) {
      return Response.json({ error: 'Chapters not found' }, { status: res.status });
    }

    const data = await res.json();
    
    const chapters = (data.result?.items || []).map((ch: any) => ({
      id: ch.chapter_id,
      number: ch.number,
      title: ch.title || `Chapter ${ch.number}`,
      date: ch.created_at,
      views: ch.votes,
      link: `/read/${ch.chapter_id}`
    }));

    return Response.json({ chapters, pagination: data.result?.pagination });

  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
