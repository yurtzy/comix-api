import { NextRequest } from 'next/server';
import { fetchDirect } from '@/lib/proxy';
import { getChaptersListDecryptor } from '@/lib/vm';

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

    // Step 1: Fetch comix homepage to extract a fresh 'cfg' token
    const homepageUrl = 'https://comix.to/';
    const homepageRes = await fetchDirect(homepageUrl, { isHtml: true, revalidate: 3600 });
    
    if (!homepageRes.ok) {
      return Response.json({ error: 'Failed to retrieve configuration token' }, { status: 500 });
    }
    
    const homepageHtml = await homepageRes.text();
    const cfgMatch = homepageHtml.match(/<meta[^>]+name=["']cfg["'][^>]+content=["']([^"']+)["']/i) ||
                     homepageHtml.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']cfg["']/i);
                     
    if (!cfgMatch) {
      return Response.json({ error: 'Failed to parse configuration token' }, { status: 500 });
    }
    
    const cfgToken = cfgMatch[1];

    // Step 2: Initialize local mock-browser sandbox decryptor
    const decryptor = getChaptersListDecryptor(hashId, cfgToken);
    
    // Step 3: Compute the signature parameter using VM
    const signature = await decryptor.getSignature();
    if (!signature) {
      return Response.json({ error: 'Failed to compute request signature' }, { status: 500 });
    }

    // Proxy the internal JSON API of comix.to v1
    const apiUrl = new URL(`https://comix.to/api/v1/manga/${hashId}/chapters`);
    apiUrl.searchParams.set('_', signature);

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

    const encryptedData = await res.json();

    // Step 5: Decrypt the response envelope using the VM interceptor
    const decryptedData = await decryptor.decryptResponse(encryptedData);
    if (!decryptedData) {
      return Response.json({ error: 'Failed to decrypt chapters payload' }, { status: 500 });
    }

    return Response.json(decryptedData);

  } catch (error) {
    console.error('[manga/chapters] Error fetching/decrypting chapters:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
