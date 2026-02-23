import * as cheerio from 'cheerio';

async function fetchHome() {
  const res = await fetch('https://comix.to/home');
  const html = await res.text();
  const $ = cheerio.load(html);

  // Let's try to extract popular comics based on my earlier HTML observation:
  // There are sections with class "section-head" like "Most Recent Popular", "Most Follows New Comics"
  // Each comic seems to be inside something like `.comic .item` or similar.

  const popular: any[] = [];
  
  // Section 1: Most Recent Popular
  // Find the swiper wrapper next to the "Most Recent Popular" span.
  $('.item.swiper-slide').each((i, el) => {
    if (i > 2) return; // just get a few to see the structure
    const title = $(el).find('.title').text().trim();
    const link = $(el).find('a.poster').attr('href');
    const img = $(el).find('img').attr('src');
    const chapter = $(el).find('.metadata span:first-child').text().trim();
    const id = link ? link.split('/title/')[1] : null;

    popular.push({ title, link, img, chapter, id });
  });

  console.log("Popular:", JSON.stringify(popular, null, 2));
}

fetchHome().catch(console.error);
