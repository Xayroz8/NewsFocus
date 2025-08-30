# 📰 News Aggregator on Cloudflare Pages

A lightweight **news aggregation web app** built with **HTML, CSS, and JavaScript**. It fetches news articles from the [NewsAPI](https://newsapi.org/) and displays them in a **masonry-style (瀑布流) card layout**. The app is designed to run entirely on **Cloudflare Pages**, with configuration handled via environment variables.

---

## ✨ Features

* 🔍 **English-only news**
* 🏷️ **Tag-based filtering** (e.g., technology, sports, politics)
* 📰 **Dynamic news cards** with images, titles, and clickable links to full articles
* 🌊 **Masonry-style layout** for a modern look
* 🔄 **Auto-refresh via Cloudflare Pages Scheduled Functions**
* 🔘 **Manual refresh button** for users
* ⚙️ **Configurable news sources** via environment variables
* 🚀 **Serverless deployment** on Cloudflare Pages (no traditional backend required)

---

## 📂 Project Structure

```
├── index.html       # Main HTML file
├── app.js           # Frontend logic (fetch news, render UI)
├── index.js         # Cloudflare Pages Function (API fetcher)
├── wrangler.toml    # Cloudflare Pages configuration
├── styles.css       # Custom styles (masonry layout, cards)
└── README.md        # Project documentation
```

---

## ⚡ Deployment Steps

### 1. Clone Repository

```bash
git clone https://github.com/your-username/news-aggregator.git
cd news-aggregator
```

### 2. Configure Environment Variables

Set environment variables in **Cloudflare Pages → Settings → Environment Variables**:

* `NEWS_API_KEY` → Your [NewsAPI](https://newsapi.org/) key
* `NEWS_API_URL` → `https://newsapi.org/v2/top-headlines`
* `NEWS_SOURCES` → Comma-separated list of sources (optional)
* `NEWS_LANGUAGE` → `en`

### 3. Deploy to Cloudflare Pages

Push the repository to GitHub and connect it to **Cloudflare Pages**:

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

Then configure build settings:

* **Framework preset**: None
* **Build command**: None
* **Output directory**: `/`

### 4. (Optional) Scheduled Refresh

Enable **Scheduled Functions** in `wrangler.toml` to refresh news automatically:

```toml
[triggers]
crons = ["0 * * * *"] # refresh every hour
```

### 5. Visit Your App 🎉

After deployment, visit your Cloudflare Pages domain:

```
https://your-app.pages.dev
```

---

## 🚀 Roadmap / Future Enhancements

* ✅ Infinite scroll loading
* ✅ Search box for keyword filtering
* ✅ Dark mode UI toggle
* ✅ Save favorite articles locally (via LocalStorage)

---

## 📜 License

This project is licensed under the **MIT License**.
