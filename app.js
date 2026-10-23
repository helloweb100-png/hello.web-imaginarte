/* ══════════════════════════════════════════════════════════════
   IMAGINAR'T · Interacciones y animaciones
   Dependencias (CDN, con degradación elegante si no cargan):
   GSAP + ScrollTrigger (scroll-scrub y pines) · Lenis (scroll suave)
   ══════════════════════════════════════════════════════════════ */
(() => {
    'use strict';

    /* ─────────── Utilidades y entorno ─────────── */
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => [...c.querySelectorAll(s)];
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const root = document.documentElement;
    const body = document.body;

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasGSAP = !!(window.gsap && window.ScrollTrigger);
    const motion = hasGSAP && !reduce;           // animaciones pesadas (pines, scrub)
    const WA_NUMBER = (body.dataset.waNumber || '').replace(/\D/g, '');
    const WA_PLACEHOLDER = '520000000000';

    if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
    if (motion) root.classList.add('gsap');
    if (WA_NUMBER === WA_PLACEHOLDER) {
        console.warn("Imaginar't: falta configurar el número de WhatsApp real en <body data-wa-number>.");
    }

    let lenis = null;

    /* Bloquea o libera el scroll (loader, menú, lightbox) */
    function lockScroll(on) {
        body.classList.toggle('is-locked', on);
        if (lenis) { on ? lenis.stop() : lenis.start(); }
    }

    /* ─────────── WhatsApp ─────────── */
    const waLink = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
    function setWa(el, text) {
        el.dataset.wa = text;
        el.href = waLink(text);
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
    }
    function initWhatsApp() {
        $$('[data-wa]').forEach((el) => setWa(el, el.dataset.wa));
        const disp = $('[data-wa-display]');
        if (disp && WA_NUMBER !== WA_PLACEHOLDER && WA_NUMBER) disp.textContent = '+' + WA_NUMBER;
    }

    /* ─────────── Texto dividido en palabras ─────────── */
    function wrapWords(node, make, counter) {
        [...node.childNodes].forEach((child) => {
            if (child.nodeType === 3) {
                const frag = document.createDocumentFragment();
                child.textContent.split(/(\s+)/).forEach((part) => {
                    if (!part) return;
                    if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                    frag.appendChild(make(part, counter.n++));
                });
                child.replaceWith(frag);
            } else if (child.nodeType === 1) {
                wrapWords(child, make, counter);
            }
        });
    }
    function splitHeading(el) {
        wrapWords(el, (word, i) => {
            const sw = document.createElement('span');
            sw.className = 'sw';
            const si = document.createElement('span');
            si.className = 'sw__in';
            si.style.setProperty('--w', i);
            si.textContent = word;
            sw.appendChild(si);
            return sw;
        }, { n: 0 });
    }
    function splitScrub(el) {
        wrapWords(el, (word) => {
            const s = document.createElement('span');
            s.className = 'mw';
            s.textContent = word;
            return s;
        }, { n: 0 });
    }

    /* ─────────── Reveal con IntersectionObserver ─────────── */
    function initReveals() {
        $$('[data-split]').forEach(splitHeading);
        const targets = $$('[data-reveal], [data-split]');
        if (!('IntersectionObserver' in window)) { targets.forEach((t) => t.classList.add('is-in')); return; }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
                if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
            });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
        targets.forEach((t) => io.observe(t));
    }

    /* ─────────── Color de fondo que cambia por sección ─────────── */
    function setPageBg(c) { root.style.setProperty('--page-bg', c); }
    function initPageBg() {
        const hero = $('#inicio'); const cine = $('#cine');
        if (hero) hero.dataset.bg = '#FFFBF2';
        if (cine) cine.dataset.bg = '#FFFBF2';
        const secs = $$('[data-bg]');
        if (!('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => { if (e.isIntersecting) setPageBg(e.target.dataset.bg); });
        }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
        secs.forEach((s) => io.observe(s));
    }

    /* ─────────── Scroll suave (Lenis) y anclas ─────────── */
    function initSmoothScroll() {
        if (motion && window.Lenis && finePointer) {
            lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((t) => lenis.raf(t * 1000));
            gsap.ticker.lagSmoothing(0);
            lenis.stop(); // se libera cuando termina el loader
        }
        const headerOffset = () => (innerWidth >= 1024 ? 76 : 68) - 4;
        function goTo(target) {
            if (lenis) lenis.scrollTo(target, { offset: -headerOffset(), duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
            else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        }
        document.addEventListener('click', (e) => {
            const a = e.target.closest('a[href^="#"]');
            if (!a || a.target === '_blank') return;
            const id = a.getAttribute('href');
            if (id.length < 2) return;
            const target = $(id);
            if (!target) return;
            e.preventDefault();
            closeMenu();
            goTo(target);
            const key = a.dataset.occLink;
            if (key && window.__selectOcc) setTimeout(() => window.__selectOcc(key, true), 900);
        });
    }

    /* ─────────── Header, progreso y menú ─────────── */
    let menuEl, burger;
    function closeMenu() {
        if (!menuEl || !menuEl.classList.contains('is-open')) return;
        menuEl.classList.remove('is-open');
        menuEl.setAttribute('aria-hidden', 'true');
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Abrir menú');
        lockScroll(false);
    }
    function initHeader() {
        const header = $('#site-header');
        menuEl = $('#menu'); burger = $('#burger');

        // Estado "sólido" del header con un centinela
        const sentinel = document.createElement('div');
        sentinel.style.cssText = 'position:absolute;top:50px;left:0;width:1px;height:1px;pointer-events:none';
        body.prepend(sentinel);
        new IntersectionObserver(([e]) => header.classList.toggle('is-solid', !e.isIntersecting)).observe(sentinel);

        burger.addEventListener('click', () => {
            const open = !menuEl.classList.contains('is-open');
            menuEl.classList.toggle('is-open', open);
            menuEl.setAttribute('aria-hidden', String(!open));
            burger.setAttribute('aria-expanded', String(open));
            burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
            lockScroll(open);
        });
        addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
        addEventListener('resize', () => { if (innerWidth >= 1024) closeMenu(); });

        // Barra de progreso de lectura
        const bar = $('.progress i');
        if (motion) {
            gsap.to(bar, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
        } else if (bar) {
            // Respaldo sin GSAP: un único listener pasivo con rAF
            let ticking = false;
            addEventListener('scroll', () => {
                if (ticking) return; ticking = true;
                requestAnimationFrame(() => {
                    const max = root.scrollHeight - innerHeight;
                    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
                    ticking = false;
                });
            }, { passive: true });
        }
    }

    /* ─────────── Partículas: polvo de oro, estrellas, corazones y cruces ─────────── */
    class Sparkles {
        constructor(canvas, opts) {
            this.c = canvas; this.ctx = canvas.getContext('2d');
            this.opts = opts; this.items = []; this.running = false; this.pointer = null;
            this.resize = this.resize.bind(this); this.frame = this.frame.bind(this);
            this.resize();
            addEventListener('resize', this.resize);
            for (let i = 0; i < this.count; i++) this.items.push(this.make(true));
        }
        get count() { return innerWidth < 700 ? this.opts.mobile : this.opts.desktop; }
        resize() {
            this.dpr = Math.min(devicePixelRatio || 1, 2);
            this.w = this.c.clientWidth; this.h = this.c.clientHeight;
            this.c.width = this.w * this.dpr; this.c.height = this.h * this.dpr;
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        }
        make(initial) {
            const r = Math.random();
            const type = r < 0.5 ? 'dust' : r < 0.74 ? 'star' : r < 0.9 ? 'heart' : 'cross';
            const colors = this.opts.colors;
            return {
                type, x: Math.random() * this.w, y: initial ? Math.random() * this.h : this.h + 20,
                vx: (Math.random() - 0.5) * 0.18, vy: -(0.12 + Math.random() * 0.38),
                s: type === 'dust' ? 1.2 + Math.random() * 2.6 : 5 + Math.random() * 7,
                a: 0.25 + Math.random() * 0.55, tw: Math.random() * Math.PI * 2, ts: 0.012 + Math.random() * 0.03,
                rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.01,
                col: type === 'heart' ? this.opts.hearts[(Math.random() * this.opts.hearts.length) | 0] : colors[(Math.random() * colors.length) | 0],
                sway: Math.random() * Math.PI * 2
            };
        }
        start() { if (this.running || reduce) return; this.running = true; this.raf = requestAnimationFrame(this.frame); }
        stop() { this.running = false; cancelAnimationFrame(this.raf); }
        frame() {
            if (!this.running) return;
            const { ctx, w, h } = this;
            ctx.clearRect(0, 0, w, h);
            for (let i = 0; i < this.items.length; i++) {
                const p = this.items[i];
                p.sway += 0.01; p.tw += p.ts; p.rot += p.vr;
                p.x += p.vx + Math.sin(p.sway) * 0.18; p.y += p.vy;
                if (this.pointer) {            // se apartan suavemente del cursor
                    const dx = p.x - this.pointer.x, dy = p.y - this.pointer.y, d2 = dx * dx + dy * dy;
                    if (d2 < 14000) { const f = (1 - d2 / 14000) * 1.6; const d = Math.sqrt(d2) || 1; p.x += dx / d * f; p.y += dy / d * f; }
                }
                if (p.y < -24 || p.x < -24 || p.x > w + 24) { this.items[i] = this.make(false); continue; }
                const alpha = p.a * (0.55 + 0.45 * Math.sin(p.tw));
                this.draw(p, alpha);
            }
            this.raf = requestAnimationFrame(this.frame);
        }
        draw(p, alpha) {
            const ctx = this.ctx;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.globalAlpha = Math.max(0, alpha);
            if (p.type === 'dust') {
                const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.s * 3);
                g.addColorStop(0, p.col); g.addColorStop(1, 'rgba(240,213,140,0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, p.s * 3, 0, Math.PI * 2); ctx.fill();
            } else if (p.type === 'star') {
                ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.beginPath();
                const s = p.s;
                ctx.moveTo(0, -s); ctx.quadraticCurveTo(0, 0, s, 0); ctx.quadraticCurveTo(0, 0, 0, s);
                ctx.quadraticCurveTo(0, 0, -s, 0); ctx.quadraticCurveTo(0, 0, 0, -s); ctx.fill();
            } else if (p.type === 'heart') {
                const s = p.s * 0.55; ctx.rotate(Math.sin(p.rot * 4) * 0.35); ctx.fillStyle = p.col; ctx.beginPath();
                ctx.moveTo(0, s * 0.9);
                ctx.bezierCurveTo(-s * 1.8, -s * 0.3, -s * 0.9, -s * 1.6, 0, -s * 0.6);
                ctx.bezierCurveTo(s * 0.9, -s * 1.6, s * 1.8, -s * 0.3, 0, s * 0.9); ctx.fill();
            } else {
                const s = p.s * 0.6; ctx.rotate(p.rot * 0.3); ctx.fillStyle = p.col;
                ctx.fillRect(-s * 0.16, -s, s * 0.32, s * 2); ctx.fillRect(-s * 0.7, -s * 0.45, s * 1.4, s * 0.3);
            }
            ctx.restore();
        }
        watch(section) {
            if (!('IntersectionObserver' in window)) { this.start(); return; }
            new IntersectionObserver(([e]) => (e.isIntersecting ? this.start() : this.stop()), { threshold: 0 }).observe(section);
            document.addEventListener('visibilitychange', () => { if (document.hidden) this.stop(); });
        }
    }

    /* ─────────── Hero ─────────── */
    let heroCycleStart = () => {};
    function initHero() {
        const hero = $('#inicio');
        const slides = $$('.slide', hero);
        const words = $$('.cycle__word', hero);
        const dots = $$('.stage__dots button', hero);
        const stage = $('#stage');
        const SLIDE_MS = 5200;
        let idx = 0, timer = null, visible = true, started = false;

        // Partículas
        const fx = $('#fx-hero');
        if (fx && !reduce) {
            const sp = new Sparkles(fx, {
                desktop: 46, mobile: 22,
                colors: ['#E2B955', '#F0D58C', '#C79A3E', '#FFFFFF'],
                hearts: ['#F2A9C4', '#8FC4EE', '#E2B955', '#7BC79B']
            });
            sp.watch(hero);
            if (finePointer) {
                hero.addEventListener('pointermove', (e) => {
                    const r = fx.getBoundingClientRect();
                    sp.pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
                });
                hero.addEventListener('pointerleave', () => { sp.pointer = null; });
            }
        }

        function go(i) {
            const prev = idx; idx = (i + slides.length) % slides.length;
            slides.forEach((s, k) => s.classList.toggle('is-on', k === idx));
            if (prev !== idx) {
                const pw = words[prev];
                pw.classList.remove('is-on'); pw.classList.add('is-off');
                setTimeout(() => pw.classList.remove('is-off'), 1000);
            }
            words[idx].classList.add('is-on');
            hero.dataset.occ = slides[idx].dataset.occ;
            dots.forEach((d, k) => {
                d.classList.remove('is-on', 'is-done');
                if (k < idx) d.classList.add('is-done');
            });
            void dots[idx].offsetWidth;                 // reinicia la animación del progreso
            dots[idx].classList.add('is-on');
        }
        function schedule() {
            clearTimeout(timer);
            if (reduce || !started || !visible || document.hidden) return;
            timer = setTimeout(() => { go(idx + 1); schedule(); }, SLIDE_MS);
        }
        heroCycleStart = () => { started = true; go(idx); schedule(); };
        dots.forEach((d) => d.addEventListener('click', () => { go(+d.dataset.i); schedule(); }));
        document.addEventListener('visibilitychange', schedule);
        if ('IntersectionObserver' in window) {
            new IntersectionObserver(([e]) => { visible = e.isIntersecting; schedule(); }, { threshold: 0.2 }).observe(hero);
        }
        if (reduce) { dots.forEach((d) => (d.style.cursor = 'pointer')); }

        if (!motion) return;

        // Inclinación 3D con el puntero + capas a distinta profundidad
        const frame = $('.stage__frame', hero);
        gsap.set(frame, { transformPerspective: 1100 });
        if (finePointer) {
            const rx = gsap.quickTo(frame, 'rotationX', { duration: 0.9, ease: 'power3' });
            const ry = gsap.quickTo(frame, 'rotationY', { duration: 0.9, ease: 'power3' });
            const ringX = gsap.quickTo('.stage__ring', 'x', { duration: 1.2, ease: 'power3' });
            const ringY = gsap.quickTo('.stage__ring', 'y', { duration: 1.2, ease: 'power3' });
            const badgeX = gsap.quickTo('.stage__badge', 'x', { duration: 1, ease: 'power3' });
            const badgeY = gsap.quickTo('.stage__badge', 'y', { duration: 1, ease: 'power3' });
            hero.addEventListener('pointermove', (e) => {
                const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
                ry(nx * 9); rx(-ny * 7);
                ringX(nx * -26); ringY(ny * -26);
                badgeX(nx * 24); badgeY(ny * 24);
            });
        }

        // Salida parallax al hacer scroll
        gsap.to('.hero__copy', { yPercent: -10, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to(stage, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to('.aurora', { yPercent: 18, scale: 1.12, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    }

    /* Entrada del hero (tras el loader) */
    function heroIntro() {
        if (!motion) { heroCycleStart(); return; }
        const clipFrom = 'inset(100% 0% 0% 0% round 50% 50% 28px 28px / 44% 44% 28px 28px)';
        const clipTo = 'inset(0% 0% 0% 0% round 50% 50% 28px 28px / 44% 44% 28px 28px)';
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => { $('.stage__frame').style.clipPath = 'none'; heroCycleStart(); } });
        tl.fromTo('.hero .chip', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 1.1 }, 0.05)
            .fromTo('.hero__title .line__in', { yPercent: 112, opacity: 1 }, { yPercent: 0, opacity: 1, duration: 1.5, stagger: 0.14 }, 0.12)
            .fromTo('.hero__sub, .hero__cta', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.2, stagger: 0.12 }, 0.55)
            .fromTo('.stage__frame', { clipPath: clipFrom }, { clipPath: clipTo, duration: 1.8, ease: 'power4.inOut' }, 0.15)
            .fromTo('.stage__outline', { opacity: 0, x: -14, y: -14 }, { opacity: 0.75, x: 0, y: 0, duration: 1.4 }, 0.9)
            .fromTo('.stage__ring', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 2 }, 0.7)
            .fromTo('.stage__badge', { opacity: 0, scale: 0.4, rotate: -90 }, { opacity: 1, scale: 1, rotate: 0, duration: 1.4, ease: 'back.out(1.6)' }, 1.1)
            .fromTo('.stage__dots', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1 }, 1.3);
    }

    /* ─────────── Loader ─────────── */
    function initLoader() {
        const loader = $('#loader');
        const pct = $('#loader-pct');
        const bar = $('.loader__bar i');
        const seam = $('.loader__ribbon');
        lockScroll(true);

        const MIN = reduce ? 500 : 2600;
        let loaded = false, shown = 0;
        const t0 = performance.now();

        const winLoad = new Promise((r) => (document.readyState === 'complete' ? r() : addEventListener('load', r, { once: true })));
        const fonts = document.fonts && document.fonts.ready ? document.fonts.ready.catch(() => {}) : Promise.resolve();
        const heroImg = $('.slide.is-on');
        const heroDecoded = heroImg && heroImg.decode ? heroImg.decode().catch(() => {}) : Promise.resolve();
        Promise.all([winLoad, fonts, heroDecoded]).then(() => { loaded = true; });
        setTimeout(() => { loaded = true; }, 8000);   // tope por si una CDN tarda

        function finish() {
            pct.textContent = '100';
            bar.style.setProperty('--p', 1);
            loader.classList.add('is-out');
            setTimeout(() => {
                loader.classList.add('is-gone');
                loader.setAttribute('aria-hidden', 'true');
                lockScroll(false);
                if (hasGSAP) ScrollTrigger.refresh();
            }, 1800);
            setTimeout(heroIntro, 650);
        }
        function tick(now) {
            const t = now - t0;
            let target = Math.min(t / MIN, 1);
            if (!loaded) target = Math.min(target, 0.9);
            shown += (target - shown) * 0.1;
            const v = Math.min(shown, 1);
            pct.textContent = String(Math.min(99, Math.round(v * 100)));
            bar.style.setProperty('--p', v.toFixed(3));
            seam.style.transform = `translateX(-50%) scaleY(${v.toFixed(3)})`;
            if (loaded && t >= MIN && v > 0.985) finish();
            else requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    /* ─────────── Marquee (único de la página) ─────────── */
    function initMarquee() {
        const track = $('#marquee-track');
        if (!track || !track.animate) return;
        const anim = track.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }],
            { duration: 42000, iterations: Infinity, easing: 'linear' });
        if (reduce) { anim.pause(); return; }
        if (!motion) return;
        // La velocidad reacciona al scroll: más rápido al bajar, invierte al subir
        let vel = 0, rate = 1;
        ScrollTrigger.create({ trigger: '.marquee', start: 'top bottom', end: 'bottom top', onUpdate: (self) => { vel = self.getVelocity(); } });
        gsap.ticker.add(() => {
            vel *= 0.92;
            const target = 1 + clamp(vel / 450, -6, 6);
            rate += (target - rate) * 0.1;
            anim.playbackRate = rate;
        });
        new IntersectionObserver(([e]) => (e.isIntersecting ? anim.play() : anim.pause())).observe(track.parentElement);
    }

    /* ─────────── Manifiesto + contadores ─────────── */
    function initManifest() {
        const text = $('[data-scrub-words]');
        if (text) splitScrub(text);
        if (motion && text) {
            gsap.to($$('.mw', text), {
                opacity: 1, ease: 'none', stagger: 0.12,
                scrollTrigger: { trigger: text, start: 'top 80%', end: 'bottom 55%', scrub: 0.6 }
            });
        } else if (text) {
            $$('.mw', text).forEach((w) => (w.style.opacity = 1));
        }
        $$('.count').forEach((el) => {
            const target = +el.dataset.count;
            const run = () => {
                if (!hasGSAP || reduce) { el.textContent = target; return; }
                const o = { v: 0 };
                gsap.to(o, { v: target, duration: 2.4, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v); } });
            };
            if (!('IntersectionObserver' in window)) { el.textContent = target; return; }
            const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { run(); io.disconnect(); } }, { threshold: 0.6 });
            io.observe(el);
        });
    }

    /* ─────────── Cinemática: la imagen se abre en grande al hacer scroll ─────────── */
    function initCine() {
        if (!motion) return;
        const sec = $('#cine');
        const frame = $('.cine__frame', sec);
        const img = $('.cine__img', sec);
        const wl = $('.cine__w--l', sec);
        const wr = $('.cine__w--r', sec);
        const cap = $$('.cine__caption > *', sec);
        const mm = gsap.matchMedia();

        const build = (mobile) => {
            const insetX = mobile ? 20 : 33;
            const insetY = mobile ? 24 : 14;
            const r = Math.round(innerWidth * (1 - (insetX * 2) / 100) / 2);       // arco = media anchura
            const from = `inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round ${r}px ${r}px 28px 28px)`;
            const to = 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)';
            gsap.set(img, { scale: 1.25 });
            gsap.set(cap, { opacity: 0, y: 34 });
            const tl = gsap.timeline({
                defaults: { ease: 'none' },
                scrollTrigger: { trigger: sec, start: 'top top', end: '+=210%', pin: true, scrub: 0.9, anticipatePin: 1, invalidateOnRefresh: true }
            });
            tl.fromTo(frame, { clipPath: from }, { clipPath: to, duration: 1.7 }, 0)   // mismas unidades en ambos extremos
                .to(img, { scale: 1, duration: 2 }, 0);
            if (mobile) {
                tl.to(wl, { yPercent: -260, opacity: 0, duration: 1.3 }, 0)
                    .to(wr, { yPercent: 260, opacity: 0, duration: 1.3 }, 0);
            } else {
                tl.to(wl, { x: () => -innerWidth * 0.55, opacity: 0, duration: 1.5 }, 0)
                    .to(wr, { x: () => innerWidth * 0.55, opacity: 0, duration: 1.5 }, 0);
            }
            tl.to(cap, { opacity: 1, y: 0, stagger: 0.18, duration: 0.55, ease: 'power2.out' }, 1.55)
                .to({}, { duration: 0.5 });
            return () => { tl.scrollTrigger && tl.scrollTrigger.kill(); tl.kill(); gsap.set([frame, img, cap, wl, wr], { clearProps: 'all' }); };
        };
        mm.add('(min-width: 900px)', () => build(false));
        mm.add('(max-width: 899px)', () => build(true));
    }

    /* ─────────── Anatomía del detalle (zoom guiado por scroll) ─────────── */
    function initAnatomy() {
        const items = $$('.anat__item');
        const img = $('#anat-img');
        const ring = $('#anat-ring');
        const label = $('#anat-label');
        if (!items.length) return;
        let current = null;

        function activate(item) {
            if (current === item) return;
            current = item;
            items.forEach((i) => i.classList.toggle('is-active', i === item));
            const fx = +item.dataset.fx, fy = +item.dataset.fy, z = +item.dataset.zoom;
            const max = ((z - 1) / 2) * 100;
            const xp = clamp(-(fx - 0.5) * z * 100, -max, max);
            const yp = clamp(-(fy - 0.5) * z * 100, -max, max);
            if (hasGSAP && !reduce) gsap.to(img, { scale: z, xPercent: xp, yPercent: yp, duration: 1.5, ease: 'expo.out', overwrite: true });
            else img.style.transform = `translate(${xp}%, ${yp}%) scale(${z})`;
            ring.classList.remove('is-on');
            if (z > 1) { void ring.offsetWidth; ring.classList.add('is-on'); }
            label.textContent = item.dataset.label;
        }

        if (hasGSAP) {
            const start = innerWidth >= 1024 ? 'top 62%' : 'top 74%';
            items.forEach((item) => {
                ScrollTrigger.create({
                    trigger: item, start, end: innerWidth >= 1024 ? 'bottom 62%' : 'bottom 74%',
                    onToggle: (self) => { if (self.isActive) activate(item); }
                });
            });
        } else if ('IntersectionObserver' in window) {
            const io = new IntersectionObserver((entries) => {
                entries.forEach((e) => { if (e.isIntersecting) activate(e.target); });
            }, { rootMargin: '-35% 0px -45% 0px' });
            items.forEach((i) => io.observe(i));
        }
    }

    /* ─────────── Colecciones: scroll horizontal anclado (escritorio) ─────────── */
    function initDevotions() {
        if (!motion) return;
        const sec = $('#colecciones');
        const track = $('#devo-track');
        const bar = $('#devo-bar');
        if (!sec || !track) return;
        const mm = gsap.matchMedia();
        mm.add('(min-width: 900px)', () => {
            const dist = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
            const tween = gsap.to(track, {
                x: () => -dist(), ease: 'none',
                scrollTrigger: {
                    trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
                    onUpdate: (self) => { bar.style.transform = `scaleX(${self.progress})`; }
                }
            });
            // Parallax interno de cada imagen mientras la tarjeta cruza la pantalla
            $$('.card__img img', track).forEach((im) => {
                gsap.fromTo(im, { xPercent: -4, scale: 1.1 }, {
                    xPercent: 4, ease: 'none',
                    scrollTrigger: { trigger: im.closest('.card'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true }
                });
            });
            return () => { gsap.set([track, ...$$('.card__img img', track)], { clearProps: 'all' }); };
        });
    }

    /* ─────────── Ocasiones: un color para cada una ─────────── */
    function initOccasions() {
        const sec = $('#ocasiones');
        if (!sec) return;
        const DATA = {
            bautizo: { occ: 'azul', wash: '#E4F0FB', name: 'Bautizo', img: 'img/flyers/bautizo-nina-nino.jpg', alt: 'Recuerdo de bautizo con listón azul claro, Jesús niño, rosario de perlas y ángel', copy: 'Un detalle especial para un día lleno de fe, amor y bendiciones. Jesús niño, rosario de perlas y vela en azul o rosa.', cta: 'Quiero uno para mi bautizo', wa: "Hola Imaginar't, quiero un detalle para un bautizo." },
            comunion: { occ: 'rosa', wash: '#FCE8EF', name: 'Primera Comunión', img: 'img/flyers/primera-comunion.jpg', alt: 'Recuerdo de primera comunión en marfil con crucifijo de San Benito, vela y rosario', copy: 'Un recuerdo para un día muy especial: crucifijo, vela y rosario en tonos marfil, nácar y rosa.', cta: 'Quiero uno para mi comunión', wa: "Hola Imaginar't, quiero un detalle para una primera comunión." },
            confirmacion: { occ: 'verde', wash: '#E3F1E8', name: 'Confirmación', img: 'img/flyers/san-judas-oracion.jpg', alt: 'Detalle con vela, oración y rosario de San Judas Tadeo en verde y oro', copy: 'Fe que se fortalece. Vela, cuadro con oración y rosario para acompañar a quien confirma su camino.', cta: 'Quiero uno para mi confirmación', wa: "Hola Imaginar't, quiero un detalle para una confirmación." },
            boda: { occ: 'oro', wash: '#FAEFD8', name: 'Boda', img: 'img/flyers/guadalupe-oracion-llavero.jpg', alt: 'Detalle dorado con vela, oración, llavero y cuadro de la Virgen de Guadalupe', copy: 'Un detalle con fe para agradecer a quienes te acompañan: oración, llavero y vela en dorado y café.', cta: 'Quiero uno para mi boda', wa: "Hola Imaginar't, quiero un detalle para una boda." },
            navidad: { occ: 'rojo', wash: '#FBE6E3', name: 'Navidad', img: 'img/flyers/navidad-2026.jpg', alt: 'Detalle navideño con escena enmarcada, listón dorado y flor de nochebuena', copy: 'Un detalle para esta Navidad: escenas navideñas enmarcadas, vela y rosario con flor de nochebuena.', cta: 'Quiero uno para esta Navidad', wa: "Hola Imaginar't, quiero un detalle para esta Navidad." },
            luto: { occ: 'negro', wash: '#ECE9E4', name: 'Luto', img: 'img/flyers/luto-cristo.jpg', alt: 'Detalle para luto con moño negro, Cristo crucificado, rosario negro y vela', copy: 'Un gesto de fe, respeto y amor en los momentos más difíciles, en memoria de quienes siempre vivirán en nuestro corazón.', cta: 'Quiero uno en memoria', wa: "Hola Imaginar't, quiero un detalle para luto." }
        };
        const keys = Object.keys(DATA);
        const tabs = $$('.occ__tab', sec);
        const panel = $('#occ-panel');
        const img = $('#occ-img'), nameEl = $('#occ-name'), copyEl = $('#occ-copy');
        const cta = $('#occ-cta'), ctaText = $('#occ-cta-text'), timer = $('#occ-timer');
        const AUTO_MS = 6500;
        let cur = 'bautizo', auto = !reduce, inView = false, tAuto = null, userTouched = false;

        keys.forEach((k) => { const i = new Image(); i.src = DATA[k].img; });   // precarga

        function startTimer() {
            if (!timer) return;
            timer.style.transition = 'none'; timer.style.transform = 'scaleX(0)';
            if (!auto) return;
            void timer.offsetWidth;
            timer.style.transition = `transform ${AUTO_MS}ms linear`; timer.style.transform = 'scaleX(1)';
        }
        function schedule() {
            clearTimeout(tAuto);
            if (!auto || !inView || document.hidden) return;
            tAuto = setTimeout(() => { select(keys[(keys.indexOf(cur) + 1) % keys.length], false); }, AUTO_MS);
        }
        function select(key, byUser) {
            const d = DATA[key]; if (!d) return;
            if (byUser) { userTouched = true; auto = false; }
            const changed = key !== cur;
            cur = key;
            tabs.forEach((t) => {
                const on = t.dataset.key === key;
                t.classList.toggle('is-on', on); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
                if (on) panel.setAttribute('aria-labelledby', t.id);
            });
            sec.dataset.occ = d.occ;
            sec.dataset.bg = d.wash;
            if (inView) setPageBg(d.wash);
            if (changed || byUser) {
                img.classList.add('is-swap');
                setTimeout(() => { img.src = d.img; img.alt = d.alt; requestAnimationFrame(() => img.classList.remove('is-swap')); }, 320);
                [nameEl, copyEl].forEach((el) => { el.style.transition = 'opacity .3s'; el.style.opacity = 0; });
                setTimeout(() => {
                    nameEl.textContent = d.name; copyEl.textContent = d.copy; ctaText.textContent = d.cta;
                    setWa(cta, d.wa);
                    [nameEl, copyEl].forEach((el) => { el.style.opacity = 1; });
                }, 300);
            }
            startTimer(); schedule();
        }
        window.__selectOcc = (key) => { if (DATA[key]) { select(key, true); } };

        tabs.forEach((t, i) => {
            t.addEventListener('click', () => select(t.dataset.key, true));
            t.addEventListener('keydown', (e) => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
                n.focus(); select(n.dataset.key, true);
            });
        });
        new IntersectionObserver(([e]) => {
            inView = e.isIntersecting;
            if (inView) { setPageBg(DATA[cur].wash); startTimer(); }
            schedule();
        }, { threshold: 0.35 }).observe(sec);
        document.addEventListener('visibilitychange', schedule);
        startTimer();
    }

    /* ─────────── Proceso: línea que se dibuja con el scroll ─────────── */
    function initProcess() {
        const rail = $('#rail');
        if (!rail) return;
        const items = $$('.rail__item', rail);
        if (!hasGSAP || reduce) { items.forEach((i) => i.classList.add('is-on')); rail.style.setProperty('--p', 1); return; }
        ScrollTrigger.create({
            trigger: rail, start: 'top 60%', end: 'bottom 70%', scrub: 0.5,
            onUpdate: (self) => rail.style.setProperty('--p', self.progress.toFixed(3))
        });
        items.forEach((item) => {
            ScrollTrigger.create({
                trigger: item, start: 'top 64%',
                onEnter: () => item.classList.add('is-on'),
                onLeaveBack: () => item.classList.remove('is-on')
            });
        });
    }

    /* ─────────── Catálogo + lightbox ─────────── */
    function initGallery() {
        const grid = $('#gal-grid');
        if (!grid) return;
        const itemsAll = $$('.gal__item', grid);
        const filters = $$('#gal-filters button');
        const lb = $('#lb'), lbImg = $('#lb-img'), lbName = $('#lb-name'), lbCta = $('#lb-cta');
        const closeBtn = $('#lb-close'), prevBtn = $('#lb-prev'), nextBtn = $('#lb-next');
        let visible = itemsAll, index = 0, lastFocus = null;

        function applyFilter(f) {
            let k = 0;
            itemsAll.forEach((it) => {
                const show = f === 'todos' || it.dataset.cat === f;
                it.classList.toggle('is-hidden', !show);
                if (show) { it.style.setProperty('--k', k++); it.style.animation = 'none'; void it.offsetWidth; it.style.animation = ''; }
            });
            visible = itemsAll.filter((it) => !it.classList.contains('is-hidden'));
            if (hasGSAP) setTimeout(() => ScrollTrigger.refresh(), 60);
        }
        filters.forEach((b) => b.addEventListener('click', () => {
            filters.forEach((x) => x.classList.toggle('is-on', x === b));
            applyFilter(b.dataset.f);
        }));

        function fill(i) {
            index = (i + visible.length) % visible.length;
            const btn = $('button', visible[index]);
            const thumb = $('img', btn);
            lbImg.src = thumb.currentSrc || thumb.src;       // miniatura al instante
            lbImg.alt = thumb.alt;
            lbName.textContent = btn.dataset.name;
            setWa(lbCta, `Hola Imaginar't, quiero este diseño: ${btn.dataset.name}.`);
            const full = new Image();
            full.onload = () => { if (lb.classList.contains('is-open') && lbImg.alt === thumb.alt) lbImg.src = full.src; };
            full.src = btn.dataset.full;
            return thumb;
        }
        function open(i) {
            lastFocus = document.activeElement;
            const thumb = fill(i);
            lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
            lockScroll(true);
            // FLIP: la imagen "crece" desde su miniatura
            if (!reduce && lbImg.animate) {
                requestAnimationFrame(() => {
                    const a = thumb.getBoundingClientRect(), b = lbImg.getBoundingClientRect();
                    if (!b.width) return;
                    lbImg.animate([
                        { transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})`, borderRadius: '12px' },
                        { transform: 'none', borderRadius: '20px' }
                    ], { duration: 800, easing: 'cubic-bezier(.16,1,.3,1)' });
                });
            }
            closeBtn.focus({ preventScroll: true });
        }
        function close() {
            lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true');
            lockScroll(false);
            if (lastFocus) lastFocus.focus({ preventScroll: true });
        }
        function step(d) {
            if (!reduce && lbImg.animate) lbImg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' }).onfinish = () => {
                fill(index + d);
                lbImg.animate([{ opacity: 0, transform: `translateX(${d * 30}px)` }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
            };
            else fill(index + d);
        }
        grid.addEventListener('click', (e) => {
            const btn = e.target.closest('.gal__item button');
            if (!btn) return;
            open(visible.indexOf(btn.closest('.gal__item')));
        });
        closeBtn.addEventListener('click', close);
        prevBtn.addEventListener('click', () => step(-1));
        nextBtn.addEventListener('click', () => step(1));
        lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
        addEventListener('keydown', (e) => {
            if (!lb.classList.contains('is-open')) return;
            if (e.key === 'Escape') close();
            if (e.key === 'ArrowLeft') step(-1);
            if (e.key === 'ArrowRight') step(1);
            if (e.key === 'Tab') {                              // trampa de foco
                const f = [closeBtn, prevBtn, nextBtn, lbCta];
                const i = f.indexOf(document.activeElement);
                if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
                else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
            }
        });
        let sx = null;                                          // deslizar en móvil
        lb.addEventListener('pointerdown', (e) => { sx = e.clientX; });
        lb.addEventListener('pointerup', (e) => {
            if (sx === null) return;
            const dx = e.clientX - sx; sx = null;
            if (Math.abs(dx) > 70) step(dx < 0 ? 1 : -1);
        });
    }

    /* ─────────── FAQ ─────────── */
    function initFaq() {
        const items = $$('.faq__item');
        items.forEach((item) => {
            const q = $('.faq__q', item);
            q.addEventListener('click', () => {
                const open = !item.classList.contains('is-open');
                items.forEach((i) => {
                    const o = i === item && open;
                    i.classList.toggle('is-open', o);
                    $('.faq__q', i).setAttribute('aria-expanded', String(o));
                });
                if (hasGSAP) setTimeout(() => ScrollTrigger.refresh(), 650);
            });
        });
    }

    /* ─────────── Formulario → WhatsApp ─────────── */
    function initForm() {
        const form = $('#wa-form');
        if (!form) return;
        const status = $('#f-status');
        const submit = $('#f-submit');
        const f = {
            name: $('#f-name'), occ: $('#f-occ'), dev: $('#f-dev'), ribbon: $('#f-ribbon'),
            qty: $('#f-qty'), date: $('#f-date'), msg: $('#f-msg')
        };
        const err = (input, id, text) => {
            const wrap = input.closest('.field');
            wrap.classList.toggle('has-error', !!text);
            $('#' + id).textContent = text || '';
            input.setAttribute('aria-invalid', text ? 'true' : 'false');
        };
        [f.name, f.occ].forEach((i) => i.addEventListener('input', () => err(i, i === f.name ? 'err-name' : 'err-occ', '')));
        f.occ.addEventListener('change', () => err(f.occ, 'err-occ', ''));

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            let ok = true;
            if (f.name.value.trim().length < 2) { err(f.name, 'err-name', 'Cuéntanos cómo te llamas.'); ok = false; }
            if (!f.occ.value) { err(f.occ, 'err-occ', 'Elige la ocasión de tu detalle.'); ok = false; }
            if (!ok) { (f.name.value.trim().length < 2 ? f.name : f.occ).focus(); status.style.color = '#B3261E'; status.textContent = 'Revisa los campos marcados.'; return; }

            const lines = [`Hola Imaginar't, soy ${f.name.value.trim()}. Quiero solicitar una cotización:`, '', `• Ocasión: ${f.occ.value}`];
            if (f.dev.value) lines.push(`• Devoción: ${f.dev.value}`);
            if (f.ribbon.value) lines.push(`• Color del listón: ${f.ribbon.value}`);
            if (f.qty.value) lines.push(`• Cantidad: ${f.qty.value}`);
            if (f.date.value) {
                const [y, m, d] = f.date.value.split('-').map(Number);
                lines.push(`• Fecha del evento: ${new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`);
            }
            if (f.msg.value.trim()) lines.push(`• Comentarios: ${f.msg.value.trim()}`);
            const url = waLink(lines.join('\n'));

            status.style.color = ''; status.textContent = 'Abriendo WhatsApp con tu mensaje listo...';
            form.classList.add('is-sent');
            $('span', submit).textContent = '¡Listo! Gracias por escribirnos';
            const w = window.open(url, '_blank', 'noopener');
            if (!w) location.href = url;
            setTimeout(() => {
                form.classList.remove('is-sent');
                $('span', submit).textContent = 'Quiero mi cotización por WhatsApp';
                status.textContent = '';
            }, 7000);
        });
    }

    /* ─────────── Contacto: partículas del cierre ─────────── */
    function initContactFx() {
        const c = $('#fx-contact');
        if (!c || reduce) return;
        const sp = new Sparkles(c, { desktop: 40, mobile: 18, colors: ['#F0D58C', '#FFFFFF', '#8FC4EE', '#E2B955'], hearts: ['#F0D58C', '#F2A9C4', '#FFFFFF'] });
        sp.watch($('#contacto'));
    }

    /* ─────────── Botones magnéticos y footer ─────────── */
    function initMagnetic() {
        if (!motion || !finePointer) return;
        $$('[data-magnetic]').forEach((el) => {
            const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
            const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                x((e.clientX - (r.left + r.width / 2)) * 0.28);
                y((e.clientY - (r.top + r.height / 2)) * 0.4);
            });
            el.addEventListener('pointerleave', () => { x(0); y(0); });
        });
    }
    function initFooter() {
        if (!motion) return;
        gsap.fromTo('.footer__giant', { yPercent: 35, opacity: 0.4 }, {
            yPercent: 0, opacity: 1, ease: 'none',
            scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true }
        });
    }

    /* ─────────── WhatsApp flotante ─────────── */
    function initFloat() {
        const el = $('#wa-float');
        if (!el) return;
        setTimeout(() => { el.classList.add('show-tip'); setTimeout(() => el.classList.remove('show-tip'), 6500); }, 7000);
    }

    /* ─────────── Arranque ─────────── */
    initWhatsApp();
    initReveals();
    initPageBg();
    initSmoothScroll();
    initHeader();
    initHero();
    initMarquee();
    initManifest();
    initCine();
    initAnatomy();
    initDevotions();
    initOccasions();
    initProcess();
    initGallery();
    initFaq();
    initForm();
    initContactFx();
    initMagnetic();
    initFooter();
    initFloat();
    initLoader();

    // Recalcula posiciones cuando cargan fuentes e imágenes
    if (hasGSAP) {
        addEventListener('load', () => ScrollTrigger.refresh());
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
})();
