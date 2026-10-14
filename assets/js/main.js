/* Vitor Alves | comportamento do site: idioma, tema, menu, navegação, cookies e impressão. */
(function () {
    'use strict';

    var root = document.documentElement;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    var langBusy = false;
    function swapLang(next) {
        next = next === 'en' ? 'en' : 'pt';
        if (next === lang || langBusy) return;
        if (reduceMotion) { setLang(next, true); return; }
        langBusy = true;
        document.querySelectorAll('.seg-btn').forEach(function (b) {
            b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === next));
        });
        root.classList.add('lang-out');
        setTimeout(function () {
            setLang(next, true);
            requestAnimationFrame(function () {
                root.classList.remove('lang-out');
                setTimeout(function () { langBusy = false; }, 200);
            });
        }, 180);
    }

    function initialLang() {
        var saved = store('siteLang');
        if (saved === 'pt' || saved === 'en') return saved;
        /* Padrão sempre em português (idioma do HTML). Não detectamos o idioma do navegador:
           o robô do Google navega em inglês e acabava indexando a versão EN. */
        return 'pt';
    }

    document.querySelectorAll('.seg-btn').forEach(function (b) {
        b.addEventListener('click', function () { swapLang(b.getAttribute('data-lang')); });
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
            var apply = function () { root.setAttribute('data-theme', next); store('theme', next); };
            themeBtn.classList.remove('is-spin');
            void themeBtn.offsetWidth;
            themeBtn.classList.add('is-spin');
            themeBtn.addEventListener('animationend', function done(e) {
                if (e.target.tagName === 'svg') { themeBtn.classList.remove('is-spin'); themeBtn.removeEventListener('animationend', done); }
            });
            if (reduceMotion) { apply(); }
            else if (document.startViewTransition) { document.startViewTransition(apply); }
            else {
                root.classList.add('theme-anim');
                apply();
                setTimeout(function () { root.classList.remove('theme-anim'); }, 450);
            }
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

    var menuTimer = null, menuDone = null;
    function cancelMenuClose() {
        if (menuTimer) { clearTimeout(menuTimer); menuTimer = null; }
        if (menuDone) { nav.removeEventListener('animationend', menuDone); menuDone = null; }
    }

    function setMenu(open, returnFocus) {
        if (!menuBtn || !nav) return;
        var wasOpen = menuBtn.getAttribute('aria-expanded') === 'true';
        menuBtn.setAttribute('aria-expanded', String(open));
        cancelMenuClose();
        if (open) {
            nav.classList.remove('is-closing');
            nav.classList.add('is-open');
        } else if (wasOpen && !reduceMotion) {
            nav.classList.add('is-closing');
            menuDone = function (e) {
                if (e && e.target !== nav) return;
                cancelMenuClose();
                nav.classList.remove('is-open', 'is-closing');
            };
            nav.addEventListener('animationend', menuDone);
            menuTimer = setTimeout(menuDone, 260);
        } else {
            nav.classList.remove('is-open', 'is-closing');
        }
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
        hideBanner();
    }

    function hideBanner() {
        if (!banner || banner.hidden) return;
        if (reduceMotion) { banner.hidden = true; return; }
        banner.classList.add('is-leaving');
        setTimeout(function () { banner.hidden = true; banner.classList.remove('is-leaving'); }, 270);
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

    /* ---------- Vinheta ao escolher uma seção no menu ---------- */
    var vignette = null;
    var vignetteBusy = false;

    if (nav && !reduceMotion) {
        vignette = document.createElement('div');
        vignette.className = 'vignette';
        vignette.setAttribute('aria-hidden', 'true');
        vignette.innerHTML = '<svg viewBox="0 0 64 64" focusable="false"><rect class="v-bg" width="64" height="64" rx="14"/><path class="v-mark" d="M16 20l16 28 16-28"/></svg>';
        document.body.appendChild(vignette);

        nav.addEventListener('click', function (e) {
            var a = e.target.closest('a[href^="#"]');
            if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
            var target = document.querySelector(a.getAttribute('href'));
            if (!target) return;
            e.preventDefault();
            if (vignetteBusy) return;
            vignetteBusy = true;
            setMenu(false);
            vignette.classList.add('is-on');

            setTimeout(function () {
                target.scrollIntoView({ behavior: 'instant', block: 'start' });
                try { history.pushState(null, '', a.getAttribute('href')); } catch (err) {}
                target.setAttribute('tabindex', '-1');
                target.focus({ preventScroll: true });
                spy();
                setTimeout(function () {
                    vignette.classList.remove('is-on');
                    setTimeout(function () { vignetteBusy = false; }, 260);
                }, 260);
            }, 460);
        });
    }

    /* ---------- Transições de entrada ---------- */
    if (root.classList.contains('js') && 'IntersectionObserver' in window) {
        var targets = document.querySelectorAll('.hero-copy, .hero-side, .split > h2, .split-body > *, .pillar, .project, .company, .cert-group, .skill-group, .contact-list li');
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) {
                    var t = e.target;
                    t.classList.add('is-in');
                    io.unobserve(t);
                    t.addEventListener('transitionend', function clear(ev) {
                        if (ev.target === t && ev.propertyName === 'opacity') { t.style.removeProperty('--d'); t.removeEventListener('transitionend', clear); }
                    });
                }
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
        targets.forEach(function (el) {
            var idx = Array.prototype.indexOf.call(el.parentNode.children, el);
            el.style.setProperty('--d', Math.min(idx, 4) * 80 + 'ms');
            el.classList.add('reveal');
            io.observe(el);
        });
    }

    /* ---------- Foto ampliada (abre a partir da miniatura) ---------- */
    var portraitBtn = document.getElementById('portraitBtn');
    if (portraitBtn) {
        var thumb = portraitBtn.querySelector('img');
        var box = null, big = null, closeBtn = null, closing = false;

        var text = function (key, pt) { return lang === 'en' && EN[key] ? EN[key] : pt; };
        var flip = function (from, to) {
            var s = from.width / to.width;
            return { transform: 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px) scale(' + s + ')', borderRadius: (16 / s) + 'px' };
        };

        var openPhoto = function () {
            if (box) return;
            var from = thumb.getBoundingClientRect();

            box = document.createElement('div');
            box.className = 'lightbox';
            box.setAttribute('role', 'dialog');
            box.setAttribute('aria-modal', 'true');
            box.setAttribute('aria-label', text('hero.zoomTitle', 'Foto de Vitor Alves'));

            big = document.createElement('img');
            big.className = 'lightbox-img';
            big.alt = thumb.alt;
            big.src = thumb.currentSrc || thumb.src;
            var hi = new Image();
            hi.onload = function () { if (big) big.src = 'perfil.jpg'; };
            hi.src = 'perfil.jpg';

            var cap = document.createElement('p');
            cap.className = 'lightbox-cap';
            cap.textContent = 'Vitor Ivo Santiago Alves';

            closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'lightbox-close';
            closeBtn.setAttribute('aria-label', text('hero.zoomClose', 'Fechar foto'));
            closeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';

            box.appendChild(big); box.appendChild(cap); box.appendChild(closeBtn);

            var sw = window.innerWidth - root.clientWidth;
            root.style.overflow = 'hidden';
            if (sw > 0) document.body.style.paddingRight = sw + 'px';

            document.body.appendChild(box);
            var to = big.getBoundingClientRect();
            portraitBtn.style.visibility = 'hidden';
            requestAnimationFrame(function () { box.classList.add('is-open'); });
            if (!reduceMotion && big.animate) {
                var a = flip(from, to);
                big.animate([a, { transform: 'none', borderRadius: '20px' }], { duration: 480, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' });
            }
            closeBtn.focus();

            box.addEventListener('click', function (e) { if (e.target !== big) closePhoto(); });
            track('event', 'open_photo');
        };

        var closePhoto = function () {
            if (!box || closing) return;
            closing = true;
            var to = big.getBoundingClientRect();
            var from = thumb.getBoundingClientRect();
            box.classList.remove('is-open');
            var done = function () {
                box.remove(); box = null; big = null; closeBtn = null; closing = false;
                portraitBtn.style.visibility = '';
                root.style.overflow = '';
                document.body.style.paddingRight = '';
                portraitBtn.focus();
            };
            if (!reduceMotion && big.animate) {
                var anim = big.animate([{ transform: 'none', borderRadius: '20px' }, flip(from, to)], { duration: 380, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' });
                anim.onfinish = done;
            } else {
                done();
            }
        };

        portraitBtn.addEventListener('click', openPhoto);
        document.addEventListener('keydown', function (e) {
            if (!box) return;
            if (e.key === 'Escape') { e.preventDefault(); closePhoto(); }
            else if (e.key === 'Tab') { e.preventDefault(); if (closeBtn) closeBtn.focus(); }
        });
    }

    /* ---------- Início ---------- */
    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();

    setLang(initialLang(), false);
    spy();
})();
