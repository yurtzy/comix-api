# Comix API

A blazing-fast, serverless JSON API for proxying manga and comic data from Comix.to. Built with Next.js, optimized for Vercel, and engineered to reliably bypass strict Cloudflare Datacenter IP blocks using a custom Google Apps Script proxy.

## 🚀 Features

- **Blazing Fast:** Leverages Next.js serverless functions and aggressive CDN caching (`Next.js fetch cache` + Vercel Edge Network) for lightning-fast response times.
- **Direct JSON Proxy:** Instead of slow/brittle HTML scraping, this API directly consumes Comix.to's hidden internal v2 JSON APIs for superior performance and data consistency.
- **Cloudflare WAF Bypass:** Includes an ingenious architecture that routes Vercel requests through a Google Apps Script proxy. Because Google's ASNs have high trust scores, it completely bypasses Cloudflare's strict Datacenter IP bans and JavaScript challenges without requiring a paid residential proxy pool.

## 📡 API Endpoints

All endpoints are completely open and return structured JSON. 

### 1. Search / Discover Manga
`GET /api/search?q={keyword}`

Proxies the advanced search engine. Also supports all internal filtering parameters.

**Example Request:**
`/api/search?q=solo&limit=10&page=1`

### 2. Comic Details (Metadata)
`GET /api/comic?id={comicId}`

Returns rich metadata about a specific manga by ID.

**Example Request:**
`/api/comic?id=8259-solo-leveling`

### 3. Chapter List (Pagination)
`GET /api/chapter?comicId={comicId}`

Retrieves the paginated list of chapters for a given manga.

**Example Request:**
`/api/chapter?comicId=8259-solo-leveling&page=1`

### 4. Read Chapter (Images)
`GET /api/read?chapterId={chapterId}`

Fetches the actual image URLs, dimensions, and total page count for reading a specific chapter.

**Example Request:**
`/api/read?chapterId=8295088`

## 🛠️ Tech Stack & Architecture
- **Framework:** Next.js (App Router API Routes)
- **Deployment:** Vercel (AWS Serverless Node.js Environment)
- **Proxy Layer:** Google Apps Script (`UrlFetchApp`)

## 💡 How the Cloudflare Bypass Works (Developer Notes)
If deployed natively to Vercel, AWS, or DigitalOcean, Comix.to's Cloudflare "Bot Fight Mode" will instantly return a `403 Forbidden` or a JavaScript Challenge page, blocking your API.

To fix this, this repository proxies the requests through Google Apps Script:
1. `api/search` on Vercel sends a fetch request to a private `script.google.com` Web App URL.
2. The Google script (running on highly-trusted Google IPs) fetches the internal Comix.to API with standard browser headers.
3. Google returns the raw JSON to Vercel.
4. Vercel maps and caches the result for users!

## 📜 Disclaimer
This project is an unofficial proxy and is not affiliated with or endorsed by Comix.to. It was built for educational purposes to demonstrate modern API development, reverse engineering, and resilient proxying architectures.

---
*Developed by Yurtzy*
