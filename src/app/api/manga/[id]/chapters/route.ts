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

    const hashId = id.split('-')[0];
    const { searchParams } = new URL(request.url);

    // Proxy the internal JSON API of comix.to v1
    const apiUrl = new URL(`https://comix.to/api/v1/manga/${hashId}/chapters`);

    // Forward applicable search filters like limit, page, scanlation_group_id
    for (const [key, value] of searchParams.entries()) {
      apiUrl.searchParams.set(key, value);
    }

    // Forward incoming request headers to preserve cloudflare turnstile tokens
    const res = await fetchDirect(apiUrl.toString(), {
      revalidate: 60, // Shorter revalidation for chapters to stay updated
      initHeaders: request.headers
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
