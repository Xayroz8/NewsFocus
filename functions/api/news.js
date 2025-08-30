// functions/api/news.js
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const page = url.searchParams.get("page") || 1;
  const category = url.searchParams.get("category") || "general";
  const sources = env.NEWS_SOURCES || ""; // 过滤的新闻源
  const apiKey = env.NEWSAPI_KEY || "2d9f228dcc4f4c1d8850b69f2c3c0fbd"; 

  const upstreamUrl = `https://newsapi.org/v2/top-headlines?language=en&pageSize=10&page=${page}&sources=${sources}`;

  try {
    const res = await fetch(upstreamUrl, {
      headers: {
        "X-Api-Key": apiKey,
        "User-Agent": "MyNewsAggregator/1.0 (https://your-site.pages.dev)",
        "Accept": "application/json"
      }
    });

    // ⚠️ 如果返回不是 JSON，打印出来调试
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return new Response(JSON.stringify({
        error: "Invalid JSON from NewsAPI",
        status: res.status,
        body: text.slice(0, 200) // 只截取前200字符
      }), { status: 500 });
    }

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: "Fetch failed",
      details: err.message
    }), { status: 500 });
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





