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

    const { searchParams } = new URL(request.url);
    const sfw = searchParams.get('sfw') === 'true';

    // 1. Parse Popular (Trending)
    const popularKey = Object.keys(queries).find(k => k.includes('"trending"') && k.includes('"manga","top"'));
    const popularItems = popularKey ? queries[popularKey] : [];
    if (Array.isArray(popularItems)) {
      popularItems.forEach((item: any) => {
        const title = item.title;
        const link = item.url;
        const img = item.poster?.medium || item.poster?.large || null;
        const latestChapter = item.latestChapter !== undefined ? item.latestChapter : item.latest_chapter;
        const chapter = latestChapter ? `Ch.${latestChapter}` : 'N/A';
        const id = link ? link.replace('/title/', '') : null;
        
        // SFW filter: check contentRating
        if (sfw && (item.contentRating === 'nsfw' || item.contentRating === 'suggestive')) return;

        if (title && id) {
          popular.push({ title, link, img, chapter, genres: [], id });
        }
      });
    }

    // 2. Parse Latest (Hot updates)
    const latestKey = Object.keys(queries).find(k => k.includes('"scope":"hot"') && k.includes('"chapter_updated_at":"desc"'));
    const latestResult = latestKey ? queries[latestKey] : null;
    const latestItems = latestResult?.items || [];
    if (Array.isArray(latestItems)) {
      latestItems.forEach((item: any) => {
        const title = item.title;
        const link = item.url;
        const img = item.poster?.medium || item.poster?.large || null;
        const latestChapter = item.latestChapter !== undefined ? item.latestChapter : item.latest_chapter;
        const chapter = latestChapter ? `Ch.${latestChapter}` : 'N/A';
        const id = link ? link.replace('/title/', '') : null;

        if (sfw && (item.contentRating === 'nsfw' || item.contentRating === 'suggestive')) return;

        if (title && id) {
          latest.push({ title, link, img, chapter, genres: [], id });
        }
      });
    }

    return Response.json({ popular, latest });

  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
