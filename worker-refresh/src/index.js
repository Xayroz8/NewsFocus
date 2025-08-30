// worker-refresh/src/index.js
// A scheduled worker that prefetches NewsAPI top-headlines for configured tags
// and stores normalized results into KV (NEWS_CACHE).
//
// Deployment: wrangler publish with the wrangler.toml above, and make sure
// NEWSAPI_KEY is set as a secret, and NEWS_CACHE KV is bound.

export default {
    async scheduled(event, env, ctx) {
        try {
            const tags = (env.PUBLIC_TAGS || 'Top').split(',').map((s) => s.trim()).filter(Boolean);
            const sources = (env.NEWS_ALLOWED_SOURCES || '').split(',').map((s) => s.trim()).filter(Boolean);
            const excluded = new Set((env.NEWS_EXCLUDE_SOURCES || '').split(',').map(s => s.trim()).filter(Boolean));

            // derive final sources list
            const finalSources = sources.filter(s => s && !excluded.has(s));
            if (finalSources.length === 0) {
                console.warn('No sources configured - skipping prewarm');
                return;
            }

            const pageSize = Math.max(1, Math.min(100, Number(env.PAGE_SIZE || 40)));
            const ttl = Math.max(30, Number(env.CACHE_TTL_SECONDS || 600));

            // Only prewarm first page for each tag to limit API usage
            for (const tag of tags) {
                try {
                    const page = 1;
                    const apiUrl = new URL('https://newsapi.org/v2/top-headlines');
                    apiUrl.searchParams.set('sources', finalSources.join(','));
                    apiUrl.searchParams.set('pageSize', String(pageSize));
                    apiUrl.searchParams.set('page', String(page));
                    if (tag && tag.toLowerCase() !== 'top') apiUrl.searchParams.set('q', tag);

                    const resp = await fetch(apiUrl.toString(), {
                        headers: {
                            'X-Api-Key': env.NEWSAPI_KEY,
                        },
                    });

                    if (!resp.ok) {
                        console.warn(`Upstream error for tag=${tag}: status=${resp.status}`);
                        continue;
                    }

                    const data = await resp.json();

                    // Normalize articles to a small shape
                    const normalized = {
                        status: data.status || 'ok',
                        totalResults: data.totalResults || 0,
                        articles: (data.articles || []).map(a => ({
                            title: a?.title || '',
                            description: a?.description || '',
                            url: a?.url || '#',
                            urlToImage: a?.urlToImage || '',
                            source: a?.source?.name || '',
                            publishedAt: a?.publishedAt || '',
                        })),
                        tag: tag || 'Top',
                        page,
                        pageSize,
                        fetchedAt: new Date().toISOString(),
                    };

                    const key = kvKey(tag || 'Top', page, finalSources);
                    // Write to KV
                    await env.NEWS_CACHE.put(key, JSON.stringify(normalized), { expirationTtl: ttl });
                    console.log(`Prewarmed KV key=${key} articles=${normalized.articles.length}`);
                } catch (innerErr) {
                    console.error('Error prewarming tag', tag, innerErr);
                }
            }
        } catch (err) {
            console.error('Scheduled worker error', err);
        }
    }
};

// helper: build consistent KV key
function kvKey(tag, page, sources) {
    return `v1:news:${slug(tag)}:p${page}:src:${hash(sources.join(','))}`;
}

function slug(s) {
    return String(s || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
}

// simple non-cryptographic hash -> base36
function hash(s) {
    let h = 2166136261; // FNV offset basis
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return (h >>> 0).toString(36);
}
