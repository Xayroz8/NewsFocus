// functions/api/news.js
export default {
  async fetch(request, env, ctx) {
    try {
      // 解析请求参数
      const url = new URL(request.url);
      const tag = url.searchParams.get('tag') || 'top';
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
      const pageSize = clamp(parseInt(url.searchParams.get('pageSize') || '20'), 1, 50);
      const forceRefresh = url.searchParams.has('refresh');
      const ttl = forceRefresh ? 60 : 300; // 强制刷新时缓存时间短一些

      // 配置新闻源
      const sources = csv(env.NEWS_SOURCES || 'bbc-news,cnn,reuters,the-verge,techcrunch');
      
      // KV key per (tag,page)
      const key = kvKey(tag, page, sources);

      if (!forceRefresh && env.NEWS_CACHE) {
        const cached = await env.NEWS_CACHE.get(key, { type: 'json' });
        if (cached) return json(cached, 200, ttl);
      }

      // Fetch from NewsAPI
      const apiUrl = new URL('https://newsapi.org/v2/top-headlines');
      apiUrl.searchParams.set('sources', sources.join(','));
      apiUrl.searchParams.set('pageSize', String(pageSize));
      apiUrl.searchParams.set('page', String(page));
      if (tag && tag.toLowerCase() !== 'top') apiUrl.searchParams.set('q', tag);

      const res = await fetch(apiUrl.toString(), {
        headers: { 'X-Api-Key': env.NEWSAPI_KEY },
        cf: { cacheTtl: 0, cacheEverything: false }, // avoid Cloudflare auto-cache of upstream
      });

      if (!res.ok) {
        const text = await res.text();
        return json({ error: 'Upstream error', status: res.status, details: text.slice(0, 300) }, 502);
      }

      // 🛠️ 这里增加安全解析逻辑
      let data;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        return json({ error: 'Invalid response type', details: text.slice(0, 300) }, 502);
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
      return json({ error: 'Internal server error', details: error.message }, 500);
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

