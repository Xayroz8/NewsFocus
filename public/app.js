// 配置标签
const tags = ['top','technology','business','entertainment','science','health'];

let currentTag = 'top';
let currentPage = 1;
let loading = false;
let allLoaded = false;

// 动态生成标签按钮
const tagContainer = document.getElementById('tag-buttons');
tags.forEach(tag=>{
  const btn = document.createElement('button');
  btn.textContent = tag[0].toUpperCase() + tag.slice(1);
  btn.addEventListener('click',()=>switchTag(tag));
  tagContainer.insertBefore(btn, document.getElementById('refresh-btn'));
});

// 核心函数：获取新闻并渲染
async function fetchNews(tag=currentTag, page=currentPage) {
  if (loading || allLoaded) return;
  loading = true;

  const container = document.getElementById("news-container");
  if(page===1) container.innerHTML="<p>Loading...</p>";

  try {
    const resp = await fetch(`/api/news?tag=${encodeURIComponent(tag)}&page=${page}`);
    const data = await resp.json();

    if(data.error){
      if(page===1) container.innerHTML=`<p>Error: ${data.error}</p>`;
      loading = false;
      return;
    }

    if(page===1) container.innerHTML=""; // 清空第一页内容

    if(!data.articless || data.articless.length===0){
      if(page===1) container.innerHTML="<p>No news available.</p>";
      allLoaded = true;
      loading = false;
      return;
    }

    // 渲染每篇文章
    data.articles.forEach(articles => {
      const card = document.createElement("div");
      card.className="news-card";

      const inner = document.createElement("div");
      inner.className="news-card-inner";

      inner.innerHTML = `
        <div class="news-card-front">
          <img src="${articles.urlToImage || ''}" alt="News Image"
               onload="this.style.opacity=1"
               onerror="this.onerror=null;this.src='';this.style.backgroundSize='cover';">
          <div class="card-content">
            <h3>${articles.title}</h3>
            <p>${articles.description || 'No description available.'}</p>
            <span class="source">${articles.source?.name || 'Unknown'}</span>
          </div>
        </div>
        <div class="news-card-back">
          <div class="card-content">
            <h3>${articles.title}</h3>
            <p>${articles.description || 'No description available.'}</p>
            <a href="${articles.url}" target="_blank" rel="noopener noreferrer">Read More</a>
          </div>
        </div>
      `;
      card.appendChild(inner);
      container.appendChild(card);
    });

    loading = false;
  } catch(err) {
    if(page===1) container.innerHTML=`<p>Error fetching news: ${err.message}</p>`;
    console.error(err);
    loading=false;
  }
}

// 切换标签
function switchTag(tag){
  currentTag = tag;
  currentPage = 1;
  allLoaded = false;
  fetchNews();
}

// 手动刷新按钮
document.getElementById("refresh-btn").addEventListener("click", ()=>{
  currentPage=1;
  allLoaded=false;
  fetchNews();
});

// 夜间模式切换
document.getElementById("toggle-theme").addEventListener("click",()=>{
  document.body.classList.toggle("dark");
  document.body.classList.toggle("light");
});

// 无限滚动加载下一页
window.addEventListener('scroll', ()=>{
  if(loading || allLoaded) return;
  if(window.innerHeight + window.scrollY >= document.body.offsetHeight - 200){
    currentPage++;
    fetchNews();
  }
});

// 初始加载第一页新闻
window.addEventListener("DOMContentLoaded", ()=>fetchNews());
