/* ============================================
   חיים ארוכים — Homepage Feed
   Loads articles.json, renders hero + grid
   ============================================ */

(function () {
  'use strict';

  const CATEGORY_ICONS = {
    'מחקר': '🔬',
    'תזונה': '🥗',
    'אורח חיים': '🏃',
    'טכנולוגיה רפואית': '🩺',
    'גנטיקה': '🧬'
  };

  function getCategoryClass(category) {
    return 'cat-' + category.replace(/\s+/g, '-');
  }

  async function loadFeed() {
    try {
      const response = await fetch('content/articles.json');
      const articles = await response.json();

      if (!articles || articles.length === 0) return;

      renderHero(articles[0]);
      renderGrid(articles.slice(1));
      renderLatestSidebar(articles.slice(0, 5));
    } catch (error) {
      console.error('Failed to load articles:', error);
    }
  }

  function renderHero(article) {
    const categoryEl = document.getElementById('hero-category');
    const titleEl = document.getElementById('hero-title');
    const summaryEl = document.getElementById('hero-summary');
    const bottomLineEl = document.getElementById('hero-bottom-line');
    const ctaEl = document.getElementById('hero-cta');

    if (categoryEl) categoryEl.textContent = `${CATEGORY_ICONS[article.category] || ''} ${article.category}`;
    if (titleEl) titleEl.textContent = article.title;
    if (summaryEl) summaryEl.textContent = article.summary;
    if (bottomLineEl) bottomLineEl.textContent = article.bottomLine;
    if (ctaEl) ctaEl.href = `article.html?id=${article.id}`;
  }

  function renderGrid(articles) {
    const grid = document.getElementById('articles-grid');
    if (!grid) return;

    grid.innerHTML = articles.map(article => `
      <article class="article-card ${getCategoryClass(article.category)}" data-animate>
        <a href="article.html?id=${article.id}" class="block p-6">
          <span class="card-category">${CATEGORY_ICONS[article.category] || ''} ${article.category}</span>
          <h3 class="card-title">${article.title}</h3>
          <p class="card-summary mt-2 line-clamp-3">${article.summary}</p>
          <div class="flex items-center justify-between mt-4">
            <span class="card-date">${article.publishDate}</span>
            <span class="card-read-more">
              קרא עוד
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            </span>
          </div>
        </a>
      </article>
    `).join('');

    if (window.initScrollReveal) {
      window.initScrollReveal();
    }
  }

  function renderLatestSidebar(articles) {
    const sidebar = document.getElementById('latest-sidebar');
    if (!sidebar) return;

    sidebar.innerHTML = articles.map((article, index) => `
      <a href="article.html?id=${article.id}" class="flex gap-3 py-3 ${index > 0 ? 'border-t border-gray-100' : ''} group">
        <span class="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-400 group-hover:bg-green-50 group-hover:text-green-700 transition-colors">${index + 1}</span>
        <span class="text-sm leading-relaxed text-gray-700 group-hover:text-green-800 transition-colors">${article.title}</span>
      </a>
    `).join('');
  }

  document.addEventListener('DOMContentLoaded', loadFeed);

})();
