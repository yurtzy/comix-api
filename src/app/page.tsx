export default function Home() {
  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: '900px', margin: '0 auto', padding: '3rem 2rem', lineHeight: '1.6', color: '#e5e7eb', backgroundColor: '#111827', minHeight: '100vh' }}>
      <header style={{ marginBottom: '3rem', borderBottom: '1px solid #374151', paddingBottom: '2rem' }}>
        <h1 style={{ fontSize: '3rem', margin: '0 0 0.5rem 0', color: '#60a5fa', fontWeight: 'bold' }}>Comix API</h1>
        <p style={{ fontSize: '1.25rem', margin: 0, color: '#9ca3af' }}>Lightning-fast Edge API proxy for Comix.to</p>
      </header>
      
      <div style={{ padding: '1.5rem', backgroundColor: 'rgba(234, 179, 8, 0.1)', borderLeft: '4px solid #eab308', borderRadius: '0 8px 8px 0', marginBottom: '2.5rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#facc15' }}>⚠️ Disclaimer & Permissions</h3>
        <p style={{ margin: 0, color: '#fef08a' }}>
          This is an unofficial API proxy designed for educational and personal use. We are not affiliated with Comix.to. If you intend to use their data, images, or sources in a public facing project, please ensure you feel you have the necessary permissions from them. Do not abuse their servers.
        </p>
      </div>

      <section style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '2rem', color: '#f3f4f6', marginBottom: '1.5rem' }}>How to know if it's working?</h2>
        <p style={{ color: '#d1d5db', fontSize: '1.1rem' }}>
          You can verify everything is working perfectly by clicking the live example links below. They will open directly in your browser and return the JSON data scraped by your new API!
        </p>
      </section>

      <div style={{ display: 'grid', gap: '2rem' }}>
        
        {/* Endpoint 1 */}
        <div style={{ backgroundColor: '#1f2937', padding: '1.5rem', borderRadius: '12px', border: '1px solid #374151' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ backgroundColor: '#3b82f6', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '0.875rem' }}>GET</span>
            /api/home
          </h3>
          <p style={{ color: '#9ca3af', marginBottom: '1rem', marginTop: 0 }}>Fetches the "Most Recent Popular" and "Latest Updates" from the homepage.</p>
          <a href="/api/home" target="_blank" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: '500' }}>→ Test /api/home</a>
        </div>

        {/* Endpoint 2 */}
        <div style={{ backgroundColor: '#1f2937', padding: '1.5rem', borderRadius: '12px', border: '1px solid #374151' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ backgroundColor: '#3b82f6', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '0.875rem' }}>GET</span>
            /api/search
          </h3>
          <p style={{ color: '#9ca3af', marginBottom: '1rem', marginTop: 0 }}>Searches the database. Because we proxy the internal API, all their source filters (genres, types, status) work automatically! Just pass them as query parameters.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <a href="/api/search?q=solo" target="_blank" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: '500' }}>→ Test Basic Search (?q=solo)</a>
            <a href="/api/search?q=solo&types[]=manhwa&status=releasing" target="_blank" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: '500' }}>→ Test Advanced Filters (Manhwa + Releasing)</a>
          </div>
        </div>

        {/* Endpoint 3 */}
        <div style={{ backgroundColor: '#1f2937', padding: '1.5rem', borderRadius: '12px', border: '1px solid #374151' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ backgroundColor: '#3b82f6', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '0.875rem' }}>GET</span>
            /api/comic
          </h3>
          <p style={{ color: '#9ca3af', marginBottom: '1rem', marginTop: 0 }}>Gets complete metadata for a specific comic, including synopsis, status, and authors.</p>
          <a href="/api/comic?id=n8we-the-chick-class-hunter-is-filial" target="_blank" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: '500' }}>→ Test Comic Details</a>
        </div>

        {/* Endpoint 4 */}
        <div style={{ backgroundColor: '#1f2937', padding: '1.5rem', borderRadius: '12px', border: '1px solid #374151' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ backgroundColor: '#3b82f6', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '0.875rem' }}>GET</span>
            /api/chapter
          </h3>
          <p style={{ color: '#9ca3af', marginBottom: '1rem', marginTop: 0 }}>Gets the paginated list of chapters for a comic.</p>
          <a href="/api/chapter?comicId=n8we-the-chick-class-hunter-is-filial" target="_blank" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: '500' }}>→ Test Chapter List</a>
        </div>

        {/* Endpoint 5 */}
        <div style={{ backgroundColor: '#1f2937', padding: '1.5rem', borderRadius: '12px', border: '1px solid #374151' }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ backgroundColor: '#3b82f6', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '0.875rem' }}>GET</span>
            /api/read
          </h3>
          <p style={{ color: '#9ca3af', marginBottom: '1rem', marginTop: 0 }}>Gets the original CDN image URLs for reading a specific chapter.</p>
          <a href="/api/read?chapterId=8295088" target="_blank" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: '500' }}>→ Test Chapter Images</a>
        </div>

      </div>
    </div>
  );
}
