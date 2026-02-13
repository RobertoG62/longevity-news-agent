/* ============================================
   חיים ארוכים — Main JS
   Navbar, Mobile Menu, Scroll Reveal
   ============================================ */

(function () {
  'use strict';

  // ── Navbar scroll state ──────────────────
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 30);
    });
  }

  // ── Mobile hamburger menu ────────────────
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('open');
    });

    // Close menu on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('open');
      });
    });
  }

  // ── Scroll Reveal ────────────────────────
  function initScrollReveal() {
    const elements = document.querySelectorAll('[data-animate]:not(.revealed)');
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('revealed');
          }, index * 80);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    elements.forEach(el => observer.observe(el));
  }

  // Expose globally so feed.js can re-init after rendering
  window.initScrollReveal = initScrollReveal;

  document.addEventListener('DOMContentLoaded', initScrollReveal);

})();
