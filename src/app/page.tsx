'use client';

import { useState, useCallback, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Parameter {
  name: string;
  in: 'query' | 'path';
  type: string;
  required: boolean;
  description: string;
  example?: string;
}

interface Endpoint {
  id: string;
  method: 'GET';
  path: string;
  summary: string;
  description: string;
  parameters: Parameter[];
  example: {
    request: string;
    response: string;
  };
  liveUrl?: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const endpoints: Endpoint[] = [
  {
    id: 'home',
    method: 'GET',
    path: '/api/manga/home',
    summary: 'Homepage Feed',
    description: 'Returns four curated lists from the Comix.to homepage: the most recently popular titles, latest chapter updates, recently added series, and completed series. Great for building a landing feed.',
    parameters: [
      {
        name: 'sfw',
        in: 'query',
        type: 'boolean',
        required: false,
        description: 'Set to true to strip out any NSFW-tagged titles (Hentai, Erotica, Smut) from the response.',
        example: 'true',
      },
    ],
    example: {
      request: 'GET /api/manga/home?sfw=true',
      response: `{
  "popular": [
    {
      "id": "n8we-the-chick-class-hunter-is-filial",
      "title": "The Chick-Class Hunter is Filial!",
      "cover": "/api/image?url=https://static.comix.to/...",
      "chapter": "Ch.58",
      "genres": ["Action", "Fantasy"],
      "updatedAt": "2 days ago"
    }
  ],
  "latest": [ ... ],
  "recentlyAdded": [ ... ],
  "completed": [ ... ]
}`,
    },
    liveUrl: '/api/manga/home',
  },
  {
    id: 'search',
    method: 'GET',
    path: '/api/manga/search',
    summary: 'Search Manga',
    description: 'Full-text search against the Comix.to database. Because the internal API is proxied directly, all advanced filters (genres, types, status, content_rating) work natively — just pass them as query parameters.',
    parameters: [
      { name: 'q', in: 'query', type: 'string', required: true, description: 'The search keyword.', example: 'solo leveling' },
      { name: 'sfw', in: 'query', type: 'boolean', required: false, description: 'Filter out NSFW content.', example: 'true' },
      { name: 'types[]', in: 'query', type: 'string[]', required: false, description: 'Filter by type(s). Values: manga, manhwa, manhua, webtoon.', example: 'manhwa' },
      { name: 'status', in: 'query', type: 'string', required: false, description: 'Filter by publication status. Values: releasing, completed, hiatus.', example: 'releasing' },
      { name: 'genres[]', in: 'query', type: 'string[]', required: false, description: 'Filter by genre slugs.', example: 'action' },
      { name: 'content_rating[]', in: 'query', type: 'string[]', required: false, description: 'Filter by content rating(s). Values: safe, suggestive, erotica, pornographic.', example: 'safe' },
      { name: 'page', in: 'query', type: 'number', required: false, description: 'Page number for pagination.', example: '1' },
      { name: 'limit', in: 'query', type: 'number', required: false, description: 'Number of results per page (default 20).', example: '20' },
    ],
    example: {
      request: 'GET /api/manga/search?q=demon&types[]=manhwa&status=releasing',
      response: `{
  "results": [
    {
      "id": "abc-demon-slayer",
      "slug": "demon-slayer",
      "title": "Demon Slayer",
      "alt_titles": ["Kimetsu no Yaiba"],
      "img": "/api/image?url=...",
      "chapter": "Ch.205",
      "genres": ["Action", "Supernatural"],
      "synopsis": "Tanjiro Kamado sets out on a journey...",
      "status": 2,
      "score": 9.5,
      "year": 2016,
      "type": "manga"
    }
  ],
  "pagination": {
    "current_page": 1,
    "last_page": 3,
    "per_page": 20,
    "total": 58
  }
}`,
    },
    liveUrl: '/api/manga/search?q=solo',
  },
  {
    id: 'details',
    method: 'GET',
    path: '/api/manga/:id',
    summary: 'Comic Details',
    description: 'Retrieves full metadata for a single comic: synopsis, status, genres, themes, authors, artists, scanlation groups, chapter counts, and proxied cover art.',
    parameters: [
      { name: 'id', in: 'path', type: 'string', required: true, description: 'The manga ID slug (hash + slug, e.g. n8we-the-chick-class-hunter-is-filial). Obtained from any listing endpoint.', example: 'n8we-the-chick-class-hunter-is-filial' },
      { name: 'sfw', in: 'query', type: 'boolean', required: false, description: 'If true, returns 404 for NSFW comics rather than their data.', example: 'true' },
    ],
    example: {
      request: 'GET /api/manga/n8we-the-chick-class-hunter-is-filial',
      response: `{
  "comic": {
    "id": "n8we-the-chick-class-hunter-is-filial",
    "slug": "the-chick-class-hunter-is-filial",
    "title": "The Chick-Class Hunter is Filial!",
    "altTitles": ["최하위 헌터는 효자"],
    "cover": "/api/image?url=https://static.comix.to/...",
    "score": 9.2,
    "scoreUsers": 3840,
    "followed": "12,400 users",
    "type": "Manhwa",
    "demographics": "Shounen",
    "authors": "Lee Hyun-Suk",
    "artists": "Park Jun-Ho",
    "genres": ["Action", "Fantasy", "Adventure"],
    "themes": ["Regression", "Gate"],
    "originalLanguage": "Korean",
    "status": 1,
    "synopsis": "A weak, bottom-ranked hunter...",
    "latest_chapter": 58,
    "year": 2023,
    "first_chapter_id": "9777916",
    "latest_chapter_id": "9926639",
    "scanlation_groups": [
      { "scanlation_group_id": 42, "name": "OmegaScans" }
    ]
  }
}`,
    },
    liveUrl: '/api/manga/n8we-the-chick-class-hunter-is-filial',
  },
  {
    id: 'chapters',
    method: 'GET',
    path: '/api/manga/:id/chapters',
    summary: 'Chapter List',
    description: 'Returns the paginated chapter list for a comic, including chapter numbers, upload dates, and which scanlation group released each chapter.',
    parameters: [
      { name: 'id', in: 'path', type: 'string', required: true, description: 'The manga ID slug.', example: 'n8we-the-chick-class-hunter-is-filial' },
      { name: 'page', in: 'query', type: 'number', required: false, description: 'Page number.', example: '1' },
      { name: 'limit', in: 'query', type: 'number', required: false, description: 'Chapters per page.', example: '30' },
      { name: 'scanlation_group_id', in: 'query', type: 'number', required: false, description: 'Filter chapters by a specific scanlation group ID.', example: '42' },
    ],
    example: {
      request: 'GET /api/manga/n8we-the-chick-class-hunter-is-filial/chapters?page=1&limit=30',
      response: `{
  "result": {
    "items": [
      {
        "chapter_id": 9926639,
        "chapter": "58",
        "title": null,
        "uploaded_at": "2024-01-15T08:00:00.000Z",
        "scanlation_group": { "id": 42, "name": "OmegaScans" }
      }
    ],
    "pagination": {
      "current_page": 1,
      "last_page": 2,
      "per_page": 30,
      "total": 58
    }
  }
}`,
    },
  },
  {
    id: 'read',
    method: 'GET',
    path: '/api/manga/read',
    summary: 'Read Chapter Images',
    description: 'Returns all image URLs for a specific chapter, already signed and decrypted dynamically using our mock-browser VM sandboxing. Features support for scrambled canvases.',
    parameters: [
      { name: 'chapterId', in: 'query', type: 'string', required: true, description: 'The numeric chapter ID obtained from the chapter list endpoint.', example: '8295088' },
    ],
    example: {
      request: 'GET /api/manga/read?chapterId=8295088',
      response: `{
  "chapterId": 8295088,
  "total_images": 20,
  "images": [
    {
      "url": "https://80pd.wowpic5.store/si/bEqPbYfoKT0Gm13lG1KfhBJcwrEZa/01.webp",
      "width": 800,
      "height": 7500,
      "scramble": false
    },
    {
      "url": "https://80pd.wowpic5.store/si/bEqPbYfoKT0Gm13lG1KfhBJcwrEZa/03.webp",
      "width": 800,
      "height": 7500,
      "scramble": true
    },
    ...
  ]
}`,
    },
    liveUrl: '/api/manga/read?chapterId=8295088',
  },
  {
    id: 'collections',
    method: 'GET',
    path: '/api/manga/collections/:id',
    summary: 'Manga Collections',
    description: 'Fetches metadata and all manga items from a specific public user collection. Great for displaying custom theme lists.',
    parameters: [
      { name: 'id', in: 'path', type: 'string', required: true, description: 'The numeric collection ID (e.g. 1692).', example: '1692' },
    ],
    example: {
      request: 'GET /api/manga/collections/1692',
      response: `{
  "collection": {
    "id": 1692,
    "name": "Ongoing - Historical / Fantasy Romance",
    "description": "Ongoing Series",
    "itemCount": 78,
    "likeCount": 3,
    "cover": {
      "id": 51373,
      "hid": "55kym",
      "title": "The Reason Why That Villainess Picked Up A Sword",
      "poster": {
        "medium": "https://static.comix.to/77c6/i/d/c7/68df00e6a9ca2@280.jpg",
        "large": "https://static.comix.to/77c6/i/d/c7/68df00e6a9ca2.jpg"
      },
      "url": "/title/55kym-the-reason-why-that-villainess-picked-up-a-sword"
    },
    "createdAtFormatted": "2w ago",
    "updatedAtFormatted": "38m ago"
  },
  "results": [
    {
      "id": "55kym-the-reason-why-that-villainess-picked-up-a-sword",
      "slug": "the-reason-why-that-villainess-picked-up-a-sword",
      "title": "The Reason Why That Villainess Picked Up A Sword",
      "alt_titles": [
        "Geu Angnyeo ga Geom eun Deun Yuyu",
        "그 악녀가 검을 든 이유",
        ...
      ],
      "link": "/title/55kym-the-reason-why-that-villainess-picked-up-a-sword",
      "img": "https://static.comix.to/77c6/i/d/c7/68df00e6a9ca2.jpg",
      "chapter": "Ch.60",
      "genres": [],
      "synopsis": "Erin suffered her entire life...",
      "status": "releasing",
      "score": 7.2,
      "year": 2025,
      "type": "manhwa"
    }
  ]
}`,
    },
    liveUrl: '/api/manga/collections/1692',
  },
  {
    id: 'browse',
    method: 'GET',
    path: '/api/manga/browse',
    summary: 'Browse All Manga',
    description: 'Browse the entire catalogue without a search term. Defaults to newest-first ordering. All sort and filter parameters are forwarded to the upstream API.',
    parameters: [
      { name: 'sort', in: 'query', type: 'string', required: false, description: 'Sort order. Values: newest (default), top, updated.', example: 'newest' },
      { name: 'sfw', in: 'query', type: 'boolean', required: false, description: 'Filter out NSFW content.', example: 'true' },
      { name: 'content_rating[]', in: 'query', type: 'string[]', required: false, description: 'Filter by content rating(s). Values: safe, suggestive, erotica, pornographic.', example: 'safe' },
      { name: 'page', in: 'query', type: 'number', required: false, description: 'Page number.', example: '1' },
      { name: 'limit', in: 'query', type: 'number', required: false, description: 'Results per page.', example: '20' },
    ],
    example: {
      request: 'GET /api/manga/browse?sort=top&sfw=true&page=1',
      response: `{
  "results": [ ... ],
  "pagination": {
    "current_page": 1,
    "last_page": 500,
    "per_page": 20,
    "total": 10000
  }
}`,
    },
    liveUrl: '/api/manga/browse?sort=newest',
  },
  {
    id: 'filter',
    method: 'GET',
    path: '/api/manga/filter',
    summary: 'Filter Manga',
    description: 'Query the catalogue with specific genre or attribute filters, without needing a keyword. Perfect for genre browsing screens.',
    parameters: [
      { name: 'genres', in: 'query', type: 'string', required: false, description: 'Comma-separated list of genre slugs to filter by.', example: 'action,adventure' },
      { name: 'sfw', in: 'query', type: 'boolean', required: false, description: 'Filter out NSFW content.', example: 'true' },
      { name: 'content_rating[]', in: 'query', type: 'string[]', required: false, description: 'Filter by content rating(s). Values: safe, suggestive, erotica, pornographic.', example: 'safe' },
      { name: 'page', in: 'query', type: 'number', required: false, description: 'Page number.', example: '1' },
      { name: 'limit', in: 'query', type: 'number', required: false, description: 'Results per page.', example: '20' },
    ],
    example: {
      request: 'GET /api/manga/filter?genres=action,fantasy&sfw=true',
      response: `{
  "results": [ ... ],
  "pagination": {
    "current_page": 1,
    "last_page": 120
  }
}`,
    },
    liveUrl: '/api/manga/filter?genres=action',
  },
  {
    id: 'image',
    method: 'GET',
    path: '/api/image',
    summary: 'Image Proxy',
    description: "Fetches an external image server-side and re-serves it with permissive CORS headers. This solves the 403 Forbidden errors caused by Comix.to's Cross-Origin-Resource-Policy headers. All image URLs returned by this API already route through this endpoint automatically — you don't need to call it manually.",
    parameters: [
      { name: 'url', in: 'query', type: 'string (URL)', required: true, description: 'The fully-qualified CDN image URL to proxy.', example: 'https://static.comix.to/covers/...' },
    ],
    example: {
      request: 'GET /api/image?url=https://static.comix.to/covers/example.jpg',
      response: '-> Binary image data streamed with:\n  Content-Type: image/jpeg\n  Cache-Control: public, max-age=86400\n  Access-Control-Allow-Origin: *\n  Cross-Origin-Resource-Policy: cross-origin',
    },
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={copy}
      title="Copy to clipboard"
      style={{
        background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${copied ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.1)'}`,
        color: copied ? '#4ade80' : '#6b7280',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '0.7rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontFamily: 'inherit',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function MethodBadge({ method }: { method: string }) {
  return (
    <span style={{
      background: '#1d4ed8',
      color: '#fff',
      padding: '3px 10px',
      borderRadius: '5px',
      fontSize: '0.72rem',
      fontWeight: '700',
      letterSpacing: '0.08em',
      flexShrink: 0,
    }}>
      {method}
    </span>
  );
}

function ParamRow({ param }: { param: Parameter }) {
  return (
    <tr style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
        <code style={{
          color: '#f472b6',
          background: 'rgba(244,114,182,0.08)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '0.82rem',
          fontFamily: 'var(--font-geist-mono, monospace)',
        }}>
          {param.name}
        </code>
      </td>
      <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
        <span style={{
          color: '#a78bfa',
          fontSize: '0.78rem',
          fontFamily: 'var(--font-geist-mono, monospace)',
          background: 'rgba(167,139,250,0.08)',
          padding: '2px 6px',
          borderRadius: '4px',
        }}>
          {param.type}
        </span>
      </td>
      <td style={{ padding: '10px 14px', verticalAlign: 'top' }}>
        <span style={{
          display: 'inline-block',
          padding: '2px 7px',
          borderRadius: '4px',
          fontSize: '0.72rem',
          fontWeight: '600',
          letterSpacing: '0.04em',
          background: param.required ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.12)',
          color: param.required ? '#f87171' : '#6b7280',
          border: `1px solid ${param.required ? 'rgba(239,68,68,0.2)' : 'rgba(107,114,128,0.2)'}`,
        }}>
          {param.required ? 'required' : 'optional'}
        </span>
      </td>
      <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: '0.85rem', verticalAlign: 'top' }}>
        {param.description}
        {param.example && (
          <span style={{ marginLeft: '6px', color: '#6b7280', fontStyle: 'italic' }}>
            e.g.{' '}
            <code style={{
              fontFamily: 'var(--font-geist-mono, monospace)',
              color: '#60a5fa',
              fontSize: '0.8rem',
            }}>
              {param.example}
            </code>
          </span>
        )}
      </td>
    </tr>
  );
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [tab, setTab] = useState<'params' | 'example'>('params');

  return (
    <div
      id={`endpoint-${endpoint.id}`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '12px',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(96,165,250,0.2)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
      }}
    >
      {/* Card header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <MethodBadge method={endpoint.method} />
            <code style={{
              color: '#e2e8f0',
              fontFamily: 'var(--font-geist-mono, monospace)',
              fontSize: '0.92rem',
              fontWeight: '500',
            }}>
              {endpoint.path}
            </code>
          </div>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem', lineHeight: 1.65 }}>
            {endpoint.description}
          </p>
        </div>
        {endpoint.liveUrl && (
          <a
            href={endpoint.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 13px',
              background: 'rgba(96,165,250,0.08)',
              border: '1px solid rgba(96,165,250,0.2)',
              color: '#60a5fa',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '0.8rem',
              fontWeight: '500',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(96,165,250,0.15)';
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(96,165,250,0.4)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(96,165,250,0.08)';
              (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(96,165,250,0.2)';
            }}
          >
            Try it live
          </a>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {(['params', 'example'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '9px 18px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: '500',
              color: tab === t ? '#60a5fa' : '#6b7280',
              borderBottom: `2px solid ${tab === t ? '#3b82f6' : 'transparent'}`,
              transition: 'all 0.15s ease',
              fontFamily: 'inherit',
              letterSpacing: '0.03em',
            }}
          >
            {t === 'params' ? 'Parameters' : 'Example'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: tab === 'params' ? '0' : '20px 24px' }}>
        {tab === 'params' && (
          endpoint.parameters.length === 0 ? (
            <p style={{ padding: '20px 24px', color: '#4b5563', fontSize: '0.85rem', margin: 0 }}>
              This endpoint has no parameters.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                    {['Parameter', 'Type', 'Required', 'Description'].map(h => (
                      <th key={h} style={{
                        padding: '9px 14px',
                        textAlign: 'left',
                        color: '#4b5563',
                        fontWeight: '600',
                        fontSize: '0.7rem',
                        letterSpacing: '0.07em',
                        textTransform: 'uppercase',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {endpoint.parameters.map(p => <ParamRow key={p.name} param={p} />)}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'example' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Request */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#4b5563', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Request</span>
                <CopyButton text={endpoint.example.request} />
              </div>
              <pre style={{
                margin: 0,
                padding: '14px 16px',
                background: 'rgba(0,0,0,0.35)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.06)',
                fontSize: '0.82rem',
                color: '#86efac',
                fontFamily: 'var(--font-geist-mono, monospace)',
                overflowX: 'auto',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
                {endpoint.example.request}
              </pre>
            </div>
            {/* Response */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: '#4b5563', fontSize: '0.7rem', fontWeight: '600', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Response</span>
                <CopyButton text={endpoint.example.response} />
              </div>
              <pre style={{
                margin: 0,
                padding: '14px 16px',
                background: 'rgba(0,0,0,0.35)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.06)',
                fontSize: '0.82rem',
                color: '#e2e8f0',
                fontFamily: 'var(--font-geist-mono, monospace)',
                overflowX: 'auto',
                lineHeight: 1.7,
                maxHeight: '320px',
                overflow: 'auto',
              }}>
                {endpoint.example.response}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Live Tester ──────────────────────────────────────────────────────────────

function LiveTester() {
  const [selectedId, setSelectedId] = useState<string>(endpoints[0].id);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selected = endpoints.find(e => e.id === selectedId) || endpoints[0];

  async function run() {
    if (!selected.liveUrl) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setResult(null);
    setStatus(null);
    setElapsed(null);
    const t0 = Date.now();
    try {
      const res = await fetch(selected.liveUrl, { signal: abortRef.current.signal });
      const ms = Date.now() - t0;
      setStatus(res.status);
      setElapsed(ms);
      const text = await res.text();
      try {
        setResult(JSON.stringify(JSON.parse(text), null, 2));
      } catch {
        setResult(text);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setStatus(0);
        setResult(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  const hasLive = !!selected.liveUrl;
  const statusColor = status === null ? '#4b5563' : status >= 200 && status < 300 ? '#22c55e' : '#ef4444';

  return (
    <div style={{
      position: 'sticky',
      top: '24px',
      width: '340px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '0',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '12px',
      overflow: 'hidden',
      background: '#0d1117',
      alignSelf: 'flex-start',
      maxHeight: 'calc(100vh - 48px)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#4b5563', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Live Tester</span>
        <span style={{
          fontSize: '0.65rem',
          padding: '2px 8px',
          borderRadius: '4px',
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.15)',
          color: '#22c55e',
          fontWeight: '600',
          letterSpacing: '0.06em',
        }}>LIVE</span>
      </div>

      {/* Endpoint picker */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '0.68rem', color: '#374151', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Endpoint</div>
        <select
          value={selectedId}
          onChange={e => { setSelectedId(e.target.value); setResult(null); setStatus(null); setElapsed(null); }}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '7px',
            color: '#d1d5db',
            padding: '7px 10px',
            fontSize: '0.8rem',
            cursor: 'pointer',
            outline: 'none',
            appearance: 'none',
          }}
        >
          {endpoints.map(ep => (
            <option key={ep.id} value={ep.id} style={{ background: '#0d1117' }}>
              {ep.summary}
            </option>
          ))}
        </select>
      </div>

      {/* URL preview */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: '0.68rem', color: '#374151', marginBottom: '5px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em' }}>URL</div>
        <code style={{
          fontSize: '0.75rem',
          color: selected.liveUrl ? '#60a5fa' : '#4b5563',
          fontFamily: 'var(--font-geist-mono, monospace)',
          wordBreak: 'break-all',
          lineHeight: 1.5,
        }}>
          {selected.liveUrl || 'No live URL — requires path parameter'}
        </code>
      </div>

      {/* Send button */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          onClick={run}
          disabled={loading || !hasLive}
          style={{
            width: '100%',
            padding: '9px 0',
            borderRadius: '7px',
            border: '1px solid rgba(59,130,246,0.25)',
            background: loading ? 'rgba(59,130,246,0.05)' : 'rgba(59,130,246,0.1)',
            color: hasLive ? '#60a5fa' : '#374151',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: hasLive && !loading ? 'pointer' : 'not-allowed',
            letterSpacing: '0.04em',
            transition: 'all 0.15s ease',
            fontFamily: 'inherit',
          }}
        >
          {loading ? 'Sending...' : 'Send Request'}
        </button>
      </div>

      {/* Status bar */}
      {status !== null && (
        <div style={{
          padding: '8px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          fontSize: '0.73rem',
        }}>
          <span style={{ color: '#4b5563' }}>Status</span>
          <span style={{ color: statusColor, fontWeight: '700', fontFamily: 'monospace' }}>{status}</span>
          {elapsed !== null && (
            <>
              <span style={{ color: '#1f2937' }}>·</span>
              <span style={{ color: '#374151' }}>{elapsed}ms</span>
            </>
          )}
        </div>
      )}

      {/* Response */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '10px 16px 6px', fontSize: '0.68rem', color: '#374151', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Response</div>
        <pre style={{
          margin: 0,
          padding: '0 16px 16px',
          fontSize: '0.73rem',
          color: result ? '#e2e8f0' : '#1f2937',
          fontFamily: 'var(--font-geist-mono, monospace)',
          overflowY: 'auto',
          overflowX: 'auto',
          flex: 1,
          lineHeight: 1.65,
          maxHeight: '380px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}>
          {loading ? 'Waiting for response...' : result ?? 'Hit Send Request to see a live response from the API.'}
        </pre>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b0f19',
      color: '#e2e8f0',
      fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
    }}>
      {/* Sidebar nav */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '220px',
        background: '#0d1117',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        padding: '32px 0',
        zIndex: 50,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '0 20px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{
            fontSize: '1.05rem',
            fontWeight: '700',
            color: '#60a5fa',
            marginBottom: '4px',
          }}>
            Comix API
          </div>
          <div style={{ fontSize: '0.72rem', color: '#374151', letterSpacing: '0.05em' }}>v1.0 · Unofficial</div>
        </div>

        <div style={{ padding: '20px 12px 0 12px', flex: 1 }}>
          <div style={{ fontSize: '0.65rem', color: '#374151', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 8px', marginBottom: '8px', fontWeight: '700' }}>
            Endpoints
          </div>
          {endpoints.map(ep => (
            <a
              key={ep.id}
              href={`#endpoint-${ep.id}`}
              onClick={() => setActiveSection(ep.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 10px',
                borderRadius: '6px',
                textDecoration: 'none',
                color: activeSection === ep.id ? '#60a5fa' : '#6b7280',
                background: activeSection === ep.id ? 'rgba(59,130,246,0.08)' : 'transparent',
                fontSize: '0.82rem',
                transition: 'all 0.15s ease',
                marginBottom: '2px',
              }}
              onMouseEnter={e => {
                if (activeSection !== ep.id) {
                  (e.currentTarget as HTMLAnchorElement).style.color = '#d1d5db';
                  (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.04)';
                }
              }}
              onMouseLeave={e => {
                if (activeSection !== ep.id) {
                  (e.currentTarget as HTMLAnchorElement).style.color = '#6b7280';
                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                }
              }}
            >
              <span style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: activeSection === ep.id ? '#3b82f6' : '#1f2937',
                flexShrink: 0,
                transition: 'background 0.15s ease',
              }} />
              {ep.summary}
            </a>
          ))}

          <div style={{ marginTop: '24px', fontSize: '0.65rem', color: '#374151', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 8px', marginBottom: '8px', fontWeight: '700' }}>
            Guides
          </div>
          {['Quick Start', 'SFW Filtering', 'Image Proxy'].map(g => (
            <a
              key={g}
              href={`#guide-${g.toLowerCase().replace(/\s/g, '-')}`}
              style={{
                display: 'block',
                padding: '7px 10px',
                borderRadius: '6px',
                textDecoration: 'none',
                color: '#6b7280',
                fontSize: '0.82rem',
                transition: 'all 0.15s ease',
                marginBottom: '2px',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.color = '#d1d5db';
                (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.color = '#6b7280';
                (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
              }}
            >
              {g}
            </a>
          ))}
        </div>
      </nav>

      {/* Main content wrapper */}
      <div style={{ marginLeft: '220px', display: 'flex', alignItems: 'flex-start', gap: '32px', padding: '48px 40px 48px 48px' }}>
      <main style={{ flex: 1, minWidth: 0 }}>

        {/* Hero */}
        <header style={{ marginBottom: '56px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.18)',
            borderRadius: '100px',
            fontSize: '0.72rem',
            color: '#60a5fa',
            fontWeight: '600',
            letterSpacing: '0.05em',
            marginBottom: '20px',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
            API v1 · Edge Runtime · CORS-enabled
          </div>

          <h1 style={{
            fontSize: '3rem',
            fontWeight: '800',
            margin: '0 0 16px 0',
            lineHeight: 1.1,
            color: '#f1f5f9',
          }}>
            Comix API<br />
            <span style={{ color: '#60a5fa' }}>
              Documentation
            </span>
          </h1>

          <p style={{ fontSize: '1.05rem', color: '#6b7280', margin: '0 0 28px 0', lineHeight: 1.7, maxWidth: '560px' }}>
            An unofficial Next.js edge API proxy for <strong style={{ color: '#9ca3af' }}>Comix.to</strong>. Get structured JSON for manga search, details, chapter listings, and reading — with automatic CORS bypass and SFW filtering.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {['Edge Runtime', 'CORS Bypass', 'SFW Filter', 'Image Proxy', 'Zero Config'].map(label => (
              <span key={label} style={{
                display: 'inline-block',
                padding: '5px 12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '6px',
                fontSize: '0.78rem',
                color: '#6b7280',
              }}>
                {label}
              </span>
            ))}
          </div>
        </header>

        {/* Disclaimer */}
        <div style={{
          padding: '14px 18px',
          background: 'rgba(234,179,8,0.05)',
          border: '1px solid rgba(234,179,8,0.18)',
          borderRadius: '10px',
          marginBottom: '48px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
        }}>
          <div>
            <div style={{ color: '#fbbf24', fontWeight: '600', fontSize: '0.83rem', marginBottom: '4px' }}>
              Disclaimer &amp; Permissions
            </div>
            <p style={{ margin: 0, color: '#78716c', fontSize: '0.82rem', lineHeight: 1.65 }}>
              This is an <strong style={{ color: '#92400e' }}>unofficial</strong> API proxy for educational and personal use only. We are not affiliated with Comix.to. If you intend to use their content in a public-facing project, please ensure you have the necessary permissions. Do not abuse their servers.
            </p>
          </div>
        </div>

        {/* Quick Start */}
        <section id="guide-quick-start" style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#f1f5f9', margin: '0 0 20px 0', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            Quick Start
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Fetch the most popular manga', cmd: 'curl "https://comix-api.vercel.app/api/manga/home"' },
              { label: 'Search for a title', cmd: 'curl "https://comix-api.vercel.app/api/manga/search?q=solo+leveling"' },
              { label: 'Get comic details', cmd: 'curl "https://comix-api.vercel.app/api/manga/n8we-the-chick-class-hunter-is-filial"' },
              { label: 'Read a chapter', cmd: 'curl "https://comix-api.vercel.app/api/manga/read?chapterId=8295088"' },
            ].map(item => (
              <div key={item.cmd} style={{
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{
                  padding: '7px 14px',
                  background: 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ color: '#4b5563', fontSize: '0.75rem' }}>{item.label}</span>
                  <CopyButton text={item.cmd} />
                </div>
                <pre style={{
                  margin: 0,
                  padding: '11px 14px',
                  background: 'rgba(0,0,0,0.3)',
                  fontSize: '0.8rem',
                  color: '#86efac',
                  fontFamily: 'var(--font-geist-mono, monospace)',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                }}>
                  {item.cmd}
                </pre>
              </div>
            ))}
          </div>
        </section>

        {/* SFW Filtering guide */}
        <section id="guide-sfw-filtering" style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#f1f5f9', margin: '0 0 12px 0', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            SFW / Content Filtering
          </h2>
          <p style={{ color: '#6b7280', lineHeight: 1.7, margin: '0 0 16px 0', fontSize: '0.88rem' }}>
            By default, all content is returned. Append <code style={{ color: '#f472b6', fontFamily: 'monospace', fontSize: '0.83rem' }}>?sfw=true</code> to any listing endpoint to automatically strip out NSFW-tagged titles (Hentai, Erotica, Smut). Supported on:{' '}
            {['/home', '/search', '/filter', '/browse'].map((r, i, arr) => (
              <span key={r}><code style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: '0.8rem' }}>{r}</code>{i < arr.length - 1 ? ', ' : ''}</span>
            ))}
            . On the <code style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: '0.8rem' }}>/:id</code> endpoint it returns a 404 instead of data.
          </p>
          <div style={{
            padding: '11px 14px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}>
            <code style={{ color: '#86efac', fontFamily: 'var(--font-geist-mono, monospace)', fontSize: '0.82rem' }}>
              GET /api/manga/search?q=elf&amp;sfw=true
            </code>
            <CopyButton text="GET /api/manga/search?q=elf&sfw=true" />
          </div>
        </section>

        {/* Image Proxy guide */}
        <section id="guide-image-proxy" style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#f1f5f9', margin: '0 0 12px 0', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            Image Proxy System
          </h2>
          <p style={{ color: '#6b7280', lineHeight: 1.7, margin: '0 0 12px 0', fontSize: '0.88rem' }}>
            All <code style={{ color: '#f472b6', fontFamily: 'monospace', fontSize: '0.83rem' }}>cover</code> and <code style={{ color: '#f472b6', fontFamily: 'monospace', fontSize: '0.83rem' }}>img</code> URLs in API responses are already routed through <code style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: '0.83rem' }}>/api/image?url=...</code>. You do not need to call it manually — just drop the URLs into <code style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: '0.83rem' }}>&lt;img src="..."&gt;</code> as-is.
          </p>
          <div style={{
            padding: '13px 16px',
            background: 'rgba(34,197,94,0.04)',
            border: '1px solid rgba(34,197,94,0.12)',
            borderRadius: '8px',
            color: '#6b7280',
            fontSize: '0.83rem',
            lineHeight: 1.7,
          }}>
            <strong style={{ color: '#4ade80' }}>Why is this needed?</strong> Browsers block images from external CDNs that set <code style={{ color: '#9ca3af', fontFamily: 'monospace' }}>Cross-Origin-Resource-Policy: same-origin</code>. The proxy fetches images server-side and re-serves them with <code style={{ color: '#9ca3af', fontFamily: 'monospace' }}>CORP: cross-origin</code> + a 24-hour cache.
          </div>
        </section>

        {/* Endpoints reference */}
        <section>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#f1f5f9', margin: '0 0 24px 0', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            API Reference
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {endpoints.map(ep => <EndpointCard key={ep.id} endpoint={ep} />)}
          </div>
        </section>

        {/* Footer */}
        <footer style={{
          marginTop: '80px',
          paddingTop: '24px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          color: '#374151',
          fontSize: '0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <span>Comix API — Unofficial · Not affiliated with Comix.to</span>
          <span>Built with Next.js · Edge Runtime</span>
        </footer>
      </main>

      {/* Right panel — Live Tester */}
      <div style={{ display: 'none' }} id="tester-mobile" />
      <aside style={{ paddingTop: '0px' }}>
        <LiveTester />
      </aside>
      </div>
    </div>
  );
}
