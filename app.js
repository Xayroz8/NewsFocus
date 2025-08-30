// app.js
// Front-end logic for Cloudflare Pages + Pages Functions
// Expects two endpoints: GET /api/config and GET /api/news

const API_BASE = '/api'; // Pages Functions 路径
let state = { tag: 'Top', page: 1, loading: false, reachedEnd: false };

const el = {
    tags: document.getElementById('tags'),
    grid: document.getElementById('grid'),
    refresh: document.getElementById('refreshBtn'),
    loadMore: document.getElementById('loadMoreBtn'),
    tpl: document.getElementById('card-tpl'),
};

init();

async function init() {
    // Load config (PUBLIC_TAGS) then render UI
    try {
        const res = await fetch(`${API_BASE}/config`);
        if (!res.ok) throw new Error('config fetch failed');
        const cfg = await res.json();
        renderTags(cfg.tags || ['Top', 'Technology', 'Finance']);
    } catch (e) {
        console.warn('Failed to load config, using defaults.', e);
        renderTags(['Top', 'AI', 'Technology', 'Finance', 'Science', 'Sports']);
    }

    // Bind buttons
    el.refresh.addEventListener('click', () => refreshCurrent());
    el.loadMore.addEventListener('click', () => loadMore());

    // Auto-select initial tag
    selectTag(state.tag);
}

function renderTags(tags) {
    el.tags.innerHTML = '';
    for (const t of tags) {
        const btn = document.createElement('button');
        btn.className = 'tag';
        btn.textContent = t;
        btn.addEventListener('click', () => selectTag(t));
        el.tags.appendChild(btn);
    }
}

async function selectTag(tag) {
    // Reset state and UI
    state.tag = tag;
    state.page = 1;
    state.reachedEnd = false;
    for (const b of el.tags.querySelectorAll('.tag')) {
        b.classList.toggle('active', b.textContent === tag);
    }
    el.grid.innerHTML = '';
    await fetchAndRender(false);
}

async function refreshCurrent() {
    if (state.loading) return;
    state.page = 1;
    state.reachedEnd = false;
    el.grid.innerHTML = '';
    await fetchAndRender(true);
}

async function loadMore() {
    if (state.loading || state.reachedEnd) return;
    state.page += 1;
    await fetchAndRender(false);
}

async function fetchAndRender(force = false) {
    try {
        state.loading = true;
        showLoading(true);

        // Build request URL
        const url = new URL(`${API_BASE}/news`, location.origin);
        url.searchParams.set('page', String(state.page));
        if (state.tag && state.tag.toLowerCase() !== 'top') url.searchParams.set('tag', state.tag);
        if (force) url.searchParams.set('refresh', '1');

        const res = await fetch(url.toString());
        if (!res.ok) {
            // If 429 or 502, we show a friendly message
            if (res.status === 429) throw new Error('Rate limit exceeded');
            throw new Error('Failed to fetch news');
        }
        const data = await res.json();

        const articles = data.articles || [];
        if (articles.length === 0) {
            // If page 1 and empty => nothing, else reached end
            if (state.page === 1) {
                showEmptyHint();
            } else {
                state.reachedEnd = true;
                el.loadMore.textContent = 'No more';
                el.loadMore.disabled = true;
            }
        } else {
            renderArticles(articles);
            // if less than pageSize -> likely last page
            const pageSize = data.pageSize || (articles.length + 0);
            if (articles.length < pageSize) {
                state.reachedEnd = true;
                el.loadMore.textContent = 'No more';
                el.loadMore.disabled = true;
            } else {
                el.loadMore.textContent = 'Load more';
                el.loadMore.disabled = false;
            }
        }
    } catch (err) {
        console.error(err);
        showError(err.message || 'Failed to load news');
    } finally {
        state.loading = false;
        showLoading(false);
    }
}

function renderArticles(items) {
    const frag = document.createDocumentFragment();
    for (const it of items) {
        const node = el.tpl.content.firstElementChild.cloneNode(true);

        const a = node.querySelector('a');
        const img = node.querySelector('img');
        const title = node.querySelector('.title');
        const desc = node.querySelector('.desc');
        const source = node.querySelector('.source');
        const time = node.querySelector('time');

        a.href = it.url || '#';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';

        // image optimized: if urlToImage missing, show placeholder
        if (it.urlToImage) {
            img.src = it.urlToImage;
            img.alt = it.title || '';
        } else {
            img.src = placeholderDataURI();
            img.alt = 'No image';
        }

        title.textContent = it.title || '';
        desc.textContent = it.description || '';
        source.textContent = it.source || '';
        time.textContent = it.publishedAt ? formatDate(it.publishedAt) : '';

        frag.appendChild(node);
    }
    el.grid.appendChild(frag);
}

function formatDate(iso) {
    try {
        const d = new Date(iso);
        return d.toLocaleString();
    } catch (e) {
        return iso;
    }
}

function placeholderDataURI() {
    return (
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#bbb" font-family="Arial" font-size="24">No image</text></svg>`
        )
    );
}

function showLoading(show) {
    el.refresh.disabled = show;
    if (show) {
        el.refresh.textContent = 'Loading...';
    } else {
        el.refresh.textContent = 'Refresh';
    }
}

function showError(msg) {
    // Simple alert; you can change to a nicer UI
    alert('Error: ' + msg);
}

function showEmptyHint() {
    const div = document.createElement('div');
    div.style.padding = '20px';
    div.style.textAlign = 'center';
    div.style.color = '#666';
    div.textContent = 'No articles found for this tag.';
    el.grid.appendChild(div);
}
