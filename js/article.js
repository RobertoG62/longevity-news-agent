/* ============================================
   חיים ארוכים — Single Article Page
   Loads article by ?id= param from articles.json
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

  async function loadArticle() {
    const params = new URLSearchParams(window.location.search);
    const articleId = params.get('id');

    if (!articleId) {
      showNotFound();
      return;
    }

    try {
      const response = await fetch('content/articles.json');
      const articles = await response.json();
      const article = articles.find(a => a.id === articleId);

      if (!article) {
        showNotFound();
        return;
      }

      renderArticle(article);
      renderRelated(articles.filter(a => a.id !== articleId).slice(0, 3));
      document.title = `${article.title} — חיים ארוכים`;
    } catch (error) {
      console.error('Failed to load article:', error);
      showNotFound();
    }
  }

  function renderArticle(article) {
    const container = document.getElementById('article-container');
    if (!container) return;

    container.innerHTML = `
      <!-- Category Badge -->
      <div class="mb-4">
        <span class="inline-block bg-green-50 text-green-800 text-sm font-medium px-3 py-1 rounded">
          ${CATEGORY_ICONS[article.category] || ''} ${article.category}
        </span>
      </div>

      <!-- Title -->
      <h1 class="font-serif text-3xl md:text-4xl leading-tight font-bold text-gray-900 mb-4" style="font-family: var(--font-heading);">
        ${article.title}
      </h1>

      <!-- Meta -->
      <div class="flex items-center gap-4 text-sm text-gray-500 mb-8 pb-6 border-b border-gray-200">
        <time>${article.publishDate}</time>
        <span class="text-gray-300">|</span>
        <span>זמן קריאה: 3 דקות</span>
      </div>

      <!-- Summary/Body -->
      <div class="article-body mb-8">
        <p>${article.summary}</p>
      </div>

      <!-- Bottom Line Box -->
      <div class="bottom-line-box" data-animate>
        <div class="label flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          השורה התחתונה
        </div>
        <p class="text">${article.bottomLine}</p>
      </div>

      <!-- Source Link -->
      <div class="mt-8 pt-6 border-t border-gray-200">
        <a href="${article.sourceUrl}" target="_blank" rel="noopener noreferrer" class="source-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          למקור המחקר המקורי
        </a>
      </div>
    `;

    if (window.initScrollReveal) window.initScrollReveal();
  }

  function renderRelated(articles) {
    const container = document.getElementById('related-articles');
    if (!container || !articles.length) return;

    container.innerHTML = articles.map(article => `
      <a href="article.html?id=${article.id}" class="article-card block" data-animate>
        <div class="p-5">
          <span class="card-category text-xs">${CATEGORY_ICONS[article.category] || ''} ${article.category}</span>
          <h3 class="card-title text-base mt-1">${article.title}</h3>
          <span class="card-date text-xs mt-2 block">${article.publishDate}</span>
        </div>
      </a>
    `).join('');

    if (window.initScrollReveal) window.initScrollReveal();
  }

  function showNotFound() {
    const container = document.getElementById('article-container');
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
        <h2 class="text-xl font-bold mb-2">הכתבה לא נמצאה</h2>
        <p>ייתכן שהכתבה הוסרה או שהקישור שגוי.</p>
        <a href="index.html" class="inline-block mt-4 text-green-700 font-medium hover:underline">חזרה לעמוד הראשי</a>
      </div>
    `;
  }

  document.addEventListener('DOMContentLoaded', loadArticle);

})();
