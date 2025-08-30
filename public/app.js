const tags = ['top','technology','business','entertainment','science','health'];
let currentTag = 'top';
let currentPage = 1;
let loading = false;
let allLoaded = false;

const container = document.getElementById('news-container');
const tagContainer = document.getElementById('tag-buttons');
const loadingEl = document.getElementById('loading');

// 生成标签按钮
tags.forEach(tag=>{
  const btn = document.createElement('button');
  btn.textContent = tag[0].toUpperCase()+tag.slice(1);
  btn.addEventListener('click',()=>switchTag(tag));
  tagContainer.appendChild(btn);
});

// 切换标签
function switchTag(tag){
  currentTag = tag;
  currentPage = 1;
  allLoaded = false;
  container.innerHTML = '';
  fetchNews();
}

// 刷新按钮
document.getElementById('refresh-btn').addEventListener('click', ()=>{
  currentPage = 1;
  allLoaded = false;
  container.innerHTML = '';
  fetchNews();
});

// 夜间模式
document.getElementById('toggle-theme').addEventListener('click', ()=>{
  document.body.classList.toggle('dark');
  document.body.classList.toggle('light');
});

// 获取新闻
async function fetchNews(){
  if(loading || allLoaded) return;
  loading = true;
  loadingEl.style.display = 'block';

  try {
    const resp = await fetch(`/api/news?tag=${currentTag}&page=${currentPage}`);
    const data = await resp.json();

    if(!data.articles || data.articles.length === 0){
      allLoaded = true;
      loadingEl.style.display = 'none';
      loading = false;
      return;
    }

    data.articles.forEach(article=>{
      const card = document.createElement('div');
      card.className = 'news-card';

      const img = document.createElement('img');
      img.src = article.urlToImage || '';
      img.alt = 'News Image';
      img.onload = ()=>{img.style.opacity=1;}
      img.onerror = ()=>{img.src='https://via.placeholder.com/400x180?text=No+Image'; img.style.opacity=1;}

      const content = document.createElement('div');
      content.className = 'card-content';
      content.innerHTML = `
        <h3>${article.title}</h3>
        <p>${article.description || 'No description available.'}</p>
        <span class="source">${article.source || 'Unknown'}</span>
        <a href="${article.url}" target="_blank">Read More</a>
      `;

      card.appendChild(img);
      card.appendChild(content);
      container.appendChild(card);
    });

    loadingEl.style.display = 'none';
    loading = false;
  } catch(e){
    console.error(e);
    loadingEl.style.display = 'none';
    loading = false;
  }
}

// 无限滚动
window.addEventListener('scroll', ()=>{
  if(loading || allLoaded) return;
  if(window.innerHeight + window.scrollY >= document.body.offsetHeight - 200){
    currentPage++;
    fetchNews();
  }
});

// 初始加载
window.addEventListener('DOMContentLoaded', fetchNews);
