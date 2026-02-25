import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { getProxyUrl } from '@/lib/proxy';

export async function GET(request: NextRequest) {
  try {
    const targetUrl = 'https://comix.to/home';
    const proxyUrl = getProxyUrl(targetUrl);
    const res = await fetch(proxyUrl, {
      next: { revalidate: 3600 }
    });
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch source' }, { status: res.status });
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const popular: any[] = [];
    const latest: any[] = [];

    const { searchParams } = new URL(request.url);
    const sfw = searchParams.get('sfw') === 'true';
    const NSFW_GENRES = ['Hentai', 'Erotica', 'Smut', 'Pornographic'];

    // Parse "Most Recent Popular" section
    // Let's assume there's a `.comic .item`
    // We will extract a few things:
    const sections = $('section');
    sections.each((index: number, section: any) => {
      const sectionTitle = $(section).find('.section-title').text().trim();
      
      if (sectionTitle === 'Most Recent Popular') {
        $(section).find('.comic .item').each((i, el) => {
          const title = $(el).find('.title').text().trim();
          const link = $(el).find('a.poster').attr('href');
          const rawImg = $(el).find('img').attr('src');
          const img = rawImg ? `/api/image?url=${encodeURIComponent(rawImg)}` : null;
          
          const metadataSpans = $(el).find('.metadata span');
          const chapter = metadataSpans.first().text().trim();
          
          // genres might be in the second span
          const genresText = metadataSpans.eq(1).text().trim();
          const genres = genresText ? genresText.split(',').map(g => g.trim()) : [];

          if (sfw && genres.some(g => NSFW_GENRES.includes(g))) return;

          const id = link ? link.split('/title/')[1] : null;
          
          if (title && id) {
             popular.push({ title, link, img, chapter, genres, id });
          }
        });
      }

      if (sectionTitle === 'Latest Updates') {
        $(section).find('.comic .item').each((i, el) => {
          const title = $(el).find('.title').text().trim();
          const link = $(el).find('a.poster').attr('href');
          const rawImg = $(el).find('img').attr('src');
          const img = rawImg ? `/api/image?url=${encodeURIComponent(rawImg)}` : null;
          
          const metadataSpans = $(el).find('.metadata span');
          const chapter = metadataSpans.first().text().trim();
          
          // genres might be in the second span
          const genresText = metadataSpans.eq(1).text().trim();
          const genres = genresText ? genresText.split(',').map(g => g.trim()) : [];

          if (sfw && genres.some(g => NSFW_GENRES.includes(g))) return;

          const id = link ? link.split('/title/')[1] : null;
          
          if (title && id) {
             latest.push({ title, link, img, chapter, genres, id });
          }
        });
      }
    });

    return Response.json({ popular, latest });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
