import * as cheerio from 'cheerio';

export const runtime = 'edge';

export async function GET() {
  try {
    const res = await fetch('https://comix.to/home', {
      next: { revalidate: 3600 }
    });
    
    if (!res.ok) {
      return Response.json({ error: 'Failed to fetch source' }, { status: res.status });
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const popular: any[] = [];
    const latest: any[] = [];

    // Parse "Most Recent Popular" section
    // Let's assume there's a `.comic .item`
    // We will extract a few things:
    const sections = $('section');
    sections.each((index, section) => {
      const sectionTitle = $(section).find('.section-title').text().trim();
      
      if (sectionTitle === 'Most Recent Popular') {
        $(section).find('.comic .item').each((i, el) => {
          const title = $(el).find('.title').text().trim();
          const link = $(el).find('a.poster').attr('href');
          const img = $(el).find('img').attr('src');
          const chapter = $(el).find('.metadata span:first-child').text().trim();
          const id = link ? link.split('/title/')[1] : null;
          
          if (title && id) {
             popular.push({ title, link, img, chapter, id });
          }
        });
      }

      if (sectionTitle === 'Latest Updates') {
        $(section).find('.comic .item').each((i, el) => {
          const title = $(el).find('.title').text().trim();
          const link = $(el).find('a.poster').attr('href');
          const img = $(el).find('img').attr('src');
          const chapter = $(el).find('.metadata span:first-child').text().trim();
          const id = link ? link.split('/title/')[1] : null;
          
          if (title && id) {
             latest.push({ title, link, img, chapter, id });
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
