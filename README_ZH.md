# 📰 新闻聚合器 – Cloudflare Pages

#### 🌐 [English Version](https://github.com/benjiann/NewsFocus/main/README.md) | [中文版](https://github.com/benjiann/NewsFocus//main/README_zh.md)


一个简单、快速、美观的 **新闻聚合器**，基于 **Cloudflare Pages** 构建。  
从 [NewsAPI](https://newsapi.org/) 获取新闻，并以 **瀑布流卡片布局** 展示，支持 **标签过滤**、**无限滚动**、**夜间模式** 以及 **中英文切换**。

---

## ✨ 功能特性

- 🗞 获取 **NewsAPI Top Headlines** 新闻  
- 🏷 支持 **标签过滤**：头条、科技、商业、娱乐、科学、健康  
- 🖼 **瀑布流 / 网格布局** 卡片，包括图片、标题、描述、来源和链接  
- 🔄 **无限滚动** 加载更多新闻  
- 🌙 **夜间模式切换**  
- 🌐 **中英文切换**（可扩展前端实现）  
- ✨ **图片渐显效果**，加载失败自动显示占位图  
- ⚡ Cloudflare Pages **无服务器部署**（无需传统后端）  
- 🔁 可选 **手动刷新按钮**  
- 💾 API 请求通过 **KV 缓存**，避免超出 NewsAPI 限额  

---

## 📁 项目结构

```
/functions        # Cloudflare Pages Functions
  news.js         # API 代理，获取新闻并缓存到 KV
/public
  index.html      # 前端主页面
  style.css       # 卡片布局和夜间模式样式
  app.js          # 前端 JS：获取数据、渲染、无限滚动、标签切换、中英文切换
wrangler.toml     # Cloudflare Pages + Functions 配置文件
```

---

## 🛠 环境变量

在 **Cloudflare Pages → Settings → Environment Variables** 配置如下：

| 变量名           | 说明                                      |
|------------------|-----------------------------------------|
| NEWSAPI_KEY       | 你的 NewsAPI API Key                     |
| NEWS_SOURCES      | 新闻源列表（逗号分隔，例如 `bbc-news,cnn`） |
| NEWS_LANGUAGE     | 语言代码，例如 `en` 或 `zh`             |
| NEWS_CACHE        | KV 命名空间名称，用于缓存                 |
| MIN_IMAGE_WIDTH   | 可选，最小图片宽度                        |

> ⚠️ 不要在前端硬编码 API Key，请通过 Functions 代理保护。  

---

## 🚀 部署步骤

1. **克隆或 Fork 仓库**：

```bash
git clone https://github.com/yourusername/news-aggregator.git
cd news-aggregator
```

2. **连接 Cloudflare Pages**：

- 打开 [Cloudflare Pages](https://pages.cloudflare.com/)  
- 点击 **Create a Project** → 连接 GitHub 仓库  

3. **配置构建设置**：

- **Framework**：None / Static Site  
- **Build command**：留空（无构建步骤）  
- **Build output directory**：`public`  

4. **添加 Functions 支持**：

- 设置 **Functions 目录** 为 `/functions`  
- KV 绑定：添加 `NEWS_CACHE` → 绑定到已创建的 KV 命名空间

5. **配置环境变量**（参考上表）

6. **部署**：

- 点击 **Save and Deploy** → Pages 会构建并提供前端和 API 服务  

7. **访问网站**：

- 前端会通过 `/api/news` 自动获取新闻  
- 无限滚动、标签切换、中英文切换、夜间模式功能即刻可用  

---

## 💡 注意事项

- 🛡 **KV 缓存** 避免频繁请求 NewsAPI 超出配额，前端始终通过 KV 获取新闻  
- 🖼 **图片加载失败**会自动显示占位图  
- 🎨 可自定义 `style.css` 调整卡片布局和夜间模式颜色  
- 🔄 **刷新新闻**：点击页面“刷新”按钮即可手动更新缓存  

---

## 🖼 示例标签和图标

| 标签       | 图标 |
|-----------|------|
| 头条      | 🏆    |
| 科技      | 💻    |
| 商业      | 💼    |
| 娱乐      | 🎬    |
| 科学      | 🔬    |
| 健康      | 🩺    |

> 可在 `index.html` 中集成 [Font Awesome](https://fontawesome.com/) 图标实现更丰富视觉效果。

---

## 🎉 截图（可选）

_在此添加已部署网站截图展示界面效果_

