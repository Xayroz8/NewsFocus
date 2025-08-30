// functions/api/news.js
export async function onRequestGet(context) {
  const { request, env } = context;
  const debug = new URL(request.url).searchParams.get('debug') === '1';

  try {
    // parse params
    const url = new URL(request.url);
    const tag = url.searchParams.get('tag') || 'top';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = clamp(parseInt(url.searchParams.get('pageSize') || env.PAGE_SIZE || '20', 10), 1, 100);
    const forceRefresh = url.searchParams.has('refresh');
    const ttl = forceRefresh ? 60 : Number(env.CACHE_TTL_SECONDS || 300);

    // sources (support two env names for compatibility)
    const sourcesCsv = env.NEWS_SOURCES || env.NEWS_ALLOWED_SOURCES || '';
    const sources = csv(sourcesCsv || 'bbc-news,cnn,reuters,the-verge,techcrunch');

    if (sources.length === 0) {
      return json({ error: 'No sources configured (NEWS_SOURCES / NEWS_ALLOWED_SOURCES)' }, 500);
    }

    const key = kvKey(tag, page, sources);

    // try KV cache first
    if (!forceRefresh && env.NEWS_CACHE) {
      try {
        const cached = await env.NEWS_CACHE.get(key, { type: 'json' });
        if (cached) return json(cached, 200, ttl);
      } catch (e) {
        // KV read error shouldn't block: log and continue
        console.log('KV read error', e);
      }
    }

    // build NewsAPI URL
    const apiUrl = new URL('https://newsapi.org/v2/top-headlines');
    apiUrl.searchParams.set('sources', sources.join(','));
    apiUrl.searchParams.set('pageSize', String(pageSize));
    apiUrl.searchParams.set('page', String(page));
    if (tag && tag.toLowerCase() !== 'top') apiUrl.searchParams.set('q', tag);

    // fetch upstream
    const upstreamKey = env.NEWSAPI_KEY || '2d9f228dcc4f4c1d8850b69f2c3c0fbd'; // support both names
    const fetchRes = await fetch(apiUrl.toString(), {
      headers: { 'X-Api-Key': String(upstreamKey || '') },
      cf: { cacheTtl: 0, cacheEverything: false },
    });

    const contentType = (fetchRes.headers.get('content-type') || '').toLowerCase();
    const rawText = await fetchRes.text(); // always get text first to allow debugging

    // if not JSON, return helpful debug info (if debug=1 show snippet)
    if (!contentType.includes('application/json')) {
      const payload = {
        error: 'Upstream returned non-JSON',
        upstreamUrl: apiUrl.toString(),
        upstreamStatus: fetchRes.status,
        responseSnippet: rawText.slice(0, 1000),
      };
      if (debug) {
        return json(payload, 502, 0);
      } else {
        // production: don't leak too much
        return json({ error: 'Upstream returned non-JSON', status: fetchRes.status }, 502);
      }
    }

    // parse JSON safely
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      const payload = { error: 'Failed to parse upstream JSON', message: e.message, snippet: rawText.slice(0, 1000) };
      if (debug) return json(payload, 500, 0);
      return json({ error: 'Failed to parse upstream JSON' }, 500);
    }

    // handle upstream API-level errors
    if (data.status && data.status !== 'ok') {
      const payload = { error: 'Upstream API error', details: data };
      if (debug) return json(payload, 502, 0);
      return json({ error: 'Upstream API error' }, 502);
    }

    // normalize articles
    const minW = Number(env.MIN_IMAGE_WIDTH || 200);
    const normalized = {
      status: 'ok',
      totalResults: data.totalResults || 0,
      articles: (data.articles || []).map((a) => simplifyArticle(a, minW)),
      tag,
      page,
      pageSize,
      fetchedAt: new Date().toISOString(),
    };

    // put to KV (best-effort)
    if (env.NEWS_CACHE) {
      try {
        await env.NEWS_CACHE.put(key, JSON.stringify(normalized), { expirationTtl: ttl });
      } catch (e) {
        console.log('KV put error', e);
      }
    }

    return json(normalized, 200, ttl);
  } catch (err) {
    console.error('Function exception', err);
    if (debug) {
      return json({ error: 'Function exception', message: err.message, stack: err.stack }, 500, 0);
    }
    return json({ error: 'Internal server error' }, 500);
  }
}

/* ---------- helpers ---------- */

function json(obj, status = 200, ttl = 300) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  };
  if (typeof ttl === 'number' && ttl > 0) {
    headers['Cache-Control'] = `public, s-maxage=${Math.max(0, ttl)}, stale-while-revalidate=86400`;
  } else {
    headers['Cache-Control'] = 'no-store';
  }
  return new Response(JSON.stringify(obj, null, 2), { status, headers });
}

function csv(v) {
  return String(v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function kvKey(tag, page, sources) {
  return `v1:news:${slug(tag)}:p${page}:src:${hash(sources.join(','))}`;
}

function slug(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '');
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return (h >>> 0).toString(36);
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n || 0));
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

