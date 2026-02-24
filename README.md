# Comix API

A Next.js based API wrapper that proxies and standardizes responses from comix.to. All image URLs returned by the API are automatically prefixed with a local `/api/image` proxy route to bypass client-side CORS and CORP restrictions.

## Content Filtering
Collection endpoints like `home`, `search`, `filter`, and `browse` optionally accept an `sfw=true` query parameter.
When passed, the API mimics the website's default Content Preference behavior by filtering out comics tagged as `is_nsfw` or containing mature genres (Hentai, Erotica, Smut, Pornographic).

## Endpoints

### 1. `GET /api/manga/home`
Fetches the popular and latest updated mangas from the comix.to home page.
- **Query Parameters**:
  - `sfw` (optional): Set to `true` to filter out NSFW content.
- **Returns**: `{ popular: ComicItem[], latest: ComicItem[] }`
- **ComicItem**:
  ```typescript
  {
    title: string;
    link: string;
    img: string; // Proxied image URL
    chapter: string;
    genres: string[];
    id: string; // The manga ID, e.g. "hash-slug"
  }
  ```

### 2. `GET /api/manga/search`
Searches for mangas based on a keyword.
- **Query Parameters**:
  - `q` (required): The search keyword.
  - `sfw` (optional): Set to `true` to filter out NSFW content.
  - Optional pagination/filtering params identical to comix.to, such as `page`, `limit`.
- **Returns**: `{ results: SearchItem[], pagination: PaginationInfo }`
- **SearchItem**:
  ```typescript
  {
    id: string;
    slug: string;
    title: string;
    alt_titles: string[];
    link: string;
    img: string | null; // Proxied image URL
    chapter: string;
    genres: string[];
    synopsis: string;
    status: number;
    score: number;
    year: number;
    type: string;
  }
  ```

### 3. `GET /api/manga/:id`
Fetches detailed info about a specific comic.
- **Path Parameters**:
  - `id` (required): The manga ID (format: `hash-slug`).
- **Returns**: `{ comic: ComicDetail }`
- **ComicDetail**:
  ```typescript
  {
    id: string;
    slug: string;
    title: string;
    altTitles: string[];
    cover: string | null; // Proxied image URL
    format: string;
    status: number;
    author: string;
    artist: string;
    genres: string[];
    synopsis: string;
    latest_chapter: string;
    score: number;
    year: number;
  }
  ```

### 4. `GET /api/manga/read`
Fetches the images for a specific chapter viewing.
- **Query Parameters**:
  - `chapterId` (required): The ID of the chapter.
- **Returns**:
  ```typescript
  {
    chapterId: string;
    images: { url: string; width: number; height: number; }[]; // URLs are Proxied
    total_images: number;
  }
  ```

### 5. `GET /api/manga/filter`
Filters mangas based on genres and other parameters.
- **Query Parameters**:
  - `genres`: A comma separated list of genres, e.g., `action,adventure`.
  - `sfw` (optional): Set to `true` to filter out NSFW content.
  - `status`, `type`, `sort`, `page`, `limit`.
- **Returns**: Identical structure to `/api/manga/search` (`results`, `pagination`).

### 6. `GET /api/manga/browse`
Browses mangas. Automatically applies a `sort=newest` default if not provided.
- **Query Parameters**:
  - `sfw` (optional): Set to `true` to filter out NSFW content.
  - `sort`, `type`, `limit`, etc.
- **Returns**: Identical structure to `/api/manga/search` (`results`, `pagination`).

---

## Image Proxy
- `GET /api/image?url=<original_image_url>`
- Used internally by endpoints to bypass CORS returning images securely. You generally don't need to call this manually unless requested explicitly.
