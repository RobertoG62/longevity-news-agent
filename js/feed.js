/* ============================================
   חיים ארוכים — Homepage Feed v2
   Premium Magazine Layout
   Loads articles.json, renders hero + 3-col grid
   ============================================ */

(function () {
  'use strict';

  // SVG icons per category (Lucide-style)
  const CATEGORY_SVG = {
    'מחקר': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v6"/><path d="M15 2v6"/><path d="M12 17v5"/><path d="M5 8h14"/><path d="M5 8a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V10a2 2 0 0 0-2-2"/><path d="M19 8a2 2 0 0 1 2 2v1a5 5 0 0 1-5 5"/></svg>',
    'תזונה': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2l10 6.5V22"/><path d="M22 2L12 8.5"/><path d="M16 8c0 5.5-8 5.5-8 0"/><path d="M7.5 12c-2.5 1-4.5 3-4.5 6 0 2 1 4 4 4h10c3 0 4-2 4-4 0-3-2-5-4.5-6"/></svg>',
    'אורח חיים': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><circle cx="12" cy="2" r="1"/><path d="M12 2v2"/></svg>',
    'טכנולוגיה רפואית': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
    'גנטיקה': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 15c6.667-6 13.333 0 20-6"/><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"/><path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"/></svg>'
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
      updateStats(articles.length);
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

    if (categoryEl) {
      categoryEl.innerHTML = `${CATEGORY_SVG[article.category] || ''} ${article.category}`;
    }
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
        <a href="article.html?id=${article.id}" class="block p-5 md:p-6 flex flex-col h-full">
          <!-- Category with SVG icon -->
          <span class="card-category">
            ${CATEGORY_SVG[article.category] || ''}
            ${article.category}
          </span>

          <!-- Title — larger -->
          <h3 class="card-title">${article.title}</h3>

          <!-- Summary -->
          <p class="card-summary mt-1 line-clamp-3 flex-1">${article.summary}</p>

          <!-- Bottom Line mini -->
          ${article.bottomLine ? `
          <div class="card-bottom-line">
            <p class="flex items-start gap-1.5">
              <svg class="flex-shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B8F71" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>${article.bottomLine}</span>
            </p>
          </div>
          ` : ''}

          <!-- Footer -->
          <div class="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
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

  function updateStats(total) {
    const statEl = document.getElementById('stat-total');
    if (statEl) statEl.textContent = total;
  }

  document.addEventListener('DOMContentLoaded', loadFeed);

})();
