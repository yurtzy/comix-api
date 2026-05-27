import { NextRequest } from 'next/server';
import { fetchDirect } from '@/lib/proxy';
import { getChapterDecryptor } from '@/lib/vm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');
    
    if (!chapterId) {
      return Response.json({ error: 'Missing query parameter "chapterId"' }, { status: 400 });
    }

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
    const decryptor = getChapterDecryptor(chapterId, cfgToken);
    
    // Step 3: Compute the signature parameter using VM
    const signature = await decryptor.getSignature();
    if (!signature) {
      return Response.json({ error: 'Failed to compute request signature' }, { status: 500 });
    }

    // Step 4: Fetch the encrypted response from the upstream chapter API
    const targetUrl = `https://comix.to/api/v1/chapters/${chapterId}?_=${encodeURIComponent(signature)}`;
    const res = await fetchDirect(targetUrl, { 
      revalidate: 3600,
      initHeaders: request.headers
    });
    
    if (!res.ok) {
      return Response.json({ error: 'Chapter not found' }, { status: res.status });
    }

    const encryptedData = await res.json();

    // Step 5: Decrypt the response envelope using the VM interceptor
    const decryptedData = await decryptor.decryptResponse(encryptedData);
    if (!decryptedData) {
      return Response.json({ error: 'Failed to decrypt chapter payload' }, { status: 500 });
    }

    // Step 6: Map pages and handle URL unscrambling logic
    const pagesData = decryptedData.pages;
    let images: any[] = [];

    if (pagesData && typeof pagesData === 'object' && Array.isArray(pagesData.items)) {
      const baseUrl = pagesData.baseUrl || '';
      const scrambledBaseUrl = baseUrl.replace(/\/i\/(?=[bh])/, '/si/');

      images = pagesData.items.map((page: any) => {
        const isScrambled = page.s === 1;
        const pageBaseUrl = isScrambled ? scrambledBaseUrl : baseUrl;

        return {
          url: page.url ? (page.url.startsWith('http') ? page.url : pageBaseUrl + page.url) : '',
          width: page.width || 0,
          height: page.height || 0,
          scramble: isScrambled
        };
      });
    }

    return Response.json({ 
      chapterId: decryptedData.id || decryptedData.chapter_id || chapterId,
      images,
      total_images: images.length
    });

  } catch (error) {
    console.error('[manga/read] Error fetching/decrypting chapter:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
