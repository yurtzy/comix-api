import { NextRequest } from 'next/server';
import { getProxyUrl } from '@/lib/proxy';

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
    const { searchParams } = new URL(request.url);

    // Proxy the internal JSON API of comix.to
    const apiUrl = new URL(`https://comix.to/api/v2/manga/${hashId}/chapters`);

    // Forward applicable search filters like limit, page, scanlation_group_id
    for (const [key, value] of searchParams.entries()) {
      apiUrl.searchParams.set(key, value);
    }

    const proxyUrl = getProxyUrl(apiUrl.toString());
    const res = await fetch(proxyUrl, {
      next: { revalidate: 60 } // Shorter revalidation for chapters to stay updated
    });
    
    if (!res.ok) {
      return Response.json({ error: 'Failed to fetch chapters' }, { status: res.status });
    }

    const data = await res.json();
    return Response.json(data);

  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
