async function fetchAndRender(tag='top', page=1) {
  const container = document.getElementById("news-container");
  container.innerHTML = "<p>Loading...</p>";

  try {
    const resp = await fetch(`/api/news?tag=${encodeURIComponent(tag)}&page=${page}`);
    const data = await resp.json();

    if(data.error) {
      container.innerHTML = `<p>Error: ${data.error}</p>`;
      return;
    }

    container.innerHTML = "";
    if(!data.articles || data.articles.length===0) {
      container.innerHTML="<p>No news available.</p>";
      return;
    }

    data.articles.forEach(article => {
      const card = document.createElement("div");
      card.className="news-card";

      const inner = document.createElement("div");
      inner.className="news-card-inner";

      inner.innerHTML = `
        <div class="news-card-front">
          <img src="${article.urlToImage || ''}" alt="News Image"
            onload="this.style.opacity=1"
            onerror="this.onerror=null;this.src='';this.style.backgroundSize='cover';">
          <div class="card-content">
            <h3>${article.title}</h3>
            <p>${article.description || 'No description available.'}</p>
            <span class="source">${article.source}</span>
          </div>
        </div>
        <div class="news-card-back">
          <div class="card-content">
            <h3>${article.title}</h3>
            <p>${article.description || 'No description available.'}</p>
            <a href="${article.url}" target="_blank" rel="noopener noreferrer">Read More</a>
          </div>
        </div>
      `;
      card.appendChild(inner);
      container.appendChild(card);
    });
  } catch(err) {
    container.innerHTML=`<p>Error fetching news: ${err.message}</p>`;
    console.error(err);
  }
}

// 页面加载默认渲染 top
window.addEventListener("DOMContentLoaded", ()=>fetchAndRender());

// 手动刷新按钮
const refreshBtn=document.getElementById("refresh-btn");
if(refreshBtn){ refreshBtn.addEventListener("click",()=>fetchAndRender()); }

// 切换标签
function selectTag(tag){ fetchAndRender(tag,1); }

// 夜间模式切换
const themeBtn=document.getElementById("toggle-theme");
if(themeBtn){
  themeBtn.addEventListener("click",()=>{
    document.body.classList.toggle("dark");
    document.body.classList.toggle("light");
  });
}
