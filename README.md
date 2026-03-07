# Comix API

Welcome to the Comix API. This is a Next.js based REST API that acts as a wrapper and proxy for the comix.to manga platform.

Whether you're building a manga reader app, a Discord bot, or a personal reading dashboard, this API gives you structured JSON data for searching, browsing, and reading manga, bypassing CORS restrictions.

---

## Features

- **Bypass CORS & CORP**: All manga pages and cover images are automatically proxied through the API so you can render them directly in `<img>` tags without strict browser blocks.
- **SFW Content Filter**: Filter out mature/NSFW content (Hentai, Erotica, Smut) with a single query parameter (`?sfw=true`).
- **Complete Feature Parity**: Native support for all advanced filtering, searching, and sorting options found on the main source.

---

## Quick Start

Assuming you are running the API locally at `http://localhost:3000`.

**Fetch the most popular manga right now:**
**Fetch the most popular manga right now:**
```bash
curl "http://localhost:3000/api/manga/home"
```

**Search for a specific manga (e.g., "Solo Leveling"):**
**Search for a specific manga (e.g., "Solo Leveling"):**
```bash
curl "http://localhost:3000/api/manga/search?q=solo"
```

---

## SFW / Content Filtering

The comix.to platform includes both safe and mature content. By default, this API returns All Content.

If you are building an app where you want to hide NSFW results, append `&sfw=true` to any listing endpoint.

**Example: Search safe content only**
```bash
curl "http://localhost:3000/api/manga/search?q=elf&sfw=true"
```
*Supported on: `/home`, `/search`, `/filter`, and `/browse`.*

---

## API Endpoints Reference

### 1. Home (`/api/manga/home`)
Fetches the "Most Recent Popular" and "Latest Updates" from the homepage.
- **Method:** `GET`
- **Parameters:**
  - `sfw` *(boolean, optional)*: Set to `true` to filter out NSFW content.
- **Example Request:** `GET /api/manga/home?sfw=true`
- **Example Response:**
  ```json
  {
    "popular": [
      {
        "title": "The Chick-Class Hunter is Filial!",
        "cover": "/api/image?url=https://...",
        "chapter": "Ch.58",
        "genres": ["2 days ago"],
        "id": "n8we-the-chick-class-hunter-is-filial"
      }
    ],
    "latest": [ ... ]
  }
  ```

### 2. Search (`/api/manga/search`)
Searches for mangas based on a keyword. You can also pass advanced filters.
- **Method:** `GET`
- **Parameters:**
  - `q` *(string, required)*: The search query.
  - `sfw` *(boolean, optional)*: Filter out NSFW content.
  - `types[]`, `status`, `genres[]`, `page`, `limit` *(optional)*: Advanced filters.
- **Example Request:** `GET /api/manga/search?q=demon&types[]=manhwa&status=releasing`
- **Example Response:**
  ```json
  {
    "results": [
      {
        "id": "abc-demon-slayer",
        "title": "Demon Slayer",
        "img": "/api/image?url=...",
        "status": 1,
        "score": 9.5,
        "type": "manga"
      }
    ],
    "pagination": { "current_page": 1, "last_page": 5 }
  }
  ```

### 3. Comic Details (`/api/manga/:id`)
Gets the full descriptive metadata for a specific manga.
- **Method:** `GET`
- **Path Parameter:**
  - `id` *(string, required)*: The manga ID slug (e.g., `n8we-the-chick-class-hunter`).
- **Parameters:**
  - `sfw` *(boolean, optional)*: Set to `true` to return 404 if the comic contains NSFW content.
- **Example Request:** `GET /api/manga/n8we-the-chick-class-hunter?sfw=true`
- **Example Response:**
  ```json
  {
    "comic": {
      "id": "n8we-the-chick-class-hunter",
      "title": "The Chick-Class Hunter",
      "cover": "/api/image?url=...",
      "demographics": "Shounen",
      "authors": "John Doe",
      "artists": "Jane Smith",
      "synopsis": "A great story...",
      "genres": ["Action", "Fantasy"],
      "scanlation_groups": [
        { "scanlation_group_id": 123, "name": "ScanGroup" }
      ]
    }
  }
  ```

### 4. Paginated Chapters (`/api/manga/:id/chapters`)
Fetches the paginated list of chapters for a specific comic, including the scanlation group assigned to each chapter.
- **Method:** `GET`
- **Path Parameter:**
  - `id` *(string, required)*: The manga ID slug.
- **Parameters:**
  - `page`, `limit`, `scanlation_group_id` *(optional)*: Advanced filter options matching comix paginated chapters.
- **Example Request:** `GET /api/manga/n8we-the-chick-class-hunter/chapters?page=1&limit=30`

### 5. Read Chapter Images (`/api/manga/read`)
Fetches the actual CDN comic pages/images to render a chapter. All image URLs returned here are already wrapped in the local proxy, meaning you can plug them directly into `<img src="...">` safely.
- **Method:** `GET`
- **Parameters:**
  - `chapterId` *(string, required)*: The specific ID of the chapter.
- **Example Request:** `GET /api/manga/read?chapterId=8295088`
- **Example Response:**
  ```json
  {
    "chapterId": "8295088",
    "total_images": 20,
    "images": [
      {
        "url": "/api/image?url=https://cdn...",
        "width": 800,
        "height": 1200
      }
    ]
  }
  ```

### 6. Filter & Browse (`/api/manga/filter` & `/api/manga/browse`)
Used for querying the database without a specific search term. 
- `/api/manga/browse` sorts by `newest` by default.
- `/api/manga/filter` requires specific filters like `?genres=action,adventure`.
- Both support the `?sfw=true` parameter.

---

## The Image Proxy System

You might notice that all images returned by this API start with `/api/image?url=...` instead of the direct `https://static.comix.to/...` url.

Browsers block images loaded from external CDNs if they contain `Cross-Origin-Resource-Policy` or strict `Referer` checks. If you tried to load their images directly on your website, they would return `403 Forbidden`.

To fix this, this API includes an internal image proxy (`src/app/api/image/route.ts`). It fetches the image serverside and pipes it directly to your frontend with permissive CORS headers. You do not need to do anything, it simply works out of the box.
