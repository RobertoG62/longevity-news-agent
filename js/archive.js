/* ============================================
   חיים ארוכים — Archive Page
   All articles with search + category filter
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

  let allArticles = [];
  let activeCategory = 'הכל';

  async function loadArchive() {
    try {
      const response = await fetch('content/articles.json');
      allArticles = await response.json();
      renderArticles(allArticles);
      setupFilters();
      setupSearch();
    } catch (error) {
      console.error('Failed to load archive:', error);
    }
  }

  function renderArticles(articles) {
    const grid = document.getElementById('archive-grid');
    if (!grid) return;

    if (articles.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <h3 class="text-lg font-bold mb-1">לא נמצאו כתבות</h3>
          <p>נסו לשנות את החיפוש או הקטגוריה</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = articles.map(article => {
      const catClass = 'cat-' + article.category.replace(/\s+/g, '-');
      return `
        <article class="article-card ${catClass}" data-animate>
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
      `;
    }).join('');

    if (window.initScrollReveal) window.initScrollReveal();
  }

  function setupFilters() {
    const filterContainer = document.getElementById('category-filters');
    if (!filterContainer) return;

    const buttons = filterContainer.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.dataset.category;
        applyFilters();
      });
    });
  }

  function setupSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(applyFilters, 250);
    });
  }

  function applyFilters() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    let filtered = allArticles;

    if (activeCategory !== 'הכל') {
      filtered = filtered.filter(a => a.category === activeCategory);
    }

    if (query) {
      filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(query) ||
        a.summary.toLowerCase().includes(query) ||
        a.bottomLine.toLowerCase().includes(query)
      );
    }

    renderArticles(filtered);

    // Update count
    const countEl = document.getElementById('results-count');
    if (countEl) countEl.textContent = `${filtered.length} כתבות`;
  }

  document.addEventListener('DOMContentLoaded', loadArchive);

})();
