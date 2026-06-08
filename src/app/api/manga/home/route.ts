import { NextRequest, NextResponse } from 'next/server';
import { fetchDirect, isCloudflareChallenge } from '@/lib/proxy';

export async function GET(request: NextRequest) {
  try {
    const targetUrl = 'https://comix.to/';
    const res = await fetchDirect(targetUrl, { isHtml: true, revalidate: 3600 });
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch source' }, { status: res.status });
    }

    const html = await res.text();

    if (isCloudflareChallenge(html)) {
      console.error('[home] Cloudflare is blocking the request — try setting PROXY_URL env var to a CF-bypass proxy');
      return NextResponse.json({ error: 'Source blocked by Cloudflare bot protection.' }, { status: 503 });
    }

    // Extract JSON from <script type="application/json" id="initial-data">
    const startTag = '<script type="application/json" id="initial-data">';
    const endTag = '</script>';
    
    const startIndex = html.indexOf(startTag);
    if (startIndex === -1) {
      return NextResponse.json({ error: 'Failed to parse page structure (missing initial-data)' }, { status: 500 });
    }
    
    const contentStartIndex = startIndex + startTag.length;
    const endIndex = html.indexOf(endTag, contentStartIndex);
    if (endIndex === -1) {
      return NextResponse.json({ error: 'Failed to parse page structure (malformed JSON tag)' }, { status: 500 });
    }
    
    const jsonText = html.substring(contentStartIndex, endIndex);
    const data = JSON.parse(jsonText);
    const queries = data.queries || {};

    const popular: any[] = [];
    const latest: any[] = [];
    const recentlyAdded: any[] = [];
    const completed: any[] = [];

    const { searchParams } = new URL(request.url);
    const sfw = searchParams.get('sfw') === 'true';

    // Helper to map API manga item to standard output format
    const mapMangaItem = (item: any) => {
      const title = item.title;
      const hid = item.hid || item.hash_id || '';
      const slug = item.slug || (item.url ? item.url.replace('/title/', '').replace(`${hid}-`, '') : '');
      const link = item.url || (hid ? `/title/${hid}-${slug}` : null);
      const img = item.poster?.medium || item.poster?.large || null;
      const latestChapter = item.latestChapter !== undefined ? item.latestChapter : item.latest_chapter;
      const chapter = latestChapter ? `Ch.${latestChapter}` : 'N/A';
      const id = link ? link.replace('/title/', '') : null;
      
      return { title, link, img, chapter, genres: [], id };
    };

    // 1. Parse Popular (Trending)
    const popularKey = Object.keys(queries).find(k => k.includes('"trending"') && k.includes('"manga","top"'));
    const popularItems = popularKey ? queries[popularKey] : [];
    if (Array.isArray(popularItems)) {
      popularItems.forEach((item: any) => {
        if (sfw && (item.contentRating === 'nsfw' || item.contentRating === 'suggestive')) return;
        const mapped = mapMangaItem(item);
        if (mapped.title && mapped.id) {
          popular.push(mapped);
        }
      });
    }

    // 2. Parse Latest (Hot updates)
    const latestKey = Object.keys(queries).find(k => k.includes('"scope":"hot"') && k.includes('"chapter_updated_at":"desc"'));
    const latestResult = latestKey ? queries[latestKey] : null;
    const latestItems = latestResult?.items || [];
    if (Array.isArray(latestItems)) {
      latestItems.forEach((item: any) => {
        if (sfw && (item.contentRating === 'nsfw' || item.contentRating === 'suggestive')) return;
        const mapped = mapMangaItem(item);
        if (mapped.title && mapped.id) {
          latest.push(mapped);
        }
      });
    }

    // 3. Parse Recently Added (from initial-data or fallback fetch)
    const recentlyAddedKey = Object.keys(queries).find(k => k.includes('"order":{"created_at":"desc"}') && k.includes('"manga","list"'));
    const recentlyAddedResult = recentlyAddedKey ? queries[recentlyAddedKey] : null;
    let recentlyAddedItems = recentlyAddedResult?.items || [];

    if (!recentlyAddedItems || recentlyAddedItems.length === 0) {
      try {
        const fallbackUrl = 'https://comix.to/api/v1/manga?order[created_at]=desc&limit=20';
        const fallbackRes = await fetchDirect(fallbackUrl, { revalidate: 3600 });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          recentlyAddedItems = fallbackData.result?.items || [];
        }
      } catch (e) {
        console.error('[home] Failed recently added fallback fetch:', e);
      }
    }

    if (Array.isArray(recentlyAddedItems)) {
      const NSFW_GENRE_IDS = [87264, 87266, 87268, 87265];
      recentlyAddedItems.forEach((item: any) => {
        if (sfw) {
          if (item.is_nsfw || item.contentRating === 'nsfw' || item.contentRating === 'suggestive') return;
          const itemGenreIds = item.genres?.map((g: any) => g.id) || [];
          if (itemGenreIds.some((id: number) => NSFW_GENRE_IDS.includes(id))) return;
        }
        const mapped = mapMangaItem(item);
        if (mapped.title && mapped.id) {
          recentlyAdded.push(mapped);
        }
      });
    }

    // 4. Fetch Completed Series (Statuses = Finished)
    try {
      const completedUrl = 'https://comix.to/api/v1/manga?statuses[]=finished&order[created_at]=desc&limit=20';
      const completedRes = await fetchDirect(completedUrl, { revalidate: 3600 });
      if (completedRes.ok) {
        const completedData = await completedRes.json();
        const completedItems = completedData.result?.items || [];
        if (Array.isArray(completedItems)) {
          const NSFW_GENRE_IDS = [87264, 87266, 87268, 87265];
          completedItems.forEach((item: any) => {
            if (sfw) {
              if (item.is_nsfw || item.contentRating === 'nsfw' || item.contentRating === 'suggestive') return;
              const itemGenreIds = item.genres?.map((g: any) => g.id) || [];
              if (itemGenreIds.some((id: number) => NSFW_GENRE_IDS.includes(id))) return;
            }
            const mapped = mapMangaItem(item);
            if (mapped.title && mapped.id) {
              completed.push(mapped);
            }
          });
        }
      }
    } catch (e) {
      console.error('[home] Failed completed series fetch:', e);
    }

    // 5. Parse Popular Groups (topUploaders)
    const groupsKey = Object.keys(queries).find(k => k.includes('"topUploaders"') && k.includes('"users"'));
    const groupsItems = groupsKey ? queries[groupsKey] : [];
    const popularGroups = Array.isArray(groupsItems) ? groupsItems.map((item: any) => ({
      id: item.hashId,
      name: item.displayName || item.username,
      slug: item.username,
      avatar: item.avatar,
      upload_count: item.uploadCount,
      link: `/api/manga/groups?keyword=${encodeURIComponent(item.displayName || item.username)}`
    })) : [];

    // 6. Parse Collections
    const collectionsKey = Object.keys(queries).find(k => k.includes('"collections"') && k.includes('"list"'));
    const collectionsResult = collectionsKey ? queries[collectionsKey] : null;
    const collectionsItems = collectionsResult?.items || [];
    const collections = Array.isArray(collectionsItems) ? collectionsItems.map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      item_count: item.itemCount,
      like_count: item.likeCount,
      cover: item.cover,
      created_at: item.createdAtFormatted,
      updated_at: item.updatedAtFormatted,
      link: `/api/manga/collections/${item.id}`
    })) : [];

    return Response.json({ popular, latest, recentlyAdded, completed, popularGroups, collections });

  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
