import { NextRequest, NextResponse } from 'next/server';
import { fetchDirect } from '@/lib/proxy';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const apiUrl = new URL('https://comix.to/api/v1/groups');
    
    // Forward query params
    for (const [key, value] of searchParams.entries()) {
      apiUrl.searchParams.set(key, value);
    }

    const res = await fetchDirect(apiUrl.toString(), { revalidate: 3600 });
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch scanlation groups' }, { status: res.status, headers: corsHeaders });
    }

    const data = await res.json();
    const items = data.result?.items || [];
    
    const results = items.map((item: any) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      chapter_count: item.chapterCount,
      manga_count: item.mangaCount,
      views_total: item.viewsTotal,
      avatar: item.avatar,
      created_at: item.createdAtFormatted,
      updated_at: item.updatedAtFormatted,
      link: `/groups/${item.id}`
    }));

    return NextResponse.json(
      { results, pagination: data.result?.pagination },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
