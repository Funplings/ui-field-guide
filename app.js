(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const scrollBehavior = () => (reduceMotion.matches ? 'auto' : 'smooth');
  const isTyping = el => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

  // Captions and name tags are visual annotations; screen readers already get roles and labels.
  $$('.cap, .rtag').forEach(n => n.setAttribute('aria-hidden', 'true'));

  /* ---------- Sticky header offset ---------- */
  const header = $('#site-header');
  const setHeaderH = () => {
    const sticky = getComputedStyle(header).position === 'sticky';
    root.style.setProperty('--header-h', (sticky ? header.offsetHeight : 0) + 'px');
  };
  setHeaderH();
  if ('ResizeObserver' in window) new ResizeObserver(setHeaderH).observe(header);
  addEventListener('resize', setHeaderH);

  /* ---------- Term index ---------- */
  const items = $$('.card[id^="t-"], .glossary > div[id^="t-"]').map(el => {
    const section = el.closest('.cat');
    const name = $('h3, dt', el).textContent.trim();
    const aka = ($('.aka', el)?.textContent || '').replace(/^aka\s*/i, '').trim();
    const def = $('.def, dd', el).textContent.trim();
    return {
      el, id: el.id, slug: el.id.slice(2), name, aka, def,
      cat: section.dataset.cat, catLabel: section.dataset.label,
      hay: `${name} ${aka} ${def}`.toLowerCase(),
    };
  });
  const bySlug = new Map(items.map(t => [t.slug, t]));
  const byName = [...items].sort((a, b) => a.name.localeCompare(b.name));
  $$('[data-total]').forEach(n => { n.textContent = items.length; });
  $('#search').placeholder = `Search ${items.length} terms`;

  /* ---------- Toasts ---------- */
  const toasts = $('#toasts');
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.dataset.ui = 'toast';
    const tag = document.createElement('span');
    tag.className = 'toast-tag';
    tag.setAttribute('aria-hidden', 'true');
    tag.textContent = 'Toast';
    const text = document.createElement('span');
    text.textContent = msg;
    t.append(tag, text);
    toasts.append(t);
    while (toasts.children.length > 3) toasts.firstElementChild.remove();
    setTimeout(() => {
      t.classList.add('leaving');
      setTimeout(() => t.remove(), 220);
    }, 3600);
  }

  /* ---------- Jump to a term ---------- */
  function goTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.hidden || el.closest('[hidden]')) resetFilters();
    el.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  }

  /* ---------- Search + category filter ---------- */
  const search = $('#search');
  const chips = $$('#chips .chip');
  const glossaryCard = $('.glossary-card');
  const toolbar = $('#toolbar');
  let query = '';
  let category = 'all';

  function applyFilter() {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const perCat = {};
    let shown = 0;
    items.forEach(t => {
      const ok = (category === 'all' || t.cat === category) && words.every(w => t.hay.includes(w));
      t.el.hidden = !ok;
      if (ok) { shown++; perCat[t.cat] = (perCat[t.cat] || 0) + 1; }
    });
    glossaryCard.hidden = !$$('.glossary > div', glossaryCard).some(d => !d.hidden);
    $$('.cat').forEach(s => {
      const n = perCat[s.dataset.cat] || 0;
      s.hidden = n === 0;
      $('.cat-count', s).textContent = `${n} ${n === 1 ? 'term' : 'terms'}`;
    });
    $$('[data-count]').forEach(b => { b.textContent = perCat[b.dataset.count] || 0; });
    $('#results').textContent = shown === items.length
      ? `Showing all ${items.length} terms`
      : `Showing ${shown} of ${items.length} terms`;
    $('#empty').hidden = shown > 0;
    $('#empty-q').textContent = query.trim() || category;
  }

  function setCategory(cat) {
    category = cat;
    chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.filter === cat)));
    applyFilter();
  }

  function resetFilters() {
    query = '';
    search.value = '';
    setCategory('all');
  }

  search.addEventListener('input', () => {
    query = search.value;
    applyFilter();
    if (toolbar.getBoundingClientRect().top < 0) toolbar.scrollIntoView({ behavior: 'auto', block: 'start' });
  });
  search.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const first = items.find(t => !t.el.hidden);
      if (first) goTo(first.id);
    }
  });
  chips.forEach(c => c.addEventListener('click', () => {
    setCategory(c.dataset.filter);
    if (toolbar.getBoundingClientRect().top < 0) toolbar.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  }));
  $('#clear-search').addEventListener('click', () => { resetFilters(); search.focus(); });
  applyFilter();

  /* ---------- Sidebar scrollspy + back to top ---------- */
  const sections = $$('.cat');
  const toTop = $('#to-top');
  let spyQueued = false;
  function onScroll() {
    if (spyQueued) return;
    spyQueued = true;
    requestAnimationFrame(() => {
      spyQueued = false;
      const line = parseFloat(getComputedStyle(root).getPropertyValue('--header-h')) + 140;
      let current = null;
      sections.forEach(s => { if (!s.hidden && s.getBoundingClientRect().top < line) current = s.id; });
      $$('.toc a').forEach(a => {
        if (a.getAttribute('href') === '#' + current) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      toTop.hidden = scrollY < 900 || inspecting;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  $$('[data-to-top]').forEach(b => b.addEventListener('click', () => scrollTo({ top: 0, behavior: scrollBehavior() })));

  /* ---------- Dialogs ---------- */
  $$('[data-open]').forEach(b => b.addEventListener('click', () => {
    const d = document.getElementById(b.dataset.open);
    if (d && !d.open) d.showModal();
  }));
  $$('dialog').forEach(d => d.addEventListener('click', e => {
    if (e.target === d || e.target.closest('[data-close]')) d.close();
  }));
  const tocDrawer = $('#toc-drawer');
  tocDrawer.innerHTML = $('#toc').innerHTML;
  tocDrawer.addEventListener('click', e => { if (e.target.closest('a')) $('#nav-drawer').close(); });

  $('[data-dismiss="banner"]').addEventListener('click', () => { $('#banner').hidden = true; setHeaderH(); });

  /* ---------- Command palette ---------- */
  const pal = $('#palette');
  const palInput = $('#palette-input');
  const palList = $('#palette-list');
  let palResults = [];
  let palSel = 0;

  function rank(q) {
    if (!q) return byName;
    const score = t => {
      const n = t.name.toLowerCase();
      if (n.startsWith(q)) return 0;
      if (n.includes(q)) return 1;
      if (t.aka.toLowerCase().includes(q)) return 2;
      if (t.hay.includes(q)) return 3;
      return 9;
    };
    return items.map(t => [score(t), t]).filter(x => x[0] < 9)
      .sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name)).map(x => x[1]);
  }
  function renderPalette() {
    palResults = rank(palInput.value.trim().toLowerCase());
    palSel = Math.min(palSel, Math.max(palResults.length - 1, 0));
    palList.textContent = '';
    if (!palResults.length) {
      const li = document.createElement('li');
      li.className = 'none';
      li.textContent = 'No matching terms';
      palList.append(li);
      palInput.removeAttribute('aria-activedescendant');
      return;
    }
    palResults.forEach((t, i) => {
      const li = document.createElement('li');
      li.role = 'option';
      li.id = 'pal-opt-' + i;
      li.dataset.i = i;
      li.setAttribute('aria-selected', String(i === palSel));
      const name = document.createElement('span');
      name.textContent = t.name;
      const cat = document.createElement('span');
      cat.className = 'pl-cat';
      cat.textContent = t.catLabel;
      li.append(name, cat);
      palList.append(li);
    });
    palInput.setAttribute('aria-activedescendant', 'pal-opt-' + palSel);
  }
  function movePalette(i) {
    if (!palResults.length) return;
    palSel = (i + palResults.length) % palResults.length;
    $$('li', palList).forEach((li, n) => li.setAttribute('aria-selected', String(n === palSel)));
    palInput.setAttribute('aria-activedescendant', 'pal-opt-' + palSel);
    $('#pal-opt-' + palSel)?.scrollIntoView({ block: 'nearest' });
  }
  function choosePalette(i) {
    const t = palResults[i];
    if (!t) return;
    pal.close();
    goTo(t.id);
  }
  function openPalette() {
    if (inspecting) setInspect(false);
    $$('dialog[open]').forEach(d => { if (d !== pal) d.close(); });
    if (pal.open) return;
    palInput.value = '';
    palSel = 0;
    renderPalette();
    pal.showModal();
    palInput.focus();
  }
  palInput.addEventListener('input', () => { palSel = 0; renderPalette(); });
  palInput.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); movePalette(palSel + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); movePalette(palSel - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); choosePalette(palSel); }
  });
  palList.addEventListener('click', e => {
    const li = e.target.closest('li[data-i]');
    if (li) choosePalette(+li.dataset.i);
  });
  palList.addEventListener('mousemove', e => {
    const li = e.target.closest('li[data-i]');
    if (li && +li.dataset.i !== palSel) movePalette(+li.dataset.i);
  });
  $$('[data-open-palette]').forEach(b => b.addEventListener('click', openPalette));

  /* ---------- Inspect mode ---------- */
  const inspectToggle = $('#inspect-toggle');
  const heroInspect = $('#hero-inspect');
  const ov = $('#inspect-ov');
  const ovName = $('.iov-name', ov);
  const ovSize = $('.iov-size', ov);
  const panel = $('#inspector');
  const inspName = $('#insp-name');
  const inspMeta = $('#insp-meta');
  const inspAka = $('#insp-aka');
  const inspDef = $('#insp-def');
  const inspKicker = $('#insp-kicker');
  const inspJump = $('#insp-jump');
  let inspecting = false;
  let hoverEl = null;
  let pinned = null;

  function setInspect(on) {
    inspecting = on;
    inspectToggle.checked = on;
    document.body.classList.toggle('inspecting', on);
    heroInspect.setAttribute('aria-pressed', String(on));
    $('span', heroInspect).textContent = on ? 'Turn off Inspect mode' : 'Turn on Inspect mode';
    panel.hidden = !on;
    hoverEl = pinned = null;
    ov.hidden = true;
    if (on) renderPanel(null);
    onScroll();
  }

  function sizeOf(el) {
    const r = el.getBoundingClientRect();
    return `${Math.round(r.width)} × ${Math.round(r.height)}`;
  }

  function place(el) {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) { ov.hidden = true; return; }
    const t = bySlug.get(el.dataset.ui);
    ov.hidden = false;
    ov.style.transform = `translate(${r.left}px, ${r.top}px)`;
    ov.style.width = r.width + 'px';
    ov.style.height = r.height + 'px';
    ovName.textContent = t ? t.name : el.dataset.ui;
    ovSize.textContent = sizeOf(el);
    ovName.classList.toggle('inside', r.top < 24);
    ovSize.classList.toggle('inside', r.bottom > innerHeight - 24);
  }

  function renderPanel(el) {
    const t = el ? bySlug.get(el.dataset.ui) : null;
    if (!t) {
      inspKicker.textContent = 'Inspect mode';
      inspName.textContent = 'Point at anything';
      inspDef.textContent = 'Hover over (or tap) any part of the page to see what it’s called. Click to pin it here. Press Esc to exit.';
      inspMeta.hidden = inspAka.hidden = inspJump.hidden = true;
      return;
    }
    inspKicker.textContent = 'Selected element';
    inspName.textContent = t.name;
    inspMeta.textContent = `<${el.tagName.toLowerCase()}> · ${sizeOf(el)} px`;
    inspMeta.hidden = false;
    inspAka.textContent = t.aka ? 'aka ' + t.aka : '';
    inspAka.hidden = !t.aka;
    inspDef.textContent = t.def;
    inspJump.hidden = false;
    inspJump.dataset.target = t.id;
  }

  inspectToggle.addEventListener('change', () => setInspect(inspectToggle.checked));
  heroInspect.addEventListener('click', () => setInspect(!inspecting));
  $('#insp-close').addEventListener('click', () => setInspect(false));
  inspJump.addEventListener('click', e => { e.preventDefault(); goTo(inspJump.dataset.target); });

  document.addEventListener('pointermove', e => {
    if (!inspecting || e.pointerType === 'touch') return;
    const el = e.target.closest?.('[data-ui]') || null;
    if (el === hoverEl) return;
    hoverEl = el;
    if (el) place(el);
    else if (pinned) place(pinned);
    else ov.hidden = true;
  }, { passive: true });

  addEventListener('scroll', () => {
    const el = hoverEl || pinned;
    if (inspecting && el) place(el);
  }, { passive: true, capture: true });

  // While inspecting, clicks select elements instead of activating them.
  const intercept = e => {
    const target = e.target instanceof Element ? e.target : null;
    if (!inspecting || !target || target.closest('.inspect-safe')) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type !== 'click') return;
    const el = target.closest('[data-ui]');
    if (!el) return;
    pinned = el;
    place(el);
    renderPanel(el);
  };
  document.addEventListener('click', intercept, true);
  document.addEventListener('mousedown', intercept, true);

  /* ---------- Keyboard shortcuts ---------- */
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); return; }
    if (e.key === 'Escape') {
      if ($('dialog[open]')) return;
      if (inspecting) { setInspect(false); return; }
      closeMenus();
      return;
    }
    if (isTyping(document.activeElement) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); search.focus(); }
    else if (e.key === 'i' || e.key === 'I') setInspect(!inspecting);
  });

  /* ---------- Toast triggers ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-toast]');
    if (b) toast(b.dataset.toast);
  });

  /* ---------- Menus ---------- */
  function closeMenus(except) {
    $$('[data-menu][aria-expanded="true"]').forEach(b => {
      if (b === except || b.hasAttribute('data-menu-static')) return;
      b.setAttribute('aria-expanded', 'false');
      b.nextElementSibling.hidden = true;
    });
  }
  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-menu]');
    if (trigger) {
      const open = trigger.getAttribute('aria-expanded') !== 'true';
      closeMenus(trigger);
      trigger.setAttribute('aria-expanded', String(open));
      trigger.nextElementSibling.hidden = !open;
      return;
    }
    if (e.target.closest('.menu button')) { closeMenus(); return; }
    if (!e.target.closest('.menu')) closeMenus();
  });

  /* ---------- Single-choice groups (segmented, nav, selected) ---------- */
  $$('[data-single]').forEach(group => group.addEventListener('click', e => {
    const b = e.target.closest('button, a');
    if (!b || !group.contains(b)) return;
    e.preventDefault();
    const attr = group.dataset.single;
    $$('button, a', group).forEach(x => {
      if (attr === 'aria-pressed') x.setAttribute('aria-pressed', String(x === b));
      else if (x === b) x.setAttribute('aria-current', 'page');
      else x.removeAttribute('aria-current');
    });
  }));

  /* ---------- Tabs ---------- */
  $$('[role="tablist"]').forEach(list => {
    const tabs = $$('[role="tab"]', list);
    const select = tab => tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    list.addEventListener('click', e => { const t = e.target.closest('[role="tab"]'); if (t) select(t); });
    list.addEventListener('keydown', e => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      const next = tabs[(i + step + tabs.length) % tabs.length];
      next.focus();
      select(next);
    });
  });

  /* ---------- Pagination ---------- */
  $$('.pager').forEach(p => {
    const pages = $$('.pg[data-page]', p);
    p.addEventListener('click', e => {
      const b = e.target.closest('.pg');
      if (!b) return;
      const cur = pages.findIndex(x => x.hasAttribute('aria-current'));
      const next = b.dataset.page ? pages.indexOf(b) : Math.min(Math.max(cur + +b.dataset.step, 0), pages.length - 1);
      pages.forEach((x, i) => (i === next ? x.setAttribute('aria-current', 'page') : x.removeAttribute('aria-current')));
    });
  });

  /* ---------- Toggle button & like ---------- */
  $$('[data-toggle-pressed]').forEach(b => b.addEventListener('click', () => {
    b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
  }));
  const like = $('#like');
  const likeCount = $('#like-count');
  like.addEventListener('click', () => {
    const on = like.getAttribute('aria-pressed') !== 'true';
    like.setAttribute('aria-pressed', String(on));
    likeCount.textContent = +likeCount.textContent + (on ? 1 : -1);
    like.classList.remove('pop');
    void like.offsetWidth;
    if (on) like.classList.add('pop');
  });

  /* ---------- Inputs ---------- */
  $('#cb-indet').indeterminate = true;

  const slider = $('#f-slider');
  slider.addEventListener('input', () => { $('#f-slider-out').textContent = slider.value; });

  const num = $('#num-input');
  $$('[data-num]').forEach(b => b.addEventListener('click', () => {
    const v = Math.min(99, Math.max(0, (parseInt(num.value, 10) || 0) + +b.dataset.num));
    num.value = v;
  }));

  const rating = $('#rating');
  const stars = $$('button', rating);
  const setRating = v => {
    stars.forEach(s => {
      s.classList.toggle('on', +s.dataset.v <= v);
      s.setAttribute('aria-checked', String(+s.dataset.v === v));
    });
    $('#rating-cap').textContent = `Rating · ${v} of 5`;
  };
  rating.addEventListener('click', e => { const s = e.target.closest('button'); if (s) setRating(+s.dataset.v); });
  setRating(4);

  const otp = $$('#otp input');
  otp.forEach((input, i) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(-1);
      if (input.value && otp[i + 1]) otp[i + 1].focus();
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !input.value && otp[i - 1]) otp[i - 1].focus();
    });
  });

  const drop = $('#dropzone');
  const fileInput = $('#file-input');
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, () => drop.classList.remove('over')));
  drop.addEventListener('drop', e => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) toast(`Drop zone received “${f.name}”. It stays on your device.`);
  });
  fileInput.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    if (f) toast(`File picker chose “${f.name}”. It stays on your device.`);
  });

  /* Combobox over the real term list */
  const comboIn = $('#combo-input');
  const comboList = $('#combo-list');
  let comboSel = 0;
  let comboRes = [];
  function renderCombo() {
    const q = comboIn.value.trim().toLowerCase();
    comboRes = (q ? byName.filter(t => t.name.toLowerCase().includes(q)) : byName).slice(0, 5);
    comboSel = Math.min(comboSel, Math.max(comboRes.length - 1, 0));
    comboList.textContent = '';
    if (!comboRes.length) {
      const li = document.createElement('li');
      li.className = 'none';
      li.textContent = 'No matches';
      comboList.append(li);
      comboIn.removeAttribute('aria-activedescendant');
      return;
    }
    comboRes.forEach((t, i) => {
      const li = document.createElement('li');
      li.role = 'option';
      li.id = 'combo-opt-' + i;
      li.dataset.id = t.id;
      li.setAttribute('aria-selected', String(i === comboSel));
      const name = document.createElement('span');
      const at = q ? t.name.toLowerCase().indexOf(q) : -1;
      if (at >= 0) {
        const mark = document.createElement('mark');
        mark.textContent = t.name.slice(at, at + q.length);
        name.append(t.name.slice(0, at), mark, t.name.slice(at + q.length));
      } else {
        name.textContent = t.name;
      }
      const cat = document.createElement('span');
      cat.className = 'c-cat';
      cat.textContent = t.catLabel;
      li.append(name, cat);
      comboList.append(li);
    });
    comboIn.setAttribute('aria-activedescendant', 'combo-opt-' + comboSel);
  }
  comboIn.addEventListener('input', () => { comboSel = 0; renderCombo(); });
  comboIn.addEventListener('keydown', e => {
    if (!comboRes.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      comboSel = (comboSel + (e.key === 'ArrowDown' ? 1 : -1) + comboRes.length) % comboRes.length;
      renderCombo();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      goTo(comboRes[comboSel].id);
    }
  });
  comboList.addEventListener('click', e => { const li = e.target.closest('li[data-id]'); if (li) goTo(li.dataset.id); });
  renderCombo();

  /* Date picker */
  const dpGrid = $('#dp-grid');
  const dpTitle = $('#dp-title');
  const dpInput = $('#dp-input');
  const today = new Date();
  let selected = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let view = new Date(today.getFullYear(), today.getMonth(), 1);
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  function renderCal() {
    const y = view.getFullYear();
    const m = view.getMonth();
    dpTitle.textContent = view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    dpInput.value = selected.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    dpGrid.textContent = '';
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => {
      const s = document.createElement('span');
      s.className = 'cal-dow';
      s.textContent = d;
      dpGrid.append(s);
    });
    for (let i = 0; i < new Date(y, m, 1).getDay(); i++) dpGrid.append(document.createElement('span'));
    const days = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cal-day' + (sameDay(date, today) ? ' today' : '');
      b.textContent = d;
      b.setAttribute('aria-label', date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }));
      b.setAttribute('aria-pressed', String(sameDay(date, selected)));
      b.addEventListener('click', () => { selected = date; renderCal(); });
      dpGrid.append(b);
    }
  }
  $('#dp-prev').addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); renderCal(); });
  $('#dp-next').addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); renderCal(); });
  renderCal();

  /* ---------- Content specimens ---------- */
  const carousel = $('#carousel');
  const track = $('.car-track', carousel);
  const dots = $$('.car-dots button', carousel);
  let slide = 0;
  const showSlide = i => {
    slide = (i + dots.length) % dots.length;
    track.style.transform = `translateX(-${slide * 100}%)`;
    dots.forEach((d, n) => (n === slide ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
  };
  $('.car-btn.prev', carousel).addEventListener('click', () => showSlide(slide - 1));
  $('.car-btn.next', carousel).addEventListener('click', () => showSlide(slide + 1));
  dots.forEach((d, n) => d.addEventListener('click', () => showSlide(n)));

  $$('[data-remove-chip]').forEach(b => b.addEventListener('click', () => { b.closest('.chip').hidden = true; }));

  const popover = $('#popover-demo');
  const popTrigger = $('#popover-trigger');
  popTrigger.addEventListener('click', () => {
    popover.hidden = !popover.hidden;
    popTrigger.setAttribute('aria-expanded', String(!popover.hidden));
  });

  /* Design token value follows the live theme */
  const fillTokens = () => $$('[data-token]').forEach(n => {
    const v = getComputedStyle(root).getPropertyValue(n.dataset.token).trim();
    if (v) n.textContent = v.toUpperCase();
  });
  fillTokens();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', fillTokens);
  new MutationObserver(fillTokens).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  onScroll();
})();
