export async function onRequest(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const debug = url.searchParams.get('debug') === '1';

  const tag = url.searchParams.get('tag') || 'top';
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const pageSize = Math.max(1, Math.min(parseInt(url.searchParams.get('pageSize') || '20', 10), 50));
  const forceRefresh = url.searchParams.has('refresh');
  const ttl = forceRefresh ? 60 : 300;

  // KV key
  const kvKey = `news:${tag}:p${page}`;

  // 读取 KV 缓存
  if (env.NEWS_CACHE && !forceRefresh) {
    try {
      const cached = await env.NEWS_CACHE.get(kvKey, { type: 'json' });
      if (cached) return jsonResponse(cached, ttl);
    } catch (e) {
      console.log('KV read error', e);
    }
  }

  // 构建 NewsAPI URL
  const sources = env.NEWS_SOURCES || '';
  const apiParams = new URLSearchParams();
  apiParams.set('language', 'en');
  apiParams.set('pageSize', pageSize);
  apiParams.set('page', page);

  if (sources) {
    apiParams.set('sources', sources);
  } else if (tag.toLowerCase() !== 'top') {
    // 如果没有 sources，用 tag 查询关键词
    apiParams.set('q', tag);
  }

  const apiUrl = `https://newsapi.org/v2/top-headlines?${apiParams.toString()}`;
  const apiKey = env.NEWS_API_KEY;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        'X-Api-Key': apiKey,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return jsonResponse({ error: 'Failed to parse JSON from NewsAPI', snippet: text.slice(0,200) }, 500);
    }

    if (data.status && data.status !== 'ok') {
      return jsonResponse({ error: 'Upstream API error', details: data }, 502);
    }

    const minW = Number(env.MIN_IMAGE_WIDTH || 200);
    const normalized = {
      status: 'ok',
      totalResults: data.totalResults || 0,
      articles: (data.articles || []).map(a => simplifyArticle(a, minW)),
      tag,
      page,
      pageSize,
      fetchedAt: new Date().toISOString(),
    };

    // 写入 KV
    if (env.NEWS_CACHE) {
      try {
        await env.NEWS_CACHE.put(kvKey, JSON.stringify(normalized), { expirationTtl: ttl });
      } catch(e) {
        console.log('KV put error', e);
      }
    }

    return jsonResponse(normalized, ttl);

  } catch(err) {
    return jsonResponse({ error: 'Fetch failed', details: err.message }, 500);
  }
}

/* ---------- helpers ---------- */
function jsonResponse(obj, ttl = 300) {
  return new Response(JSON.stringify(obj, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': ttl>0 ? `public, s-maxage=${ttl}, stale-while-revalidate=86400` : 'no-store',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

function simplifyArticle(a, minW) {
  return {
    title: a?.title || '',
    description: a?.description || '',
    url: a?.url || '',
    urlToImage: a?.urlToImage || '',
    source: (a?.source && (a.source.name || a.source.id)) || '',
    publishedAt: a?.publishedAt || '',
  };
}
