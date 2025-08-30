
async function fetchAndRender(tag='top', page=1) {
  const container = document.getElementById("news-container");
  container.innerHTML = "<p>Loading...</p>";

  try {
    const resp = await fetch(`/api/news?tag=${encodeURIComponent(tag)}&page=${page}`);
    const data = await resp.json();

    if (data.error) {
      container.innerHTML = `<p>Error: ${data.error}</p>`;
      return;
    }

    container.innerHTML = "";
    if (!data.articles || data.articles.length === 0) {
      container.innerHTML = "<p>No news available.</p>";
      return;
    }

    data.articles.forEach(article => {
      const card = document.createElement("div");
      card.className = "news-card";
      card.innerHTML = `
        <a href="${article.url}" target="_blank" rel="noopener noreferrer">
          <img src="${article.urlToImage || 'https://via.placeholder.com/400x200?text=No+Image'}" alt="News Image">
          <div class="card-content">
            <h3>${article.title}</h3>
            <p>${article.description || 'No description available.'}</p>
            <span class="source">${article.source}</span>
          </div>
        </a>
      `;
      container.appendChild(card);
    });
  } catch(err) {
    container.innerHTML = `<p>Error fetching news: ${err.message}</p>`;
    console.error(err);
  }
}

// 页面加载默认渲染 top
window.addEventListener("DOMContentLoaded", () => fetchAndRender());

// 手动刷新按钮
const refreshBtn = document.getElementById("refresh-btn");
if (refreshBtn) {
  refreshBtn.addEventListener("click", () => fetchAndRender());
}

// 可选：切换标签
function selectTag(tag) {
  fetchAndRender(tag, 1);
}
