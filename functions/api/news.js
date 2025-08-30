// functions/api/news.js
export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const tag = url.searchParams.get('tag') || 'top';
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
      const pageSize = clamp(parseInt(url.searchParams.get('pageSize') || '20'), 1, 50);
      const forceRefresh = url.searchParams.has('refresh');
      const ttl = forceRefresh ? 60 : 300;

      const sources = csv(env.NEWS_SOURCES || 'bbc-news,cnn,reuters,the-verge,techcrunch');
      const key = kvKey(tag, page, sources);

      if (!forceRefresh && env.NEWS_CACHE) {
        const cached = await env.NEWS_CACHE.get(key, { type: 'json' });
        if (cached) return json(cached, 200, ttl);
      }

      const apiUrl = new URL('https://newsapi.org/v2/top-headlines');
      apiUrl.searchParams.set('sources', sources.join(','));
      apiUrl.searchParams.set('pageSize', String(pageSize));
      apiUrl.searchParams.set('page', String(page));
      if (tag && tag.toLowerCase() !== 'top') apiUrl.searchParams.set('q', tag);

      const res = await fetch(apiUrl.toString(), {
        headers: { 'X-Api-Key': env.NEWSAPI_KEY },
        cf: { cacheTtl: 0, cacheEverything: false },
      });

      // Debug 输出请求信息
      if (!res.ok) {
        const text = await res.text();
        return new Response(
          JSON.stringify({
            error: "Upstream fetch failed",
            status: res.status,
            url: apiUrl.toString(),
            details: text.slice(0, 500) // 截取部分内容
          }, null, 2),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }

      let data;
      try {
        data = await res.json();
      } catch (e) {
        const text = await res.text();
        return new Response(
          JSON.stringify({
            error: "JSON parse failed",
            url: apiUrl.toString(),
            message: e.message,
            responseSnippet: text.slice(0, 500)
          }, null, 2),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      const minW = +env.MIN_IMAGE_WIDTH || 200;
      const normalized = {
        status: 'ok',
        totalResults: data.totalResults || 0,
        articles: (data.articles || []).map((a) => simplifyArticle(a, minW)),
        tag: tag || 'top',
        page,
        pageSize,
        fetchedAt: new Date().toISOString(),
      };

      if (env.NEWS_CACHE) {
        await env.NEWS_CACHE.put(key, JSON.stringify(normalized), { expirationTtl: ttl });
      }

      return json(normalized, 200, ttl);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Worker exception",
          message: error.message,
          stack: error.stack
        }, null, 2),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
};


function simplifyArticle(a, minW) {
  const img = a?.urlToImage || '';
  return {
    title: a?.title || '',
    description: a?.description || '',
    url: a?.url || '#',
    urlToImage: img,
    source: a?.source?.name || '',
    publishedAt: a?.publishedAt || '',
  };
}

function csv(v) {
  return (v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function clamp(n, min, max) { 
  return Math.max(min, Math.min(max, n)); 
}

function kvKey(tag, page, sources) { 
  return `v1:news:${tag}:p${page}:src:${hash(sources.join(','))}`; 
}

function hash(s) { 
  let h = 2166136261; 
  for (let i = 0; i < s.length; i++) { 
    h ^= s.charCodeAt(i); 
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24); 
  } 
  return (h >>> 0).toString(36); 
}

function corsHeaders() { 
  return { 
    'Access-Control-Allow-Origin': '*', 
    'Access-Control-Allow-Methods': 'GET,OPTIONS', 
    'Access-Control-Allow-Headers': 'Content-Type' 
  }; 
}

function json(obj, status = 200, ttl = 300) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders(),
      'Cache-Control': `public, s-maxage=${ttl}, stale-while-revalidate=86400`,
    },
  });
}



