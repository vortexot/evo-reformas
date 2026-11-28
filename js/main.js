/* =========================================================
   EVO — interactions
   GSAP + ScrollTrigger + Lenis (smooth scroll)
   Falls back to a fully usable static page if the libraries
   fail to load or the visitor prefers reduced motion.
   ========================================================= */
(() => {
  'use strict';

  const html = document.documentElement;
  const body = document.body;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const A = !!(window.gsap && window.ScrollTrigger) && !reduce; // animated mode

  $$('.year').forEach((el) => (el.textContent = new Date().getFullYear()));

  if (!A) html.classList.add('static');

  /* ---------------------------------------------------------
     Smooth scroll
     --------------------------------------------------------- */
  let lenis = null;
  if (A) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    if (window.Lenis) {
      lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  const scrollTo = (target, opts = {}) => {
    if (lenis) return lenis.scrollTo(target, { duration: 1.6, ...opts });
    const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  };
  const stopScroll = () => (lenis ? lenis.stop() : (body.style.overflow = 'hidden'));
  const startScroll = () => (lenis ? lenis.start() : (body.style.overflow = ''));

  /* ---------------------------------------------------------
     Split text into masked words
     --------------------------------------------------------- */
  function splitWords(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
        const w = document.createElement('span');
        w.className = 'w';
        const i = document.createElement('span');
        i.className = 'wi';
        i.textContent = part;
        w.appendChild(i);
        frag.appendChild(w);
      });
      n.replaceWith(frag);
    });
    return $$('.wi', root);
  }

  /* ---------------------------------------------------------
     Header + menu + anchors (both modes)
     --------------------------------------------------------- */
  const header = $('.header');
  const burger = $('.burger');
  const menu = $('#menu');
  let menuOpen = false;
  let menuTl = null;

  function openMenu() {
    menuOpen = true;
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    burger.classList.add('is-active');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Fechar menu');
    header.classList.add('menu-open');
    stopScroll();
    if (menuTl) menuTl.timeScale(1).play();
    setTimeout(() => $('.menu__nav a')?.focus({ preventScroll: true }), A ? 700 : 0);
  }
  function closeMenu(cb) {
    menuOpen = false;
    burger.classList.remove('is-active');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Abrir menu');
    menu.setAttribute('aria-hidden', 'true');
    const done = () => {
      menu.classList.remove('is-open');
      header.classList.remove('menu-open');
      startScroll();
      cb && cb();
    };
    if (menuTl) {
      menuTl.eventCallback('onReverseComplete', done);
      menuTl.timeScale(1.7).reverse();
    } else done();
  }
  burger.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));

  // Menu hover → image preview
  const previews = $$('.menu__preview-frame img');
  const setPreview = (key) => previews.forEach((img) => img.classList.toggle('is-active', img.dataset.key === key));
  setPreview('sobre');
  $$('.menu__nav a').forEach((a) => {
    a.addEventListener('mouseenter', () => setPreview(a.dataset.key));
    a.addEventListener('focus', () => setPreview(a.dataset.key));
  });

  // In-page anchors
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    const go = () => scrollTo(target);
    if (menuOpen) closeMenu(go); else go();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (povOpen) closePov();
    else if (menuOpen) { closeMenu(); burger.focus(); }
  });

  /* ---------------------------------------------------------
     Services accordion (both modes)
     --------------------------------------------------------- */
  const svcs = $$('.svc');
  svcs.forEach((svc) => {
    const btn = $('.svc__row', svc);
    btn.addEventListener('click', () => {
      const open = !svc.classList.contains('is-open');
      svcs.forEach((s) => { s.classList.remove('is-open'); $('.svc__row', s).setAttribute('aria-expanded', 'false'); });
      if (open) { svc.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
      if (A) setTimeout(() => ScrollTrigger.refresh(), 850);
    });
  });

  /* ---------------------------------------------------------
     Contact form → WhatsApp
     --------------------------------------------------------- */
  const form = $('#contact-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const msgEl = $('.form__msg', form);
    const nameField = form.name.closest('.field');
    if (!name) {
      nameField.classList.add('has-error');
      msgEl.textContent = 'Por favor, informe seu nome.';
      form.name.focus();
      return;
    }
    nameField.classList.remove('has-error');
    const type = (form.querySelector('input[name="type"]:checked') || {}).value || '';
    const text = [
      `Olá, EVO! Meu nome é ${name}.`,
      type && `Tipo de projeto: ${type}.`,
      form.phone.value.trim() && `Telefone: ${form.phone.value.trim()}.`,
      form.message.value.trim() && `Sobre o projeto: ${form.message.value.trim()}`,
    ].filter(Boolean).join('\n');
    const waNumber = '5500000000000'; // ← substitua pelo número oficial da EVO
    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;
    const win = window.open(url, '_blank', 'noopener');
    msgEl.textContent = '';
    if (win) {
      msgEl.textContent = 'Abrimos o WhatsApp com a sua mensagem. É só enviar!';
    } else {
      // Popup blocked: offer a real link instead
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.className = 'link-line';
      a.textContent = 'Abrir o WhatsApp com a sua mensagem →';
      msgEl.appendChild(a);
    }
  });

  /* ---------------------------------------------------------
     Back to top
     --------------------------------------------------------- */
  $('.footer__top-btn').addEventListener('click', () => scrollTo(0, { duration: 2.2 }));

  /* ---------------------------------------------------------
     Project overlay
     --------------------------------------------------------- */
  const pov = $('.pov');
  const povMedia = $('.pov__media');
  const povImg = $('.pov__media img');
  const povPanel = $('.pov__panel');
  const povContent = $$('.pov__content > *');
  const cards = $$('.proj');
  let povOpen = false;
  let povIndex = 0;

  function fillPov(i) {
    const c = cards[i];
    povImg.src = c.dataset.img;
    povImg.alt = c.querySelector('img').alt;
    $('.pov__title').textContent = c.dataset.title;
    $('.pov__cat').textContent = `${String(i + 1).padStart(2, '0')} — ${c.dataset.cat}`;
    $('.pov__desc').textContent = c.dataset.desc;
    $('.pov__status').textContent = c.dataset.status;
    $('.pov__source').textContent = c.dataset.source;
  }
  const rectInset = (r, box) =>
    `inset(${r.top - box.top}px ${box.right - r.right}px ${box.bottom - r.bottom}px ${r.left - box.left}px)`;

  function openPov(i) {
    if (povOpen) return;
    povOpen = true;
    povIndex = i;
    fillPov(i);
    pov.classList.add('is-open');
    pov.setAttribute('aria-hidden', 'false');
    stopScroll();
    header.classList.add('is-hidden');
    if (!A) { $('.pov__close').focus(); return; }
    const r = $('.proj__media', cards[i]).getBoundingClientRect();
    const box = povMedia.getBoundingClientRect();
    gsap.timeline({ defaults: { ease: 'expo.inOut' } })
      .fromTo(povMedia, { clipPath: rectInset(r, box) }, { clipPath: 'inset(0px 0px 0px 0px)', duration: 1.2 })
      .fromTo(povImg, { scale: 1.25 }, { scale: 1, duration: 1.6, ease: 'expo.out' }, 0)
      .fromTo(povPanel, { x: 0, y: 0, xPercent: innerWidth > 900 ? 100 : 0, yPercent: innerWidth > 900 ? 0 : 100 }, { x: 0, y: 0, xPercent: 0, yPercent: 0, duration: 1 }, 0.45)
      .fromTo(povContent, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, stagger: 0.07, duration: 0.9, ease: 'expo.out' }, 1)
      .add(() => $('.pov__close').focus({ preventScroll: true }), 1);
  }
  function closePov() {
    if (!povOpen) return;
    const card = cards[povIndex];
    const finish = () => {
      pov.classList.remove('is-open');
      pov.setAttribute('aria-hidden', 'true');
      povOpen = false;
      startScroll();
      card.focus({ preventScroll: true });
    };
    if (!A) return finish();
    const r = $('.proj__media', card).getBoundingClientRect();
    const box = povMedia.getBoundingClientRect();
    const inView = r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
    gsap.timeline({ defaults: { ease: 'expo.inOut' }, onComplete: finish })
      .to(povContent, { autoAlpha: 0, y: -16, stagger: 0.03, duration: 0.4, ease: 'power2.in' })
      .to(povPanel, { xPercent: innerWidth > 900 ? 100 : 0, yPercent: innerWidth > 900 ? 0 : 100, duration: 0.8 }, 0.1)
      .to(povMedia, { clipPath: inView ? rectInset(r, box) : 'inset(50% 50% 50% 50%)', duration: 1 }, 0.35);
  }
  function stepPov(dir) {
    const next = (povIndex + dir + cards.length) % cards.length;
    povIndex = next;
    if (!A) return fillPov(next);
    gsap.timeline()
      .to(povContent, { autoAlpha: 0, y: -14, stagger: 0.03, duration: 0.35, ease: 'power2.in' })
      .to(povImg, { autoAlpha: 0, duration: 0.35 }, 0)
      .add(() => fillPov(next))
      .fromTo(povImg, { autoAlpha: 0, scale: 1.15 }, { autoAlpha: 1, scale: 1, duration: 1.2, ease: 'expo.out' })
      .fromTo(povContent, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, stagger: 0.06, duration: 0.8, ease: 'expo.out' }, '<0.1');
  }
  cards.forEach((c, i) => {
    c.setAttribute('role', 'button');
    c.setAttribute('aria-label', `Ver projeto ${c.dataset.title}`);
    c.addEventListener('click', () => openPov(i));
    c.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPov(i); }
    });
  });
  $('.pov__close').addEventListener('click', closePov);
  $('.pov__prev').addEventListener('click', () => stepPov(-1));
  $('.pov__next').addEventListener('click', () => stepPov(1));

  /* =========================================================
     Everything below is animated mode only
     ========================================================= */
  if (!A) {
    $('.loader')?.remove();
    // simple header state for static mode
    const onS = () => header.classList.toggle('is-scrolled', scrollY > 40);
    addEventListener('scroll', onS, { passive: true });
    onS();
    return;
  }

  /* ---------- Menu timeline ---------- */
  menuTl = gsap.timeline({ paused: true, defaults: { ease: 'expo.inOut' } })
    .to('.menu__panels span', { scaleY: 1, duration: 0.9, stagger: 0.05, transformOrigin: 'top' })
    .fromTo('.menu__txt > span', { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: 0.06, ease: 'expo.out' }, 0.45)
    .fromTo('.menu__num', { autoAlpha: 0, y: 10 }, { autoAlpha: 0.5, y: 0, duration: 0.7, stagger: 0.06, ease: 'expo.out' }, 0.55)
    .fromTo('.menu__preview-frame', { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2 }, 0.35)
    .to('.menu__preview-caption', { opacity: 1, duration: 0.6 }, 1)
    .to('.menu__foot > *', { opacity: 1, y: 0, stagger: 0.06, duration: 0.9, ease: 'expo.out' }, 0.75);

  /* ---------- Split text ---------- */
  const heroWords = splitWords($('.hero__title'));
  gsap.set(heroWords, { yPercent: 115 });
  const headingSplits = $$('.split-words').map((el) => ({ el, words: splitWords(el) }));
  headingSplits.forEach(({ words }) => gsap.set(words, { yPercent: 115 }));
  const aboutWords = splitWords($('.about__statement'));

  /* ---------- Initial states ---------- */
  gsap.set(header, { yPercent: -100 });
  gsap.set('.gridlines span', { scaleY: 0 });
  gsap.set('.hero__eyebrow, .hero__scroll', { autoAlpha: 0, y: 20 });
  gsap.set('.hero__img', { scale: 1.35 });

  /* ---------------------------------------------------------
     Preloader
     --------------------------------------------------------- */
  const loader = $('.loader');
  const loaderCols = $$('.loader__cols span');
  const loaderNum = $('.loader__num');
  body.classList.add('is-loading');
  stopScroll();

  const heroImg = $('.hero__img');
  const imgReady = new Promise((res) => {
    if (heroImg.complete && heroImg.naturalWidth) return res();
    heroImg.addEventListener('load', res, { once: true });
    heroImg.addEventListener('error', res, { once: true });
  });
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  const assetsReady = Promise.race([
    Promise.all([imgReady, fontsReady]),
    new Promise((r) => setTimeout(r, 5000)),
  ]);

  const prog = { v: 0 };
  const renderLoader = () => {
    loaderNum.textContent = Math.round(prog.v * 100);
    const n = loaderCols.length;
    loaderCols.forEach((c, i) => {
      const p = clamp((prog.v - i * 0.06) / (1 - (n - 1) * 0.06), 0, 1);
      c.style.transform = `scaleY(${p})`;
    });
  };
  const fakeLoad = gsap.to(prog, { v: 0.86, duration: 1.8, ease: 'power2.inOut', onUpdate: renderLoader });
  const minTime = new Promise((r) => setTimeout(r, 1500));

  Promise.all([assetsReady, minTime]).then(() => {
    fakeLoad.kill();
    gsap.to(prog, { v: 1, duration: 0.6, ease: 'power2.out', onUpdate: renderLoader, onComplete: exitLoader });
  });

  function exitLoader() {
    loader.style.background = 'transparent';
    const tl = gsap.timeline({
      onComplete: () => {
        loader.remove();
        body.classList.remove('is-loading');
        startScroll();
        ScrollTrigger.refresh();
      },
    });
    tl.to('.loader__center > *', { y: -40, autoAlpha: 0, duration: 0.6, stagger: 0.06, ease: 'power3.in' })
      .to(loaderCols, { yPercent: -100, duration: 1.2, stagger: 0.07, ease: 'expo.inOut' }, 0.35)
      .add(heroIntro(), 0.6);
  }

  function heroIntro() {
    return gsap.timeline()
      .to('.hero__img', { scale: 1.08, duration: 2.6, ease: 'expo.out' }, 0)
      .to('.gridlines span', { scaleY: 1, duration: 1.6, stagger: 0.06, ease: 'expo.inOut' }, 0)
      .to(heroWords, { yPercent: 0, duration: 1.4, stagger: 0.06, ease: 'expo.out' }, 0.4)
      .to('.hero__eyebrow', { autoAlpha: 0.85, y: 0, duration: 1, ease: 'expo.out' }, 0.5)
      .to('.hero .fade-up', { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.1, ease: 'expo.out' }, 0.9)
      .to('.hero__scroll', { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out' }, 1.1)
      .to(header, { yPercent: 0, duration: 1.2, ease: 'expo.out', clearProps: 'transform' }, 0.8)
      .add(() => $('.wa-float').classList.add('is-in'), 1.6);
  }

  /* ---------------------------------------------------------
     Header behaviour: hide on scroll down, theme by section
     --------------------------------------------------------- */
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      const y = self.scroll();
      header.classList.toggle('is-scrolled', y > 40);
      if (menuOpen || povOpen) return;
      if (self.direction === 1 && y > 320) header.classList.add('is-hidden');
      else if (self.direction === -1) header.classList.remove('is-hidden');
    },
  });

  /* ---------------------------------------------------------
     Cursor
     --------------------------------------------------------- */
  if (fine) {
    const cursor = $('.cursor');
    const dot = $('.cursor__dot');
    const ring = $('.cursor__ring');
    const label = $('.cursor__label');
    const dx = gsap.quickTo(dot, 'x', { duration: 0.12, ease: 'power3' });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.12, ease: 'power3' });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' });
    const ry = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });
    gsap.set([dot, ring], { x: -100, y: -100 });
    addEventListener('mousemove', (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
    document.addEventListener('mouseover', (e) => {
      const el = e.target.closest('[data-cursor], a, button, input, textarea, label');
      cursor.classList.remove('has-label', 'is-hidden', 'is-link');
      if (!el) return;
      const v = el.dataset ? el.dataset.cursor : null;
      if (v === 'hide') cursor.classList.add('is-hidden');
      else if (v) { label.textContent = v; cursor.classList.add('has-label'); }
      else cursor.classList.add('is-link');
    });
    document.addEventListener('mouseleave', () => gsap.to(cursor, { autoAlpha: 0, duration: 0.3 }));
    document.addEventListener('mouseenter', () => gsap.to(cursor, { autoAlpha: 1, duration: 0.3 }));
    addEventListener('mousedown', () => cursor.classList.add('is-down'));
    addEventListener('mouseup', () => cursor.classList.remove('is-down'));
  }

  /* ---------------------------------------------------------
     Magnetic elements
     --------------------------------------------------------- */
  if (fine) {
    $$('.magnetic, .footer__top-ring, .wa-float').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, 0.4)' });
      const strength = el.classList.contains('magnetic') ? 0.35 : 0.25;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength);
        yTo((e.clientY - (r.top + r.height / 2)) * strength);
      });
      el.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
    });
  }

  /* ---------------------------------------------------------
     Hero scroll-out
     --------------------------------------------------------- */
  gsap.timeline({
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
  })
    .fromTo('.hero__media', { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 3% 8% 3%)', ease: 'none' }, 0)
    .to('.hero__img', { yPercent: 14, ease: 'none' }, 0)
    .to('.hero__content', { yPercent: -18, autoAlpha: 0.1, ease: 'none' }, 0);

  /* ---------------------------------------------------------
     Generic reveals
     --------------------------------------------------------- */
  // Section head lines
  $$('.section-head').forEach((h) => {
    gsap.fromTo(h, { '--line': 0 }, {
      '--line': 1, duration: 1.6, ease: 'expo.inOut',
      scrollTrigger: { trigger: h, start: 'top 88%' },
    });
    gsap.fromTo(h.children, { y: 16, autoAlpha: 0 }, {
      y: 0, autoAlpha: 1, duration: 1, stagger: 0.08, ease: 'expo.out',
      scrollTrigger: { trigger: h, start: 'top 88%' },
    });
  });

  // Headings word reveal
  headingSplits.forEach(({ el, words }) => {
    gsap.to(words, {
      yPercent: 0, duration: 1.3, stagger: 0.05, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
    });
  });

  // Fade-ups (outside hero)
  ScrollTrigger.batch($$('.fade-up').filter((el) => !el.closest('.hero')), {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.1, ease: 'expo.out' }),
  });

  // Image reveals + parallax
  $$('.reveal-img').forEach((el) => {
    const img = el.querySelector('img');
    gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%' } })
      .fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut' })
      .fromTo(img, { scale: 1.35 }, { scale: 1, duration: 2, ease: 'expo.out' }, 0.2);
  });
  $$('.parallax').forEach((p) => {
    const s = parseFloat(p.dataset.speed || 10);
    gsap.fromTo(p, { yPercent: -s / 2 }, {
      yPercent: s / 2, ease: 'none',
      scrollTrigger: { trigger: p.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  /* ---------- About: scroll-linked statement ---------- */
  gsap.fromTo(aboutWords, { opacity: 0.14 }, {
    opacity: 1, stagger: 0.1, ease: 'none',
    scrollTrigger: { trigger: '.about__statement', start: 'top 82%', end: 'bottom 50%', scrub: true },
  });
  $$('.about__statement mark').forEach((m) => {
    gsap.fromTo(m, { '--hl': '0%' }, {
      '--hl': '100%', ease: 'none',
      scrollTrigger: { trigger: m, start: 'top 72%', end: 'top 50%', scrub: true },
    });
  });
  $$('.pillar').forEach((p, i) => {
    gsap.timeline({ scrollTrigger: { trigger: '.pillars', start: 'top 85%' } })
      .fromTo(p, { '--line': 0 }, { '--line': 1, duration: 1.4, ease: 'expo.inOut' }, i * 0.12)
      .fromTo(p.children, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.07, ease: 'expo.out' }, i * 0.12 + 0.3);
  });

  /* ---------- Services: rows in + floating preview ---------- */
  gsap.fromTo('.svc', { y: 50, autoAlpha: 0 }, {
    y: 0, autoAlpha: 1, duration: 1.2, stagger: 0.08, ease: 'expo.out',
    scrollTrigger: { trigger: '.svc-list', start: 'top 85%' },
  });

  if (fine) {
    const pv = $('.hover-preview');
    const inner = $('.hover-preview__inner');
    const pvImgs = svcs.map((s) => {
      const im = new Image();
      im.src = s.dataset.img;
      im.alt = '';
      im.decoding = 'async';
      inner.appendChild(im);
      return im;
    });
    gsap.set(pv, { xPercent: -50, yPercent: -50, x: innerWidth / 2, y: innerHeight / 2 });
    gsap.set(pvImgs, { autoAlpha: 0 });
    const px = gsap.quickTo(pv, 'x', { duration: 0.8, ease: 'power3' });
    const py = gsap.quickTo(pv, 'y', { duration: 0.8, ease: 'power3' });
    const pr = gsap.quickTo(pv, 'rotation', { duration: 0.8, ease: 'power3' });
    let lastX = 0;
    let active = -1;
    let z = 1;
    addEventListener('mousemove', (e) => {
      px(e.clientX + 190);
      py(e.clientY);
      pr(clamp((e.clientX - lastX) * 0.6, -10, 10));
      lastX = e.clientX;
    }, { passive: true });
    const list = $('.svc-list');
    svcs.forEach((s, i) => {
      s.addEventListener('mouseenter', () => {
        if (active === i) return;
        active = i;
        const im = pvImgs[i];
        im.style.zIndex = ++z;
        gsap.fromTo(im, { autoAlpha: 1, clipPath: 'inset(100% 0% 0% 0%)', scale: 1.25 },
          { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 0.9, ease: 'expo.out', overwrite: true });
      });
    });
    list.addEventListener('mouseenter', () =>
      gsap.to(inner, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.out', overwrite: true }));
    list.addEventListener('mouseleave', () => {
      active = -1;
      gsap.to(inner, { clipPath: 'inset(50% 50% 50% 50%)', duration: 0.6, ease: 'expo.inOut', overwrite: true });
    });
  }

  /* ---------------------------------------------------------
     Responsive scroll scenes
     --------------------------------------------------------- */
  const mm = gsap.matchMedia();

  // ---- Desktop + phone: horizontal projects + pinned process
  mm.add({ wide: '(min-width: 901px)', phone: '(max-width: 900px) and (min-height: 500px)' }, (ctx) => {
    const { phone } = ctx.conditions;
    const drift = phone ? 0.3 : 1; // menos deslocamento vertical em telas pequenas
    // a classe aplica o layout do celular antes de o ScrollTrigger medir a página
    html.classList.toggle('pin-m', phone);

    const track = $('.projects__track');
    const bar = $('.projects__bar i');
    const current = $('.projects__current');
    const total = cards.length;
    let idx = 0;
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);

    const hTween = gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.projects__pin',
        pin: true,
        start: 'top top',
        end: () => '+=' + dist(),
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate(self) {
          bar.style.transform = `scaleX(${self.progress})`;
          const n = clamp(Math.floor(self.progress * total), 0, total - 1);
          if (n !== idx) {
            const dir = n > idx ? 1 : -1;
            idx = n;
            gsap.timeline()
              .to(current, { yPercent: -100 * dir, autoAlpha: 0, duration: 0.25, ease: 'power2.in' })
              .add(() => (current.textContent = String(n + 1).padStart(2, '0')))
              .fromTo(current, { yPercent: 100 * dir, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.5, ease: 'expo.out' });
          }
        },
      },
    });

    // Depth: inner image parallax + slight vertical drift per card
    cards.forEach((c, i) => {
      const img = c.querySelector('img');
      gsap.set(img, { width: '118%', marginLeft: '-9%' });
      gsap.fromTo(img, { xPercent: -7 }, {
        xPercent: 7, ease: 'none',
        scrollTrigger: { trigger: c, containerAnimation: hTween, start: 'left right', end: 'right left', scrub: true },
      });
      gsap.fromTo(c, { y: (i % 2 ? 50 : -20) * drift }, {
        y: (i % 2 ? -30 : 30) * drift, ease: 'none',
        scrollTrigger: { trigger: c, containerAnimation: hTween, start: 'left right', end: 'right left', scrub: true },
      });
    });

    // Entry: cards clip in as the section arrives
    gsap.fromTo($$('.proj__media', track), { clipPath: 'inset(0% 0% 100% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, stagger: 0.12, ease: 'expo.inOut',
      scrollTrigger: { trigger: '.projects', start: 'top 65%' },
    });
    gsap.fromTo($$('.proj__info', track), { y: 24, autoAlpha: 0 }, {
      y: 0, autoAlpha: 1, duration: 1, stagger: 0.12, ease: 'expo.out',
      scrollTrigger: { trigger: '.projects', start: 'top 55%' },
    });

    // ---- Process pinned stepper
    const steps = $$('.step');
    const figs = $$('.process__media figure');
    const bars = $$('.process__progress span');
    const bigTrack = $('.process__big-track');
    figs.forEach((f, i) => (f.style.zIndex = i + 1));
    gsap.set(figs.slice(1), { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set(steps.slice(1), { autoAlpha: 0 });

    const ptl = gsap.timeline({
      defaults: { ease: 'power3.inOut' },
      scrollTrigger: {
        trigger: '.process__pin',
        pin: true,
        start: 'top top',
        end: '+=' + steps.length * 85 + '%',
        scrub: 0.8,
        snap: { snapTo: 1 / (steps.length - 1), duration: { min: 0.25, max: 0.7 }, delay: 0.08, ease: 'power2.inOut' },
        onUpdate(self) {
          const p = self.progress * (steps.length - 1);
          bars.forEach((b, i) => b.style.setProperty('--p', clamp(p - i + 1, 0, 1)));
          const a = Math.round(p);
          steps.forEach((s, i) => s.classList.toggle('is-active', i === a));
        },
      },
    });
    for (let k = 0; k < steps.length - 1; k++) {
      const at = k;
      ptl.to(steps[k], { autoAlpha: 0, y: -40, duration: 0.4 }, at)
        .fromTo(steps[k + 1], { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.5 }, at + 0.35)
        .from(steps[k + 1].children, { y: 30, stagger: 0.04, duration: 0.5 }, at + 0.35)
        .to(bigTrack, { yPercent: -25 * (k + 1), duration: 0.8, ease: 'power4.inOut' }, at + 0.1)
        .to(figs[k + 1], { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8 }, at + 0.1)
        .fromTo(figs[k + 1].querySelector('img'), { scale: 1.3 }, { scale: 1, duration: 0.9 }, at + 0.1)
        .to(figs[k].querySelector('img'), { scale: 1.1, yPercent: -6, duration: 0.8 }, at + 0.1);
    }
    ptl.to({}, { duration: 0.2 }); // hold on last step

    gsap.fromTo('.process__big, .process__steps, .process__media', { y: 60, autoAlpha: 0 }, {
      y: 0, autoAlpha: 1, duration: 1.3, stagger: 0.1, ease: 'expo.out',
      scrollTrigger: { trigger: '.process', start: 'top 60%' },
    });

    return () => {
      html.classList.remove('pin-m');
      steps.forEach((s, i) => s.classList.toggle('is-active', i === 0));
    };
  });

  // ---- Telas baixas (celular deitado): layout empilhado, sem pin
  mm.add('(max-width: 900px) and (max-height: 499px)', () => {
    cards.forEach((c) => {
      const media = $('.proj__media', c);
      gsap.timeline({ scrollTrigger: { trigger: c, start: 'top 85%' } })
        .fromTo(media, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'expo.inOut' })
        .fromTo(media.querySelector('img'), { scale: 1.35 }, { scale: 1, duration: 1.8, ease: 'expo.out' }, 0.15)
        .fromTo($('.proj__info', c), { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out' }, 0.5);
    });
    $$('.step').forEach((s) => {
      gsap.fromTo(s, { '--fill': 0 }, {
        '--fill': 1, ease: 'none',
        scrollTrigger: { trigger: s, start: 'top 75%', end: 'bottom 60%', scrub: true },
      });
      gsap.fromTo(s.children, { y: 30, autoAlpha: 0 }, {
        y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.07, ease: 'expo.out',
        scrollTrigger: { trigger: s, start: 'top 82%' },
      });
    });
  });

  /* ---------- Header theme (after pins so positions include spacers) ---------- */
  $$('[data-header]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 38px',
      end: 'bottom 38px',
      onToggle: (self) => { if (self.isActive) header.dataset.theme = sec.dataset.header; },
    });
  });

  /* ---------- Statement ---------- */
  const stText = $('.statement__text');
  gsap.fromTo($$('.st-w', stText), { autoAlpha: 0.1, yPercent: 35 }, {
    autoAlpha: 1, yPercent: 0, stagger: 0.12, ease: 'power2.out',
    scrollTrigger: { trigger: stText, start: 'top 85%', end: 'bottom 55%', scrub: 0.6 },
  });
  $$('.st-pill', stText).forEach((pill) => {
    gsap.timeline({ scrollTrigger: { trigger: pill, start: 'top 90%', end: 'top 50%', scrub: 0.6 } })
      .fromTo(pill, { width: 0 }, { width: '1.9em', ease: 'power2.out' })
      .fromTo(pill.querySelector('img'), { scale: 1.6 }, { scale: 1, ease: 'none' }, 0);
  });

  // Marquee driven by time + scroll velocity
  const mq = $('.marquee__track');
  const loop = gsap.to(mq, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
  let dirMq = 1;
  ScrollTrigger.create({
    trigger: '.marquee',
    start: 'top bottom',
    end: 'bottom top',
    onUpdate(self) {
      const v = self.getVelocity();
      if (self.direction !== dirMq) dirMq = self.direction;
      const boost = clamp(Math.abs(v) / 250, 0, 6);
      gsap.to(loop, { timeScale: dirMq * (1 + boost), duration: 0.25, overwrite: true });
      gsap.to(loop, { timeScale: dirMq, duration: 1.2, delay: 0.25, ease: 'power2.out' });
    },
  });

  /* ---------- Contact ---------- */
  gsap.fromTo('.cta-circle', { scale: 0.6, autoAlpha: 0, rotation: -40 }, {
    scale: 1, autoAlpha: 1, rotation: 0, duration: 1.6, ease: 'expo.out',
    scrollTrigger: { trigger: '.contact__grid', start: 'top 85%' },
  });
  gsap.fromTo('.contact__line', { y: 30, autoAlpha: 0 }, {
    y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.08, ease: 'expo.out',
    scrollTrigger: { trigger: '.contact__info', start: 'top 90%' },
  });
  gsap.fromTo('.form > *', { y: 30, autoAlpha: 0 }, {
    y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.06, ease: 'expo.out',
    scrollTrigger: { trigger: '.form', start: 'top 85%' },
  });

  /* ---------- Footer: logo draws itself ---------- */
  const flPaths = $$('.footer__mark .fl');
  flPaths.forEach((p) => {
    const len = (p.getTotalLength ? p.getTotalLength() : 200) + 4;
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
  });
  gsap.timeline({ scrollTrigger: { trigger: '.footer__logo', start: 'top 92%', end: 'bottom bottom', scrub: 0.8 } })
    .to(flPaths, { strokeDashoffset: 0, stagger: 0.12, ease: 'none' })
    .fromTo('.footer__mark .fl-txt', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, ease: 'none' }, '-=0.3');
  gsap.fromTo('.footer__col, .footer__top-btn', { y: 30, autoAlpha: 0 }, {
    y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.08, ease: 'expo.out',
    scrollTrigger: { trigger: '.footer', start: 'top 85%' },
  });

  // Refresh once images settle (layout may shift)
  addEventListener('load', () => ScrollTrigger.refresh());
})();
