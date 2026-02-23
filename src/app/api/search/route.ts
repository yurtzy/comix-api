import { NextRequest } from 'next/server';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    
    if (!q) {
      return Response.json({ error: 'Missing query parameter "q"' }, { status: 400 });
    }

    // Proxy the internal JSON API of comix.to
    const apiUrl = new URL('https://comix.to/api/v2/manga');
    apiUrl.searchParams.set('keyword', q);

    // Forward applicable search filters like limit, page, order
    for (const [key, value] of searchParams.entries()) {
      if (key !== 'q') {
        apiUrl.searchParams.set(key, value);
      }
    }

    const proxyUrl = `https://script.google.com/macros/s/AKfycbwp4VIpqcx-Dq06Ig7EKCjVqLy5WFDEdmqJTEyE-JwhJQywenfjhb-M1wL4R-i76vij/exec?url=${encodeURIComponent(apiUrl.toString())}`;
    const res = await fetch(proxyUrl, {
      next: { revalidate: 3600 }
    });
    
    if (!res.ok) {
      return Response.json({ error: 'Failed to fetch search results' }, { status: res.status });
    }

    const data = await res.json();

    // Map the internal API format to our concise API
    const items = data.result?.items || [];
    const results = items.map((item: any) => ({
      id: `${item.hash_id}-${item.slug}`,
      slug: item.slug,
      title: item.title,
      alt_titles: item.alt_titles,
      link: `/title/${item.hash_id}-${item.slug}`,
      img: item.poster?.large || item.poster?.medium,
      chapter: item.latest_chapter ? `Ch.${item.latest_chapter}` : 'N/A',
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
