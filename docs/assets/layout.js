(function () {
  'use strict';

  var SPROUT_SVG =
    '<svg class="docs-sprout" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3"/>' +
    '<path d="M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4"/>' +
    '<path d="M5 21h14"/>' +
    '</svg>';

  var SEARCH_ICON =
    '<svg class="docs-search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';

  function getBasePath() {
    var path = window.location.pathname;
    var parts = path.split('/').filter(Boolean);
    var docsIdx = -1;
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] === 'docs') { docsIdx = i; break; }
    }
    if (docsIdx === -1) {
      var last = parts[parts.length - 1] || '';
      var isFile = last.indexOf('.') !== -1;
      var fallbackDepth = isFile ? parts.length - 1 : parts.length;
      if (fallbackDepth <= 0) return '';
      var fb = '';
      for (var k = 0; k < fallbackDepth; k++) fb += '../';
      return fb;
    }
    var depth = parts.length - docsIdx - 2;
    if (depth <= 0) return '';
    var base = '';
    for (var j = 0; j < depth; j++) base += '../';
    return base;
  }

  function resolveHref(href, base) {
    if (!href || /^https?:\/\//.test(href) || href.startsWith('#')) return href;
    return base + href;
  }

  function getCurrentRelativePath() {
    var path = window.location.pathname;
    var marker = '/docs/';
    var idx = path.indexOf(marker);
    if (idx !== -1) {
      return path.slice(idx + marker.length) || 'index.html';
    }
    var parts = path.split('/').filter(Boolean);
    var docsIdx = -1;
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] === 'docs') { docsIdx = i; break; }
    }
    if (docsIdx !== -1) {
      return parts.slice(docsIdx + 1).join('/') || 'index.html';
    }
    return parts[parts.length - 1] || 'index.html';
  }

  function normalizePath(p) {
    if (!p) return '';
    p = p.split('?')[0].split('#')[0];
    if (p.endsWith('/index.html')) p = p.slice(0, -10);
    else if (p === 'index.html') p = '';
    else if (p.endsWith('.html') === false && p.endsWith('/') === false && p !== '') p += '/';
    if (p.endsWith('/') && p.length > 1) { /* keep trailing slash for dirs */ }
    return p;
  }

  function isLinkActive(linkHref, currentPath) {
    var a = normalizePath(linkHref);
    var b = normalizePath(currentPath);
    if (a === b) return true;
    if (a && b && (a === b + 'index.html' || b === a + 'index.html')) return true;
    if (a.replace(/\/$/, '') === b.replace(/\/$/, '')) return true;
    return false;
  }

  function flattenNav(config) {
    var items = [];
    if (!config) return items;
    if (config.tree) {
      config.tree.forEach(function (group) {
        if (group.href) {
          items.push({ href: group.href, label: group.title, section: group.id });
        }
        (group.links || []).forEach(function (link) {
          items.push({ href: link.href, label: link.label, section: group.id });
        });
      });
      return items;
    }
    Object.keys(config.sections || {}).forEach(function (key) {
      (config.sections[key].groups || []).forEach(function (group) {
        (group.links || []).forEach(function (link) {
          items.push({ href: link.href, label: link.label, section: key });
        });
      });
    });
    return items;
  }

  function uniqueNav(items) {
    var seen = {};
    var out = [];
    items.forEach(function (item) {
      var key = normalizePath(item.href);
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(item);
    });
    return out;
  }

  function initTheme() {
    var stored = localStorage.getItem('nabta-docs-theme');
    var theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    return theme;
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') || 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('nabta-docs-theme', next);
    var btn = document.getElementById('theme-toggle');
    if (btn) btn.setAttribute('aria-label', next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
  }

  function ensureHeadingIds(main) {
    var used = {};
    main.querySelectorAll('h2, h3').forEach(function (h) {
      if (h.closest('.related-links')) return;
      if (!h.id) {
        var base = slugify(h.textContent);
        var id = base;
        var n = 2;
        while (used[id] || document.getElementById(id)) {
          id = base + '-' + n;
          n += 1;
        }
        h.id = id;
      }
      used[h.id] = true;
    });
  }

  function buildBrandInner(brand, extraClass) {
    var cls = extraClass ? ' docs-sprout ' + extraClass : 'docs-sprout';
    var svg = SPROUT_SVG.replace('class="docs-sprout"', 'class="' + cls.trim() + '"');
    return svg +
      '<span class="docs-brand-text">' +
      '<span class="docs-brand-name docs-topnav-name">' + brand.name + '</span>' +
      '<span class="docs-brand-arabic docs-topnav-arabic">' + brand.arabic + '</span>' +
      '</span>';
  }

  function buildSidebar(section, base) {
    var config = window.NABTA_NAV;
    if (!config) return '';
    var brand = config.brand;
    var currentPath = getCurrentRelativePath();
    var tree = config.tree;
    var html = '';

    html += '<div class="docs-sidebar-header">';
    html += '<a href="' + resolveHref('index.html', base) + '" class="docs-brand">';
    html += buildBrandInner(brand);
    html += '</a>';
    html += '<div class="docs-sidebar-search">';
    html += SEARCH_ICON;
    html += '<input type="search" id="docs-search-input" class="docs-search-input" placeholder="Search…" autocomplete="off" aria-label="Search documentation">';
    html += '<kbd class="docs-search-kbd">⌘K</kbd>';
    html += '<div id="docs-search-results" class="docs-search-results" hidden role="listbox"></div>';
    html += '</div>';
    html += '</div>';

    html += '<nav class="docs-nav" aria-label="Documentation">';
    html += '<div class="docs-nav-section">';
    html += '<a href="' + resolveHref('index.html', base) + '"' +
      (isLinkActive('index.html', currentPath) ? ' class="active"' : '') + '>Home</a>';
    html += '</div>';

    if (tree) {
      tree.forEach(function (group) {
        var open = group.id === section || group.id === 'home';
        if (!open && (group.links || []).some(function (l) { return isLinkActive(l.href, currentPath); })) {
          open = true;
        }
        html += '<details class="docs-nav-section"' + (open ? ' open' : '') + '>';
        html += '<summary>' + group.title + '</summary>';
        if (group.href) {
          html += '<a href="' + resolveHref(group.href, base) + '"' +
            (isLinkActive(group.href, currentPath) ? ' class="active"' : '') + '>Overview</a>';
        }
        (group.links || []).forEach(function (link) {
          var href = resolveHref(link.href, base);
          var active = isLinkActive(link.href, currentPath);
          html += '<a href="' + href + '"' + (active ? ' class="active"' : '') + '>' + link.label + '</a>';
        });
        html += '</details>';
      });
    }
    html += '</nav>';
    html += '<div class="docs-sidebar-footer">';
    html += '<button type="button" id="theme-toggle" class="theme-toggle" aria-label="Toggle dark mode">';
    html += '<span class="theme-icon-light" aria-hidden="true">☀</span><span class="theme-icon-dark" aria-hidden="true">☾</span>';
    html += '</button>';
    html += '</div>';
    return html;
  }

  function buildBreadcrumbs(section, pageTitle, base) {
    var config = window.NABTA_NAV;
    if (!config || section === 'home') return '';

    var crumbs = [];
    if (config.breadcrumbs && config.breadcrumbs[section]) {
      crumbs = config.breadcrumbs[section].slice();
    } else {
      crumbs = [{ label: 'Home', href: 'index.html' }];
      var group = (config.tree || []).find(function (g) { return g.id === section; });
      if (group) crumbs.push({ label: group.title, href: group.href || null });
    }

    if (pageTitle && getCurrentRelativePath() !== 'index.html' &&
        !(config.tree || []).some(function (g) { return isLinkActive(g.href, getCurrentRelativePath()); })) {
      crumbs.push({ label: pageTitle, href: null });
    }

    var html = '<nav class="docs-breadcrumbs" aria-label="Breadcrumb"><ol>';
    crumbs.forEach(function (crumb, i) {
      var isLast = i === crumbs.length - 1;
      html += '<li>';
      if (crumb.href && !isLast) {
        html += '<a href="' + resolveHref(crumb.href, base) + '">' + crumb.label + '</a>';
      } else {
        html += '<span aria-current="page">' + crumb.label + '</span>';
      }
      html += '</li>';
    });
    html += '</ol></nav>';
    return html;
  }

  function sectionLabel(section) {
    var labels = {
      home: 'Docs',
      business: 'Business',
      requirements: 'Requirements',
      design: 'Design',
      technical: 'Technical',
      roadmap: 'Roadmap',
      reqs: 'Requirements',
      phases: 'Roadmap',
      architecture: 'Technical',
      overview: 'Business'
    };
    return labels[section] || (section.charAt(0).toUpperCase() + section.slice(1));
  }

  function badgeClass(section) {
    if (section === 'roadmap' || section === 'phases') return 'badge badge-phase';
    if (section === 'technical' || section === 'architecture') return 'badge badge-arch';
    return 'badge';
  }

  function buildPageHeader(section, pageTitle) {
    if (section === 'home' || !pageTitle) return '';
    return '<div class="docs-page-header-inner"><span class="' + badgeClass(section) + '">' + sectionLabel(section) + '</span></div>';
  }

  function buildToc(main) {
    var headings = [];
    main.querySelectorAll('h2, h3').forEach(function (h) {
      if (h.closest('.related-links') || h.closest('.docs-hero')) return;
      if (!h.id) return;
      headings.push({ id: h.id, text: h.textContent, level: h.tagName.toLowerCase() });
    });
    if (headings.length === 0) return '<nav class="docs-toc docs-toc-empty" aria-label="On this page"></nav>';
    var html = '<nav class="docs-toc" aria-label="On this page">';
    html += '<p class="docs-toc-title">On this page</p><ul>';
    headings.forEach(function (h) {
      html += '<li><a href="#' + h.id + '" class="docs-toc-' + h.level + '" data-toc-id="' + h.id + '">' + h.text + '</a></li>';
    });
    html += '</ul></nav>';
    return html;
  }

  function initTocSpy() {
    var links = document.querySelectorAll('.docs-toc a[data-toc-id]');
    if (!links.length) return;
    var headings = [];
    links.forEach(function (a) {
      var el = document.getElementById(a.getAttribute('data-toc-id'));
      if (el) headings.push({ el: el, a: a });
    });
    function update() {
      var current = headings[0];
      var offset = 96;
      headings.forEach(function (h) {
        if (h.el.getBoundingClientRect().top <= offset) current = h;
      });
      links.forEach(function (a) { a.classList.remove('active'); });
      if (current) current.a.classList.add('active');
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  function buildPager(base) {
    var config = window.NABTA_NAV;
    var items = uniqueNav(flattenNav(config));
    var current = getCurrentRelativePath();
    var idx = -1;
    for (var i = 0; i < items.length; i++) {
      if (isLinkActive(items[i].href, current)) { idx = i; break; }
    }
    if (idx === -1) return '';
    var prev = idx > 0 ? items[idx - 1] : null;
    var next = idx < items.length - 1 ? items[idx + 1] : null;
    var html = '<nav class="docs-pager" aria-label="Page">';
    if (prev) {
      html += '<a href="' + resolveHref(prev.href, base) + '"><span class="docs-pager-label">Previous</span><span class="docs-pager-title">' + prev.label + '</span></a>';
    } else {
      html += '<a class="docs-pager-placeholder" tabindex="-1" aria-hidden="true"></a>';
    }
    if (next) {
      html += '<a class="docs-pager-next" href="' + resolveHref(next.href, base) + '"><span class="docs-pager-label">Next</span><span class="docs-pager-title">' + next.label + '</span></a>';
    } else {
      html += '<a class="docs-pager-placeholder" tabindex="-1" aria-hidden="true"></a>';
    }
    html += '</nav>';
    return html;
  }

  function collectSearchIndex() {
    var config = window.NABTA_NAV;
    var items = uniqueNav(flattenNav(config));
    var main = document.getElementById('main');
    if (main) {
      main.querySelectorAll('h2, h3').forEach(function (h) {
        if (h.closest('.related-links')) return;
        items.push({
          href: '#' + h.id,
          label: h.textContent,
          section: 'On this page',
          local: true
        });
      });
    }
    return items;
  }

  function initSearch(base) {
    var input = document.getElementById('docs-search-input');
    var results = document.getElementById('docs-search-results');
    if (!input || !results) return;
    var index = collectSearchIndex();

    function hide() {
      results.hidden = true;
      results.innerHTML = '';
    }

    function show(query) {
      var q = query.trim().toLowerCase();
      if (!q) { hide(); return; }
      var matches = index.filter(function (item) {
        return item.label.toLowerCase().indexOf(q) !== -1 ||
          (item.section && String(item.section).toLowerCase().indexOf(q) !== -1);
      }).slice(0, 12);
      if (matches.length === 0) {
        results.innerHTML = '<div class="docs-search-empty">No matches</div>';
        results.hidden = false;
        return;
      }
      results.innerHTML = matches.map(function (item, i) {
        var href = item.local ? item.href : resolveHref(item.href, base);
        var meta = item.local ? 'On this page' : (item.section || '');
        return '<a href="' + href + '" role="option" aria-selected="' + (i === 0 ? 'true' : 'false') + '">' +
          item.label + (meta ? '<span class="docs-search-meta">' + meta + '</span>' : '') + '</a>';
      }).join('');
      results.hidden = false;
    }

    input.addEventListener('input', function () { show(input.value); });
    input.addEventListener('focus', function () { if (input.value) show(input.value); });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.docs-sidebar-search')) hide();
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { hide(); input.blur(); }
      if (e.key === 'Enter') {
        var first = results.querySelector('a');
        if (first) { e.preventDefault(); first.click(); }
      }
    });

    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
  }

  function initMobileNav() {
    var toggle = document.getElementById('sidebar-toggle');
    var sidebar = document.getElementById('docs-sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    if (!toggle || !sidebar) return;

    function close() {
      sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    toggle.addEventListener('click', function () {
      var open = sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    if (overlay) overlay.addEventListener('click', close);
    sidebar.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', close);
    });
  }

  function injectHeroSprout() {
    var hero = document.querySelector('.docs-hero');
    if (!hero) return;
    if (hero.querySelector('.docs-sprout, .docs-sprout-icon')) return;
    var brand = hero.querySelector('.docs-hero-brand');
    if (brand) {
      brand.insertAdjacentHTML('afterbegin', SPROUT_SVG.replace('class="docs-sprout"', 'class="docs-sprout docs-sprout-xl"'));
    }
  }

  function removeTopNav() {
    var existing = document.getElementById('docs-topnav');
    if (existing) existing.remove();
  }

  function ensureSidebarOverlay() {
    if (document.getElementById('sidebar-overlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay';
    var layout = document.querySelector('.docs-layout');
    if (layout && layout.parentNode) {
      layout.parentNode.insertBefore(overlay, layout);
    } else {
      document.body.appendChild(overlay);
    }
  }

  function ensureMobileBar() {
    var bar = document.querySelector('.docs-mobile-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'docs-mobile-bar';
      var skip = document.querySelector('.skip-link');
      if (skip && skip.nextSibling) {
        skip.parentNode.insertBefore(bar, skip.nextSibling);
      } else {
        document.body.insertBefore(bar, document.body.firstChild);
      }
    }
    bar.innerHTML = '<button type="button" id="sidebar-toggle" class="sidebar-toggle" aria-expanded="false" aria-label="Open menu">&#9776;</button><span class="docs-mobile-title">Docs</span>';
  }

  function init() {
    var body = document.body;
    var section = body.getAttribute('data-section') || 'home';
    if (section === 'reqs') section = 'requirements';
    if (section === 'phases') section = 'roadmap';
    if (section === 'architecture') section = 'technical';
    if (section === 'overview') section = 'business';
    var pageTitle = body.getAttribute('data-title') || '';
    var base = getBasePath();

    initTheme();
    removeTopNav();
    ensureMobileBar();
    ensureSidebarOverlay();

    var sidebar = document.getElementById('docs-sidebar');
    if (sidebar) sidebar.innerHTML = buildSidebar(section, base);

    var header = document.getElementById('docs-header');
    if (header) {
      header.innerHTML = buildBreadcrumbs(section, pageTitle, base) + buildPageHeader(section, pageTitle);
    }

    var main = document.getElementById('main');
    if (main) {
      ensureHeadingIds(main);
      var tocHtml = buildToc(main);
      var existingToc = document.getElementById('docs-toc');
      if (existingToc) {
        existingToc.outerHTML = tocHtml;
      } else {
        main.insertAdjacentHTML('afterend', tocHtml);
      }
      var pagerHtml = buildPager(base);
      var existingPager = document.getElementById('docs-pager');
      var tocEl = document.querySelector('.docs-toc');
      if (existingPager) {
        existingPager.outerHTML = pagerHtml;
      } else if (tocEl) {
        tocEl.insertAdjacentHTML('afterend', pagerHtml);
      } else {
        main.insertAdjacentHTML('afterend', pagerHtml);
      }
    }

    injectHeroSprout();

    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    initMobileNav();
    initSearch(base);
    initTocSpy();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
