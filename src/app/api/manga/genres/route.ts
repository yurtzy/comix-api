import { NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function GET() {
  const genres = [
    { id: 6, label: "Action", slug: "action" },
    { id: 87264, label: "Adult", slug: "adult" },
    { id: 7, label: "Adventure", slug: "adventure" },
    { id: 8, label: "Boys Love", slug: "boys-love" },
    { id: 9, label: "Comedy", slug: "comedy" },
    { id: 10, label: "Crime", slug: "crime" },
    { id: 11, label: "Drama", slug: "drama" },
    { id: 87265, label: "Ecchi", slug: "ecchi" },
    { id: 12, label: "Fantasy", slug: "fantasy" },
    { id: 13, label: "Girls Love", slug: "girls-love" },
    { id: 40, label: "Harem", slug: "harem" },
    { id: 87266, label: "Hentai", slug: "hentai" },
    { id: 14, label: "Historical", slug: "historical" },
    { id: 15, label: "Horror", slug: "horror" },
    { id: 16, label: "Isekai", slug: "isekai" },
    { id: 17, label: "Magical Girls", slug: "magical-girls" },
    { id: 87267, label: "Mature", slug: "mature" },
    { id: 18, label: "Mecha", slug: "mecha" },
    { id: 19, label: "Medical", slug: "medical" },
    { id: 20, label: "Mystery", slug: "mystery" },
    { id: 21, label: "Philosophical", slug: "philosophical" },
    { id: 22, label: "Psychological", slug: "psychological" },
    { id: 23, label: "Romance", slug: "romance" },
    { id: 24, label: "Sci-Fi", slug: "sci-fi" },
    { id: 25, label: "Slice of Life", slug: "slice-of-life" },
    { id: 87268, label: "Smut", slug: "smut" },
    { id: 26, label: "Sports", slug: "sports" },
    { id: 27, label: "Superhero", slug: "superhero" },
    { id: 28, label: "Thriller", slug: "thriller" },
    { id: 29, label: "Tragedy", slug: "tragedy" },
    { id: 30, label: "Wuxia", slug: "wuxia" }
  ];

  const formats = [
    { id: 93164, label: "4-Koma", slug: "4-koma" },
    { id: 93167, label: "Adaptation", slug: "adaptation" },
    { id: 93165, label: "Anthology", slug: "anthology" },
    { id: 93168, label: "Award Winning", slug: "award-winning" },
    { id: 93166, label: "Doujinshi", slug: "doujinshi" },
    { id: 93172, label: "Full Color", slug: "full-color" },
    { id: 93170, label: "Long Strip", slug: "long-strip" },
    { id: 93169, label: "Oneshot", slug: "oneshot" },
    { id: 93171, label: "Web Comic", slug: "web-comic" }
  ];

  const demographics = [
    { id: 3, label: "Josei", slug: "josei" },
    { id: 4, label: "Seinen", slug: "seinen" },
    { id: 1, label: "Shoujo", slug: "shoujo" },
    { id: 2, label: "Shounen", slug: "shounen" }
  ];

  return NextResponse.json({ genres, formats, demographics }, { headers: corsHeaders });
}
