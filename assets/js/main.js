/* Vitor Alves | comportamento do site: idioma, tema, menu, navegação, cookies e impressão. */
(function () {
    'use strict';

    var root = document.documentElement;

    /* ---------- Armazenamento seguro ---------- */
    function store(key, value) {
        try {
            if (value === undefined) return localStorage.getItem(key);
            localStorage.setItem(key, value);
        } catch (e) { /* modo privado ou bloqueado */ }
        return null;
    }

    function track() {
        if (typeof window.gtag === 'function') window.gtag.apply(null, arguments);
    }

    /* ---------- Idioma ---------- */
    var EN = window.I18N_EN || {};
    var texts = [];   // { el, pt }
    var attrs = [];   // { el, attr, key, pt }
    var metaDesc = document.querySelector('meta[name="description"]');
    var PT = {
        title: document.title,
        desc: metaDesc ? metaDesc.getAttribute('content') : ''
    };
    var lang = 'pt';

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
        texts.push({ el: el, key: el.getAttribute('data-i18n'), pt: el.innerHTML });
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
        el.getAttribute('data-i18n-attr').split(',').forEach(function (pair) {
            var i = pair.indexOf(':');
            var attr = pair.slice(0, i).trim();
            var key = pair.slice(i + 1).trim();
            attrs.push({ el: el, attr: attr, key: key, pt: el.getAttribute(attr) });
        });
    });

    function setLang(next, fromUser) {
        lang = next === 'en' ? 'en' : 'pt';
        var en = lang === 'en';

        texts.forEach(function (t) {
            var v = en ? EN[t.key] : t.pt;
            if (v !== undefined) t.el.innerHTML = v;
        });
        attrs.forEach(function (a) {
            var v = en ? EN[a.key] : a.pt;
            if (v !== undefined && v !== null) a.el.setAttribute(a.attr, v);
        });

        root.lang = en ? 'en' : 'pt-BR';
        document.title = en ? EN['meta.title'] : PT.title;
        if (metaDesc) metaDesc.setAttribute('content', en ? EN['meta.desc'] : PT.desc);

        document.querySelectorAll('.seg-btn').forEach(function (b) {
            b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang));
        });
        updateMenuLabel();
        var pdf = document.getElementById('pdfBtn');
        if (pdf) pdf.setAttribute('href', en ? 'curriculo-vitor-alves-en.pdf' : 'curriculo-vitor-alves-pt.pdf');

        if (fromUser) {
            store('siteLang', lang);
            track('event', 'switch_language', { language_selected: lang });
        }
    }

    function initialLang() {
        var saved = store('siteLang');
        if (saved === 'pt' || saved === 'en') return saved;
        var nav = (navigator.language || 'pt').toLowerCase();
        return nav.indexOf('pt') === 0 ? 'pt' : (nav.indexOf('en') === 0 ? 'en' : 'pt');
    }

    document.querySelectorAll('.seg-btn').forEach(function (b) {
        b.addEventListener('click', function () { setLang(b.getAttribute('data-lang'), true); });
    });

    /* ---------- Tema ---------- */
    function effectiveTheme() {
        var t = root.getAttribute('data-theme');
        if (t === 'light' || t === 'dark') return t;
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }

    var themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', function () {
            var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
            root.setAttribute('data-theme', next);
            store('theme', next);
        });
    }

    /* ---------- Menu mobile ---------- */
    var menuBtn = document.getElementById('menuBtn');
    var nav = document.getElementById('siteNav');

    function updateMenuLabel() {
        if (!menuBtn) return;
        var open = menuBtn.getAttribute('aria-expanded') === 'true';
        var key = open ? 'menu.close' : 'menu.open';
        menuBtn.setAttribute('aria-label', lang === 'en' ? EN[key] : (open ? 'Fechar menu' : 'Abrir menu'));
    }

    function setMenu(open, returnFocus) {
        if (!menuBtn || !nav) return;
        menuBtn.setAttribute('aria-expanded', String(open));
        nav.classList.toggle('is-open', open);
        updateMenuLabel();
        if (!open && returnFocus) menuBtn.focus();
    }

    if (menuBtn && nav) {
        menuBtn.addEventListener('click', function () {
            setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
        });
        nav.addEventListener('click', function (e) {
            if (e.target.closest('a')) setMenu(false);
        });
        document.addEventListener('click', function (e) {
            if (menuBtn.getAttribute('aria-expanded') === 'true' && !e.target.closest('.site-header')) setMenu(false);
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false, true);
        });
    }

    /* ---------- Destaque da seção ativa ---------- */
    var links = nav ? Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]')) : [];
    var sections = links.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);

    function spy() {
        var y = window.scrollY + 120;
        var current = null;
        sections.forEach(function (s) { if (s.offsetTop <= y) current = s.id; });
        if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4 && sections.length) {
            current = sections[sections.length - 1].id;
        }
        links.forEach(function (a) {
            if (a.getAttribute('href') === '#' + current) a.setAttribute('aria-current', 'true');
            else a.removeAttribute('aria-current');
        });
    }
    var ticking = false;
    window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () { spy(); ticking = false; });
    }, { passive: true });
    window.addEventListener('resize', spy);

    /* ---------- Cookies (Consent Mode) ---------- */
    var banner = document.getElementById('cookieBanner');

    function setConsent(granted) {
        store('cookieConsent', granted ? 'granted' : 'denied');
        track('consent', 'update', { analytics_storage: granted ? 'granted' : 'denied' });
        if (banner) banner.hidden = true;
    }

    var decided = store('cookieConsent') || (store('cookiesAccepted') === 'true' ? 'granted' : null);
    if (banner && !decided) banner.hidden = false;

    var accept = document.getElementById('cookieAccept');
    var deny = document.getElementById('cookieDeny');
    var prefs = document.getElementById('cookiePrefs');
    if (accept) accept.addEventListener('click', function () { setConsent(true); });
    if (deny) deny.addEventListener('click', function () { setConsent(false); });
    if (prefs) prefs.addEventListener('click', function () {
        if (!banner) return;
        banner.hidden = false;
        if (accept) accept.focus();
    });

    /* ---------- PDF (download) ---------- */
    var pdfBtn = document.getElementById('pdfBtn');
    if (pdfBtn) {
        pdfBtn.addEventListener('click', function () {
            track('event', 'generate_pdf', { event_category: 'Engagement', event_label: 'PDF Download' });
        });
    }

    /* ---------- Início ---------- */
    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    setLang(initialLang(), false);
    spy();
})();
