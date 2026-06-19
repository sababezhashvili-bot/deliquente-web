/* =====================================================================
   DELIQUENTE PENSAMIENTO — APP CORE
   store · render · detail routing · animations · 3D gallery
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- tiny helpers ---------- */
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const STORE_KEY = "dp_site_v1";

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), 2400);
  }

  /* ---------- API CLIENT ----------
   * In production (Vercel), /api/* is proxied to Railway via vercel.json.
   * In local dev (Python server on port 5500), the Railway API won't be
   * reachable — app gracefully falls back to localStorage only.
   * -------------------------------- */
  const _apiBase = ''; // always use relative URL — Vercel proxy handles routing

  async function _apiFetch(path, opts = {}) {
    try {
      const r = await fetch(_apiBase + path, {
        ...opts,
        headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) }
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      return null; // API unavailable — caller uses localStorage fallback
    }
  }

  /* ---------- STORE ---------- */
  let DATA;
  function deepMerge(base, over) {
    if (Array.isArray(base)) return over !== undefined ? clone(over) : clone(base);
    if (base && typeof base === "object") {
      const out = {};
      for (const k in base) out[k] = deepMerge(base[k], over ? over[k] : undefined);
      if (over) for (const k in over) if (!(k in out)) out[k] = clone(over[k]);
      return out;
    }
    return over !== undefined ? over : base;
  }

  /**
   * loadStore() — async.
   * Priority: API (Railway PostgreSQL) → localStorage cache → DEFAULT_DATA
   */
  async function loadStore() {
    /* 1. Try API.
       The DB is authoritative whenever it holds a real saved record — i.e. a
       non-error object that has a `works` array (even an EMPTY one) or a `meta`
       block. A truly un-seeded DB returns null, which correctly falls through
       to the localStorage / defaults path below. (Earlier this required
       works.length > 0, which made deleting every work resurrect the defaults
       and made the two domains diverge.) */
    const apiData = await _apiFetch('/api/data');
    const apiValid = apiData &&
      typeof apiData === 'object' &&
      !apiData.error &&
      (Array.isArray(apiData.works) || !!apiData.meta);

    if (apiValid) {
      DATA = deepMerge(DEFAULT_DATA, apiData);
      /* Update localStorage cache silently */
      try { localStorage.setItem(STORE_KEY, JSON.stringify(DATA)); } catch (_) {}
      return;
    }
    /* 2. Fallback: localStorage cache */
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (_) {}
    if (saved && Array.isArray(saved.works) && saved.works.length > 0) {
      DATA = deepMerge(DEFAULT_DATA, saved);
      /* Push local cache to API so other devices sync */
      const pwd = window.DPAdmin?._adminPassword;
      if (pwd) _apiFetch('/api/data', { method:'PUT', body: JSON.stringify({ password: pwd, data: DATA }) });
      return;
    }
    /* 3. Last resort: built-in defaults */
    DATA = clone(DEFAULT_DATA);
  }

  /**
   * saveStore() — saves immediately to localStorage, then syncs to API
   * asynchronously (non-blocking). Requires admin password stored in
   * window.DPAdmin._adminPassword after login.
   */
  function saveStore() {
    /* 1. Immediate localStorage save */
    try { localStorage.setItem(STORE_KEY, JSON.stringify(DATA)); }
    catch (e) { toast("⚠ localStorage სავსეა — ექსპორტი გამოიყენე"); }

    /* 2. Async API sync (only when admin is logged in) */
    const pwd = window.DPAdmin?._adminPassword;
    if (pwd) {
      fetch(_apiBase + '/api/data', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd, data: DATA })
      }).catch(() => {}); /* silent — localStorage is always the safety net */
    }
  }
  function getPath(p) { return p.split(".").reduce((o, k) => (o ? o[k] : undefined), DATA); }
  function setPath(p, v) {
    const ks = p.split("."); const last = ks.pop();
    const tgt = ks.reduce((o, k) => o[k], DATA);
    tgt[last] = v;
  }

  /* ---------- works helpers ---------- */
  const workById = (id) => DATA.works.find((w) => w.id === id);
  const imgFor   = (id) => { const w = workById(id); return w ? w.img : ""; };

  /* ===================================================================
     RENDER
     =================================================================== */
  /* Bind static text (nav brand, footer, works heading) from data */
  function bindStaticText() {
    const m  = DATA.meta        || {};
    const ws = DATA.worksSection || {};
    const ab = DATA.about       || {};
    const el = id => document.getElementById(id);

    if (m.navTitle) {
      const n1 = el("navTitle");          if (n1) n1.textContent = m.navTitle;
      const fn = el("footerArtistName");  if (fn) fn.textContent = m.navTitle;
    }
    if (m.navSubtitle) {
      const n2 = el("navSubtitle");  if (n2) n2.textContent = m.navSubtitle;
      const fs = el("footerSubtitle"); if (fs) fs.textContent = m.navSubtitle;
    }
    if (m.city) {
      const fc = el("footerCity"); if (fc) fc.textContent = m.city;
    }
    if (ws.heading) {
      const wh = el("worksHeading");
      if (wh) wh.innerHTML = ws.heading.split("\n").map(l => escapeHTML(l)).join("<br>");
    }
    if (ws.tagline !== undefined) {
      const wt = el("worksTagline"); if (wt) wt.textContent = ws.tagline;
    }
    const an1 = el("aboutNote1"); if (an1 && ab.studioNote1 !== undefined) an1.textContent = ab.studioNote1;
    const an2 = el("aboutNote2"); if (an2 && ab.studioNote2 !== undefined) an2.textContent = ab.studioNote2;

    /* ---- UI microcopy (nav, form, detail bar) ---- */
    const ui = DATA.ui || {};
    const setText = (id, val) => { const n = el(id); if (n && val !== undefined && val !== null) n.textContent = val; };
    const setAttr = (id, attr, val) => { const n = el(id); if (n && val !== undefined && val !== null) n.setAttribute(attr, val); };

    setText("menuBtnLabel", ui.menuLabel);
    setText("detailEyebrow", ui.detail && ui.detail.eyebrow);
    setText("detailBack", ui.detail && ui.detail.back);

    /* contact form labels / placeholders / options / messages */
    const fm = ui.form || {};
    setText("fNameLabel",  fm.nameLabel);
    setText("fEmailLabel", fm.emailLabel);
    setText("fTypeLabel",  fm.typeLabel);
    setText("fMsgLabel",   fm.msgLabel);
    setText("fSubmit",     fm.submit);
    setText("fOk",         fm.okMsg);
    setAttr("fName", "placeholder", fm.namePlaceholder);
    setAttr("fEmail","placeholder", fm.emailPlaceholder);
    setAttr("fMsg",  "placeholder", fm.msgPlaceholder);
    /* type dropdown options (comma-separated string) */
    const sel = el("fType");
    if (sel && fm.typeOptions !== undefined) {
      const prev = sel.value;
      const opts = String(fm.typeOptions).split(",").map(s => s.trim()).filter(Boolean);
      sel.innerHTML = opts.map(o => `<option>${escapeHTML(o)}</option>`).join("");
      if (opts.includes(prev)) sel.value = prev;
    }

    renderNav();
  }

  /* Build the nav menu links from DATA.ui.nav.links (label + target). */
  function renderNav() {
    const wrap = document.getElementById("navLinks");
    if (!wrap) return;
    const links = (DATA.ui && DATA.ui.nav && DATA.ui.nav.links) || [];
    /* remove previously-injected links (keep the close button) */
    wrap.querySelectorAll("a[data-nav-link]").forEach(a => a.remove());
    const closeMenu = () => wrap.classList.remove("open");
    links.forEach(lk => {
      const a = document.createElement("a");
      a.href = "#" + (lk.target || "");
      a.textContent = lk.label || "";
      a.setAttribute("data-nav-link", lk.target || "");
      a.addEventListener("click", closeMenu);
      wrap.appendChild(a);
    });
    /* refresh hidden-section visibility (link display depends on it) */
    applyHiddenSections();
  }

  /* Show/hide sections (and their nav links) based on meta.hiddenSections.
     Works for built-in sections AND custom ones (id starts with "cs-"). */
  function applyHiddenSections() {
    const hidden  = (DATA.meta && DATA.meta.hiddenSections) || [];
    const isAdmin = document.body.classList.contains("admin");
    /* every section that has an id (built-in + custom) */
    document.querySelectorAll('main > section[id], .custom-section[id]').forEach(sec => {
      const id   = sec.id;
      const hide = hidden.includes(id);
      sec.style.display = (!isAdmin && hide) ? 'none' : '';
      sec.classList.toggle('section-hidden-admin', isAdmin && hide);
    });
    /* nav links: hide a link whose target section is hidden */
    document.querySelectorAll('.nav-links a[data-nav-link]').forEach(lnk => {
      const target = lnk.getAttribute('data-nav-link');
      lnk.style.display = hidden.includes(target) ? 'none' : '';
    });
  }

  /* Reorder sections inside <main> according to meta.sectionOrder.
     Hero (<header>) always stays first; unknown/unlisted sections keep trailing. */
  function applySectionOrder() {
    const main = document.getElementById('top');
    if (!main) return;
    const order = (DATA.meta && DATA.meta.sectionOrder) || [];
    if (!order.length) return;
    order.forEach(id => {
      const sec = document.getElementById(id);
      if (sec && sec.parentElement === main) main.appendChild(sec);
    });
    /* any section not named in the order list is appended after, in DOM order */
    main.querySelectorAll(':scope > section[id]').forEach(sec => {
      if (!order.includes(sec.id)) main.appendChild(sec);
    });
  }

  function bindEditables() {
    $$("[data-edit]").forEach((node) => {
      const val = getPath(node.dataset.edit);
      if (val == null) return;
      if (node.dataset.edit === "hero.name") {
        node.innerHTML = String(val).split("\n")
          .map((l) => `<span class="ln">${escapeHTML(l)}</span>`).join("");
      } else if (node.dataset.edit === "contact.heading") {
        node.textContent = val;
      } else {
        node.textContent = val;
      }
    });
  }
  function escapeHTML(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}

  /* heroSlider is set by initHeroSlider(); renderHero delegates to it */
  let heroSlider = null;

  function renderHero() {
    const h = DATA.hero;
    if (heroSlider) {
      heroSlider.goToWork(h.featuredWorkId);
    } else {
      /* first render before slider init */
      $("#heroImg").src = imgFor(h.featuredWorkId);
      const w = workById(h.featuredWorkId);
      $("#heroTag").textContent = w ? `${w.title} · ${w.year}` : "";
    }
  }

  function renderGallery() {
    const g = $("#gallery"); g.innerHTML = "";
    /* update ticker with current titles (doubled for seamless loop) */
    const ticker = $("#gallery").parentElement && document.querySelector(".gallery-ticker-inner");
    if (ticker) {
      const titles = DATA.works.map(w =>
        `<span class="ticker-item" data-ticker-id="${escapeHTML(w.id)}" role="link" tabindex="0">${escapeHTML(w.title)}</span>`
      ).join("");
      ticker.innerHTML = titles + titles; /* duplicate for seamless */
      if (!ticker._wired) {
        ticker._wired = true;
        const goto = (el) => { const id = el && el.dataset.tickerId; if (id) location.hash = "work/" + id; };
        ticker.addEventListener("click", (e) => {
          const it = e.target.closest(".ticker-item"); if (it) goto(it);
        });
        ticker.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            const it = e.target.closest(".ticker-item"); if (it) { e.preventDefault(); goto(it); }
          }
        });
      }
    }
    DATA.works.forEach((w, i) => {
      const c = document.createElement("article");
      c.className = "card";
      c.dataset.size = w.size || "md";
      c.dataset.id = w.id;
      c.innerHTML = `
        <div class="media">
          <div class="card-tools">
            <button data-tool="size" title="ზომა">⤢</button>
            <button data-tool="edit" title="რედაქტირება">✎</button>
            <button data-tool="open" title="გახსნა / Detail">↗</button>
            <button data-tool="del" title="წაშლა">✕</button>
          </div>
          <span class="corner">${String(i + 1).padStart(2, "0")}</span>
          <img src="${w.img}" alt="${escapeHTML(w.alt || w.title)}" title="${escapeHTML(w.alt || w.title)}" loading="lazy">
          <div class="view-cue">↗</div>
        </div>
        <div class="cap">
          <span class="ix">${String(i + 1).padStart(2, "0")}</span>
          <div class="tt">
            <h3>${escapeHTML(w.title)}</h3>
            <div class="meta">${escapeHTML(w.year)} — ${escapeHTML(w.medium)}</div>
            ${(w.showPrice && w.price) ? `<div class="price-tag">${escapeHTML(w.price)}</div>` : ""}
          </div>
        </div>`;
      c.addEventListener("click", (e) => {
        if (e.target.closest(".card-tools,.resize-handle,.img-reset-btn,.size-drag-indicator")) return;
        location.hash = "work/" + w.id;
      });
      g.appendChild(c);
    });
    observeReveal();
    if (window.DPAdmin) window.DPAdmin.wireCards();
  }

  function renderAbout() {
    $("#aboutPortrait").src = imgFor(DATA.about.portraitWorkId);
    const box = $("#aboutNotes"); box.innerHTML = "";
    (DATA.about.notes || []).forEach((n) => {
      const s = document.createElement("span"); s.textContent = n; box.appendChild(s);
    });
    const an1 = document.getElementById("aboutNote1");
    const an2 = document.getElementById("aboutNote2");
    if (an1 && DATA.about.studioNote1 !== undefined) an1.textContent = DATA.about.studioNote1;
    if (an2 && DATA.about.studioNote2 !== undefined) an2.textContent = DATA.about.studioNote2;
  }

  function renderStudio() {
    const h = $("#hscroll"); h.innerHTML = "";
    const isAdmin = document.body.classList.contains("admin");
    DATA.studio.captions.forEach((cap, i) => {
      const w = workById(cap.workId);
      const s = document.createElement("div"); s.className = "hslide reveal";
      s.innerHTML = `
        <div class="ph"><span class="num">${String(i + 1).padStart(2, "0")} / PROCESS</span>
          <button class="hslide-del admin-only" data-studio-del="${i}" title="წაშლა">✕</button>
          <button class="hslide-edit admin-only" data-studio-edit="${i}" title="რედაქტირება">✎</button>
          <img src="${w ? w.img : ""}" alt="${escapeHTML(cap.label)}" loading="lazy"></div>
        <div class="cap">${escapeHTML(cap.label)}</div>`;
      h.appendChild(s);
    });
    if (isAdmin) {
      const add = document.createElement("button");
      add.className = "hslide-add admin-only";
      add.id = "addStudioSlide";
      add.textContent = "+ სლაიდი";
      h.appendChild(add);
    }
    enableDragScroll(h);
    observeReveal();
  }

  function renderExhibitions() {
    const t = $("#timeline"); t.innerHTML = "";
    DATA.exhibitions.items.forEach((it, i) => {
      const r = document.createElement("div"); r.className = "tl-row reveal";
      r.dataset.idx = i;
      r.innerHTML = `
        <button class="row-del" data-del-ex="${i}" title="წაშლა">✕</button>
        <span class="tl-year">${escapeHTML(it.year)}</span>
        <span class="tl-type">${escapeHTML(it.type)}</span>
        <span class="tl-title">${escapeHTML(it.title)}</span>
        <span class="tl-venue">${escapeHTML(it.venue)}</span>`;
      r.addEventListener("click", () => {
        if (document.body.classList.contains("admin")) window.DPAdmin.editExhibition(i);
      });
      t.appendChild(r);
    });
    enableReorder([...t.querySelectorAll(".tl-row")], DATA.exhibitions.items, renderExhibitions);
    observeReveal();
  }

  function renderJournal() {
    const g = $("#journalGrid"); g.innerHTML = "";
    DATA.journal.posts.forEach((p, i) => {
      const w = workById(p.workId);
      const c = document.createElement("article"); c.className = "jcard reveal";
      c.innerHTML = `
        <button class="post-del" data-del-post="${i}" title="წაშლა">✕</button>
        <div class="jimg"><img src="${w ? w.img : ""}" alt="" loading="lazy"></div>
        <div class="jbody">
          <span class="jtag">${escapeHTML(p.tag)}</span>
          <h3>${escapeHTML(p.title)}</h3>
          <p>${escapeHTML(p.excerpt)}</p>
          <span class="jdate">${escapeHTML(p.date)}</span>
        </div>`;
      c.addEventListener("click", (e) => {
        if (e.target.closest(".post-del")) return;
        if (document.body.classList.contains("admin")) window.DPAdmin.editPost(i);
      });
      g.appendChild(c);
    });
    enableReorder([...g.querySelectorAll(".jcard")], DATA.journal.posts, renderJournal);
    observeReveal();
  }

  /* =====================================================================
     PHOTO LIGHTBOX — fullscreen viewer with navigation + swipe
     ===================================================================== */
  let _lbPhotos = [];
  let _lbIdx    = 0;
  let _lbEl     = null;
  /* zoom / pan state */
  let _lbScale  = 1;
  let _lbTx     = 0;
  let _lbTy     = 0;
  let _lbDragged = false;

  function _initLightbox() {
    if (_lbEl) return;
    _lbEl = document.createElement("div");
    _lbEl.id        = "photoLightbox";
    _lbEl.className = "photo-lb";
    _lbEl.setAttribute("role", "dialog");
    _lbEl.setAttribute("aria-modal", "true");
    _lbEl.innerHTML = `
      <button class="plb-close" id="plbClose" aria-label="დახურვა">✕</button>
      <button class="plb-prev"  id="plbPrev"  aria-label="წინა">&#8249;</button>
      <button class="plb-next"  id="plbNext"  aria-label="შემდეგი">&#8250;</button>
      <div class="plb-stage">
        <img id="plbImg" src="" alt="" draggable="false">
      </div>
      <div class="plb-zoom">
        <button class="plb-zbtn" id="plbZoomOut" aria-label="დაპატარავება">−</button>
        <span class="plb-zlevel" id="plbZoomLevel">100%</span>
        <button class="plb-zbtn" id="plbZoomIn" aria-label="გადიდება">+</button>
        <button class="plb-zbtn" id="plbZoomReset" aria-label="საწყისი ზომა">⟲</button>
      </div>
      <div class="plb-footer">
        <p class="plb-caption" id="plbCaption"></p>
        <span class="plb-counter" id="plbCounter"></span>
      </div>`;
    document.body.appendChild(_lbEl);

    const stage = _lbEl.querySelector(".plb-stage");
    const img   = _lbEl.querySelector("#plbImg");

    /* close */
    _lbEl.querySelector("#plbClose").onclick = _closeLightbox;
    /* clicking backdrop closes — but not after a pan, and not while zoomed in */
    _lbEl.addEventListener("click", (e) => {
      if (_lbDragged) { _lbDragged = false; return; }
      if (!e.target.closest(".plb-stage") &&
          !e.target.closest(".plb-footer") &&
          !e.target.closest(".plb-zoom") &&
          !e.target.closest(".plb-prev") &&
          !e.target.closest(".plb-next") &&
          !e.target.closest(".plb-close")) _closeLightbox();
    });
    /* arrows */
    _lbEl.querySelector("#plbPrev").onclick = (e) => { e.stopPropagation(); _lbNav(-1); };
    _lbEl.querySelector("#plbNext").onclick = (e) => { e.stopPropagation(); _lbNav(+1); };
    /* zoom controls */
    _lbEl.querySelector("#plbZoomIn").onclick    = (e) => { e.stopPropagation(); _lbZoomAt(1.4, 0, 0); };
    _lbEl.querySelector("#plbZoomOut").onclick   = (e) => { e.stopPropagation(); _lbZoomAt(1/1.4, 0, 0); };
    _lbEl.querySelector("#plbZoomReset").onclick = (e) => { e.stopPropagation(); _lbResetZoom(); };
    /* keyboard */
    document.addEventListener("keydown", (e) => {
      if (!_lbEl.classList.contains("open")) return;
      if (e.key === "ArrowLeft")  { e.preventDefault(); _lbNav(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); _lbNav(+1); }
      if (e.key === "Escape")     { if (_lbScale > 1.01) _lbResetZoom(); else _closeLightbox(); }
      if (e.key === "+" || e.key === "=") { e.preventDefault(); _lbZoomAt(1.4, 0, 0); }
      if (e.key === "-" || e.key === "_") { e.preventDefault(); _lbZoomAt(1/1.4, 0, 0); }
      if (e.key === "0")          { e.preventDefault(); _lbResetZoom(); }
    });

    /* wheel zoom toward cursor */
    stage.addEventListener("wheel", (e) => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      _lbZoomAt(e.deltaY < 0 ? 1.18 : 1/1.18, e.clientX - r.left - r.width/2, e.clientY - r.top - r.height/2);
    }, { passive:false });

    /* double-click toggles zoom at point */
    stage.addEventListener("dblclick", (e) => {
      const r = stage.getBoundingClientRect();
      if (_lbScale > 1.05) _lbResetZoom();
      else _lbZoomAt(2.6, e.clientX - r.left - r.width/2, e.clientY - r.top - r.height/2);
    });

    /* mouse / pen drag-to-pan when zoomed */
    let panning = false, sx = 0, sy = 0, stx = 0, sty = 0;
    img.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch" || _lbScale <= 1.01) return;
      panning = true; _lbDragged = false; sx = e.clientX; sy = e.clientY; stx = _lbTx; sty = _lbTy;
      try { img.setPointerCapture(e.pointerId); } catch (_) {}
      _lbEl.classList.add("panning");
    });
    img.addEventListener("pointermove", (e) => {
      if (!panning) return;
      _lbTx = stx + (e.clientX - sx); _lbTy = sty + (e.clientY - sy);
      if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 4) _lbDragged = true;
      _lbClampPan(); _lbApply();
    });
    const endPan = () => { panning = false; _lbEl.classList.remove("panning"); };
    img.addEventListener("pointerup", endPan);
    img.addEventListener("pointercancel", endPan);

    /* touch: swipe (1 finger @1x) · pan (1 finger zoomed) · pinch (2 fingers) */
    let tx0 = 0, ty0 = 0, ptx = 0, pty = 0, pd0 = 0, ps0 = 1, mode = null;
    stage.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) { mode = "pinch"; pd0 = _touchDist(e.touches); ps0 = _lbScale; }
      else if (e.touches.length === 1) {
        mode = _lbScale > 1.01 ? "pan" : "swipe";
        tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; ptx = _lbTx; pty = _lbTy;
      }
      if (mode !== "swipe") _lbEl.classList.add("panning");
    }, { passive:true });
    stage.addEventListener("touchmove", (e) => {
      if (mode === "pinch" && e.touches.length === 2) {
        const d = _touchDist(e.touches);
        _lbScale = Math.max(1, Math.min(5, ps0 * d / (pd0 || 1)));
        if (_lbScale <= 1.01) { _lbTx = 0; _lbTy = 0; }
        _lbClampPan(); _lbApply();
      } else if (mode === "pan" && e.touches.length === 1) {
        _lbTx = ptx + (e.touches[0].clientX - tx0);
        _lbTy = pty + (e.touches[0].clientY - ty0);
        _lbClampPan(); _lbApply();
      }
    }, { passive:true });
    stage.addEventListener("touchend", (e) => {
      if (mode === "swipe" && e.changedTouches.length) {
        const dx = e.changedTouches[0].clientX - tx0;
        const dy = e.changedTouches[0].clientY - ty0;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) _lbNav(dx > 0 ? -1 : 1);
      }
      if (_lbScale <= 1.01) _lbResetZoom();
      mode = null;
      _lbEl.classList.remove("panning");
    }, { passive:true });
  }

  function _touchDist(t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }

  function _lbApply() {
    const img = document.getElementById("plbImg");
    if (img) img.style.transform = `translate(${_lbTx}px,${_lbTy}px) scale(${_lbScale})`;
    _lbEl.classList.toggle("zoomed", _lbScale > 1.01);
    const lvl = document.getElementById("plbZoomLevel");
    if (lvl) lvl.textContent = Math.round(_lbScale * 100) + "%";
  }
  function _lbClampPan() {
    const img = document.getElementById("plbImg"), stage = _lbEl.querySelector(".plb-stage");
    if (!img || !stage) return;
    const sr = stage.getBoundingClientRect();
    const ow = img.offsetWidth * _lbScale, oh = img.offsetHeight * _lbScale;
    const maxX = Math.max(0, (ow - sr.width) / 2), maxY = Math.max(0, (oh - sr.height) / 2);
    _lbTx = Math.max(-maxX, Math.min(maxX, _lbTx));
    _lbTy = Math.max(-maxY, Math.min(maxY, _lbTy));
  }
  /* zoom by `factor`, keeping the point (px,py — measured from stage centre) stationary */
  function _lbZoomAt(factor, px, py) {
    const prev = _lbScale;
    _lbScale = Math.max(1, Math.min(5, prev * factor));
    const k = _lbScale / prev;
    _lbTx = k * _lbTx + (1 - k) * px;
    _lbTy = k * _lbTy + (1 - k) * py;
    if (_lbScale <= 1.01) { _lbTx = 0; _lbTy = 0; }
    _lbClampPan(); _lbApply();
  }
  function _lbResetZoom() { _lbScale = 1; _lbTx = 0; _lbTy = 0; _lbApply(); }

  function openPhotoLightbox(photos, idx) {
    _lbPhotos = photos;
    _lbIdx    = idx;
    _initLightbox();
    _lbResetZoom();
    _lbRender();
    _lbEl.classList.add("open");
    document.body.classList.add("lb-open");
    _lbEl.querySelector("#plbClose").focus();
  }

  function _closeLightbox() {
    _lbEl && _lbEl.classList.remove("open");
    document.body.classList.remove("lb-open");
  }

  function _lbNav(dir) {
    _lbIdx = (_lbIdx + dir + _lbPhotos.length) % _lbPhotos.length;
    _lbResetZoom();
    _lbRender();
  }

  function _lbRender() {
    const ph = _lbPhotos[_lbIdx];
    const img = document.getElementById("plbImg");
    img.classList.remove("plb-loaded");
    img.src = ph.src || ph;
    img.alt = ph.alt || ph.caption || "";
    img.onload = () => img.classList.add("plb-loaded");
    const cap = document.getElementById("plbCaption");
    cap.textContent = ph.caption || "";
    cap.style.display = ph.caption ? "" : "none";
    document.getElementById("plbCounter").textContent =
      _lbPhotos.length > 1 ? `${_lbIdx + 1} / ${_lbPhotos.length}` : "";
    /* hide arrows when only 1 photo */
    const showNav = _lbPhotos.length > 1;
    document.getElementById("plbPrev").style.display = showNav ? "" : "none";
    document.getElementById("plbNext").style.display = showNav ? "" : "none";
  }

  /* ===================================================================== */

  function renderPhotography() {
    const grid = $("#photoGrid"); if (!grid) return;
    grid.innerHTML = "";
    const photos = (DATA.photography && DATA.photography.photos) || [];
    if (!photos.length) {
      grid.className = "photo-grid";
      const p = document.createElement("p"); p.className = "photo-empty";
      p.textContent = "ადმინ-რეჟიმში დაამატე ფოტოები →";
      grid.appendChild(p);
      return;
    }
    grid.className = "gallery"; /* paintings-style 12-col grid (reuses .card[data-size]) */
    photos.forEach((ph, i) => {
      const c = document.createElement("article");
      c.className = "card photo-work-card reveal";
      c.dataset.size = ph.size || "md";
      c.dataset.pidx = i;
      c.innerHTML = `
        <div class="media">
          <div class="card-tools">
            <button data-ptool="size" title="ზომა">⤢</button>
            <button data-ptool="crop" title="კადრირება / pan-zoom">🖼</button>
            <button data-ptool="edit" title="რედაქტირება">✎</button>
            <button data-ptool="del"  title="წაშლა">✕</button>
          </div>
          <img src="${escapeHTML(ph.src)}" alt="${escapeHTML(ph.alt || ph.caption || "")}" title="${escapeHTML(ph.alt || ph.caption || "")}" loading="lazy"${_tfmStyle(ph)}>
          <div class="view-cue">⤢</div>
        </div>
        ${(ph.caption || (ph.showPrice && ph.price)) ? `<div class="cap"><div class="tt">
          ${ph.caption ? `<h3>${escapeHTML(ph.caption)}</h3>` : ""}
          ${(ph.showPrice && ph.price) ? `<div class="price-tag">${escapeHTML(ph.price)}</div>` : ""}
        </div></div>` : ""}`;
      c.addEventListener("click", (e) => {
        if (e.target.closest(".card-tools")) return;
        openPhotoLightbox(photos, i);
      });
      grid.appendChild(c);
    });
    if (window.DPAdmin && window.DPAdmin.wirePhotoCards) window.DPAdmin.wirePhotoCards();
    observeReveal();
  }

  function renderContact() {
    const c = DATA.contact;
    $("#cEmail").href = "mailto:" + c.email;
    $("#cInsta").href = c.instagramUrl || "#";
    $("#cBe").href = c.behanceUrl || "#";
  }

  /* ===================================================================
     CUSTOM SECTIONS — admin-created flexible sections
     (eyebrow + heading + intro + body text + image grid)
     =================================================================== */
  function renderCustomSections() {
    const main = document.getElementById("top");
    if (!main) return;
    const list = DATA.customSections || [];
    const wantIds = list.map(cs => "cs-" + cs.id);

    /* remove DOM custom sections that no longer exist in data */
    main.querySelectorAll(".custom-section").forEach(sec => {
      if (!wantIds.includes(sec.id)) sec.remove();
    });

    const isAdmin = document.body.classList.contains("admin");

    list.forEach((cs, idx) => {
      const domId = "cs-" + cs.id;
      let sec = document.getElementById(domId);
      if (!sec) {
        sec = document.createElement("section");
        sec.className = "section custom-section";
        sec.id = domId;
        main.appendChild(sec);
      }
      sec.dataset.cs = cs.id;
      sec.dataset.type = cs.type || "content";
      const isVideo = cs.type === "video";

      const head = `
        <div class="sec-head">
          <div>
            <span class="sec-num" data-edit="customSections.${idx}.eyebrow">${escapeHTML(cs.eyebrow || "")}</span>
            <h2 class="reveal" data-edit="customSections.${idx}.heading">${escapeHTML(cs.heading || "")}</h2>
          </div>
          <p class="hand" style="max-width:30ch" data-edit="customSections.${idx}.intro">${escapeHTML(cs.intro || "")}</p>
        </div>
        ${(cs.body || isAdmin) ? `<p class="cs-body reveal" data-edit="customSections.${idx}.body">${escapeHTML(cs.body || "")}</p>` : ""}`;

      let mediaHTML, addBtn;
      if (isVideo) {
        const vids = cs.videos || [];
        const vidHTML = vids.map((v, i) => {
          const embed = toEmbed(v.src);
          const player = embed
            ? `<iframe src="${embed}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>`
            : `<video src="${escapeHTML(v.src)}" controls preload="metadata" playsinline></video>`;
          return `
            <article class="card video-card reveal" data-size="${v.size || 'lg'}" data-cs-vidx="${cs.id}:${i}">
              <div class="media video-media">
                <div class="card-tools">
                  <button data-cs-vtool="size:${cs.id}:${i}" title="ზომა">⤢</button>
                  <button data-cs-vtool="edit:${cs.id}:${i}" title="რედაქტირება">✎</button>
                  <button data-cs-vtool="del:${cs.id}:${i}" title="წაშლა">✕</button>
                </div>
                ${player}
              </div>
              ${v.title ? `<div class="cap"><div class="tt"><h3>${escapeHTML(v.title)}</h3></div></div>` : ""}
            </article>`;
        }).join("");
        mediaHTML = (vidHTML || isAdmin) ? `<div class="gallery video-gallery cs-videos">${vidHTML}</div>` : "";
        addBtn = `<button class="admin-add admin-only" data-cs-addvid="${cs.id}">+ ვიდეოს დამატება</button>`;
      } else {
        const imgs = cs.images || [];
        const imgHTML = imgs.map((im, i) => `
          <article class="card photo-work-card reveal" data-size="${im.size || 'md'}" data-cs-img="${cs.id}:${i}">
            <div class="media">
              <div class="card-tools">
                <button data-cs-itool="size:${cs.id}:${i}" title="ზომა">⤢</button>
                <button data-cs-itool="crop:${cs.id}:${i}" title="კადრირება">🖼</button>
                <button data-cs-itool="edit:${cs.id}:${i}" title="რედაქტირება">✎</button>
                <button data-cs-itool="del:${cs.id}:${i}" title="წაშლა">✕</button>
              </div>
              <img src="${escapeHTML(im.src)}" alt="${escapeHTML(im.alt || im.caption || "")}" title="${escapeHTML(im.alt || im.caption || "")}" loading="lazy"${_tfmStyle(im)}>
              <div class="view-cue">⤢</div>
            </div>
            ${im.caption ? `<div class="cap"><div class="tt"><h3>${escapeHTML(im.caption)}</h3></div></div>` : ""}
          </article>`).join("");
        mediaHTML = (imgHTML || isAdmin) ? `<div class="gallery cs-grid">${imgHTML}</div>` : "";
        addBtn = `<button class="admin-add admin-only" data-cs-addimg="${cs.id}">+ სურათის ატვირთვა</button>`;
      }

      sec.innerHTML = `<div class="wrap">${head}${mediaHTML}${addBtn}</div>`;

      /* lightbox on image click (content sections; admin click-through to tools) */
      if (!isVideo) {
        const imgs = cs.images || [];
        sec.querySelectorAll("[data-cs-img]").forEach(card => {
          card.addEventListener("click", (e) => {
            if (e.target.closest(".card-tools")) return;
            const i = parseInt(card.dataset.csImg.split(":")[1], 10);
            openPhotoLightbox(imgs, i);
          });
        });
      }
    });
    if (window.DPAdmin && window.DPAdmin.wireCustomMedia) window.DPAdmin.wireCustomMedia();
  }

  /* inline transform style for a photo/image object (pixel-precise pan/zoom) */
  function _tfmStyle(o) {
    const t = o && o.imgTransform;
    return t ? ` style="transform:translate(${t.x||0}px,${t.y||0}px) scale(${t.s||1})"` : "";
  }

  function renderAll() {
    bindEditables();
    bindStaticText();
    renderHero();
    renderGallery();
    renderAbout();
    renderStudio();
    renderExhibitions();
    renderJournal();
    renderPhotography();
    renderContact();
    renderCustomSections();
    applySectionOrder();
    applyHiddenSections();
    /* re-enable inline editing for any freshly-created nodes */
    if (window.DPAdmin && document.body.classList.contains("admin") && window.DPAdmin.refreshEditable) {
      window.DPAdmin.refreshEditable();
    }
  }

  /* ===================================================================
     WORK DETAIL  (#work/:id)
     =================================================================== */
  function renderDetail(id) {
    const w = workById(id);
    const inner = $("#detailInner");
    if (!w) { inner.innerHTML = `<p class="empty-hint">ნამუშევარი ვერ მოიძებნა.</p>`; return; }

    const isAdmin = document.body.classList.contains("admin");
    const photos  = (w.photos  || []);
    const videos  = (w.videos  || []);
    const ud = (DATA.ui && DATA.ui.detail) || {};

    /* ── photos section (only if photos exist OR admin mode) ── */
    const photosHTML = photos.length
      ? photos.map((src, i) =>
          `<div class="detail-photo-item"><img src="${src}" alt="detail ${i + 1}" loading="lazy">
            <button class="admin-only detail-rm-photo" data-rm-photo="${i}" title="ფოტოს წაშლა">✕</button>
          </div>`).join("")
      : "";

    /* ── videos section (only if videos exist OR admin mode) ── */
    const videosHTML = videos.length
      ? videos.map((v, i) => {
          const embed = toEmbed(v);
          return `<div class="detail-video-item">
            ${embed
              ? `<iframe src="${embed}" allow="autoplay; encrypted-media" allowfullscreen loading="lazy"></iframe>`
              : `<video src="${v}" controls></video>`}
            <button class="admin-only detail-rm-video" data-rm-video="${i}" title="ვიდეოს წაშლა">✕</button>
          </div>`;
        }).join("")
      : "";

    /* ── specs rows ── */
    const specRows = [
      [ud.specYear       || "Year",       w.year,       "year"],
      [ud.specMedium     || "Medium",     w.medium,     "medium"],
      [ud.specDimensions || "Dimensions", w.dimensions, "dimensions"],
    ].filter(([, val]) => isAdmin || val)
     .map(([label, val, field]) =>
      `<tr>
        <td class="spec-label">${label}</td>
        <td class="spec-value" ${editAttr(w, field)}>${escapeHTML(val || "—")}</td>
      </tr>`).join("");

    inner.innerHTML = `
      <div class="detail-top">

        <!-- LEFT: main artwork image -->
        <div class="detail-hero reveal in">
          <img src="${w.img}" alt="${escapeHTML(w.alt || w.title)}" title="${escapeHTML(w.alt || w.title)}">
        </div>

        <!-- RIGHT: meta panel -->
        <div class="detail-meta reveal in d1">
          <div class="detail-num eyebrow">
            <span>${escapeHTML(String(DATA.works.indexOf(w) + 1).padStart(2,"0"))}</span>
            <span class="detail-year">${escapeHTML(w.year)}</span>
          </div>

          <h1 class="detail-title" ${editAttr(w, "title")}>${escapeHTML(w.title)}</h1>

          ${specRows ? `<table class="detail-specs">${specRows}</table>` : ""}

          ${(w.desc || isAdmin)
            ? `<p class="detail-desc" ${editAttr(w, "desc")}>${escapeHTML(w.desc || "")}</p>`
            : ""}

          <div class="detail-cta">
            ${w.price ? `<button class="btn-buy" data-buy-work="${w.id}">${escapeHTML(ud.buy || "შეძენა / Buy")}</button>` : ""}
            <a class="btn solid" href="#contact" id="dpInquire">${escapeHTML(ud.inquire || "Inquire")}</a>
            <a class="btn" href="#works">${escapeHTML(ud.allWorks || "← All works")}</a>
          </div>

          <!-- Admin-only quick tools -->
          <div class="detail-admin-tools">
            <button class="admin-tool-btn" id="dEditWork" data-edit-work="${w.id}">✎ Edit Work Info</button>
            <button class="admin-tool-btn" data-add-photo="${w.id}">+ ფოტო</button>
            <button class="admin-tool-btn" data-add-video="${w.id}">+ ვიდეო</button>
          </div>
        </div>
      </div>

      ${(photosHTML || isAdmin) ? `
      <div class="detail-sub-section">
        <h2 class="detail-sub">${escapeHTML(ud.photosTitle || "Detail Photos")}</h2>
        <div class="detail-photo-grid" id="dPhotos">${photosHTML || '<p class="empty-hint admin-only">+ დაამატე ფოტოები ↑</p>'}</div>
        <button class="admin-add admin-only" data-add-photo="${w.id}">+ ფოტოს ატვირთვა</button>
      </div>` : ""}

      ${(videosHTML || isAdmin) ? `
      <div class="detail-sub-section">
        <h2 class="detail-sub">${escapeHTML(ud.videoTitle || "Video")}</h2>
        <div class="detail-video-grid" id="dVideos">${videosHTML || '<p class="empty-hint admin-only">+ დაამატე ვიდეო ↑</p>'}</div>
        <button class="admin-add admin-only" data-add-video="${w.id}">+ ვიდეოს დამატება</button>
      </div>` : ""}
    `;

    /* ── wire remove buttons (admin only) ── */
    inner.querySelectorAll("[data-rm-photo]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.rmPhoto);
        w.photos.splice(idx, 1);
        saveStore(); renderDetail(id);
      });
    });
    inner.querySelectorAll("[data-rm-video]").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.rmVideo);
        w.videos.splice(idx, 1);
        saveStore(); renderDetail(id);
      });
    });

    if (window.DPAdmin) window.DPAdmin.wireDetail(w);
    $("#dpInquire") && $("#dpInquire").addEventListener("click", () => closeDetail());
  }
  function editAttr(w, field) {
    return document.body.classList.contains("admin")
      ? `contenteditable="true" data-work-edit="${w.id}:${field}"` : "";
  }
  function toEmbed(url) {
    if (!url) return null;
    let m = url.match(/youtu\.be\/([\w-]+)/) || url.match(/youtube\.com\/.*v=([\w-]+)/);
    if (m) return "https://www.youtube.com/embed/" + m[1];
    m = url.match(/vimeo\.com\/(\d+)/);
    if (m) return "https://player.vimeo.com/video/" + m[1];
    if (url.startsWith("data:video") || /\.(mp4|webm|ogg)$/i.test(url)) return null;
    return null;
  }

  /* ── Purchase modal (Buy button on detail page) ── */
  function openPurchaseModal(workId) {
    const w = workById(workId); if (!w) return;
    const modal = $("#modal"), box = $("#modalBox");
    box.innerHTML = `
      <h3>შეძენა — ${escapeHTML(w.title)}</h3>
      ${w.price ? `<div class="purchase-price-note">${escapeHTML(w.price)}</div>` : ""}
      <label>სახელი *</label><input id="buyName" placeholder="სახელი" autocomplete="given-name">
      <label>გვარი *</label><input id="buySurname" placeholder="გვარი" autocomplete="family-name">
      <label>ტელეფონი</label><input id="buyPhone" type="tel" placeholder="+995 XXX XXX XXX" autocomplete="tel">
      <label>ელ-ფოსტა *</label><input id="buyEmail" type="email" placeholder="email@example.com" autocomplete="email">
      <label>შეტყობინება</label><textarea id="buyMsg" placeholder="დამატებითი ინფორმაცია…"></textarea>
      <div class="modal-actions">
        <button class="cancel" id="buyCancel">გაუქმება</button>
        <button class="save" id="buySubmit">გაგზავნა →</button>
      </div>`;
    modal.classList.add("open");
    $("#buyCancel").onclick = () => modal.classList.remove("open");
    $("#buySubmit").onclick = () => {
      const name  = ($("#buyName").value || "").trim();
      const email = ($("#buyEmail").value || "").trim();
      if (!name || !email) { toast("შეავსეთ სახელი და ელ-ფოსტა"); return; }
      if (!DATA.purchaseRequests) DATA.purchaseRequests = [];
      DATA.purchaseRequests.unshift({
        id: "req_" + Date.now().toString(36),
        workId, workTitle: w.title, price: w.price || "",
        name, surname: ($("#buySurname").value||"").trim(),
        phone: ($("#buyPhone").value||"").trim(), email,
        message: ($("#buyMsg").value||"").trim(),
        date: new Date().toLocaleDateString("ka-GE"), read: false
      });
      saveStore();
      modal.classList.remove("open");
      toast("✓ შეკვეთა გაიგზავნა — მალე დაგიკავშირდებით");
    };
  }

  /* delegated buy-button click on detail page */
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-buy-work]");
    if (btn) openPurchaseModal(btn.dataset.buyWork);
  });

  function openDetail(id) {
    renderDetail(id);
    $("#detail").classList.add("open");
    document.body.style.overflow = "hidden";
    $("#detail").scrollTop = 0;
  }
  function closeDetail() {
    $("#detail").classList.remove("open");
    document.body.style.overflow = "";
    if (location.hash.startsWith("#work/")) history.replaceState(null, "", location.pathname + "#works");
  }
  function handleHash() {
    const h = location.hash;
    if (h.indexOf("#work/") === 0) openDetail(h.slice(6));
    else closeDetail();
  }

  /* ===================================================================
     ANIMATIONS / UX
     =================================================================== */
  let io;
  function observeReveal() {
    if (!io) {
      io = new IntersectionObserver((ents) => {
        ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    }
    $$(".reveal:not(.in)").forEach((n) => io.observe(n));
  }

  /* Generic admin drag-reorder for a list of sibling cards backed by an array.
     els: DOM nodes in current order · arr: the backing data array · rerender: fn to redraw */
  function enableReorder(els, arr, rerender) {
    if (!document.body.classList.contains("admin")) return;
    let from = null;
    els.forEach((el, i) => {
      el.setAttribute("draggable", "true");
      el.classList.add("reorderable");
      el.addEventListener("dragstart", (e) => {
        from = i; el.classList.add("drag-active");
        e.dataTransfer.effectAllowed = "move";
      });
      el.addEventListener("dragend", () => {
        from = null;
        els.forEach(x => x.classList.remove("drag-active", "drop-target"));
      });
      el.addEventListener("dragover", (e) => { e.preventDefault(); el.classList.add("drop-target"); });
      el.addEventListener("dragleave", () => el.classList.remove("drop-target"));
      el.addEventListener("drop", (e) => {
        e.preventDefault(); el.classList.remove("drop-target");
        if (from === null || from === i) return;
        const [m] = arr.splice(from, 1); arr.splice(i, 0, m);
        saveStore(); rerender();
      });
    });
  }

  function enableDragScroll(elm) {
    let down = false, sx = 0, sl = 0;
    elm.addEventListener("pointerdown", (e) => { down = true; elm.classList.add("drag"); sx = e.pageX; sl = elm.scrollLeft; });
    elm.addEventListener("pointermove", (e) => { if (!down) return; elm.scrollLeft = sl - (e.pageX - sx); });
    const up = () => { down = false; elm.classList.remove("drag"); };
    elm.addEventListener("pointerup", up); elm.addEventListener("pointerleave", up);
  }

  function heroParallax() {
    const nav = $("#nav");
    const prog = $("#scrollProgress");
    const docH = () => document.documentElement.scrollHeight - window.innerHeight;
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      /* nav glass on scroll */
      if (nav) nav.classList.toggle("scrolled", y > 60);
      /* scroll progress bar */
      if (prog) prog.style.transform = `scaleX(${docH() > 0 ? y / docH() : 0})`;
      /* doodle parallax (only on hero) */
      if (y < window.innerHeight) {
        $$(".doodle").forEach((d, i) => { d.style.transform = `translateY(${y * (0.04 + i * 0.025)}px)`; });
      }
    }, { passive: true });
  }

  function navMenu() {
    const links = $("#navLinks");
    const closeMenu = () => links.classList.remove("open");
    $("#menuBtn").addEventListener("click", () => links.classList.toggle("open"));
    $("#navClose") && $("#navClose").addEventListener("click", closeMenu);
    $$("#navLinks a").forEach((a) => a.addEventListener("click", closeMenu));
    /* Close on backdrop tap (touch outside links) */
    links.addEventListener("click", (e) => {
      if (e.target === links) closeMenu();
    });
  }

  function contactForm() {
    $("#fSubmit").addEventListener("click", () => {
      const name = $("#fName").value.trim();
      const email = $("#fEmail").value.trim();
      const type = $("#fType").value;
      const msg = $("#fMsg").value.trim();
      if (!name || !email) { toast("შეავსე სახელი და ელფოსტა"); return; }
      const subject = encodeURIComponent(`[${type}] from ${name}`);
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\nType: ${type}\n\n${msg}`);
      window.location.href = `mailto:${DATA.contact.email}?subject=${subject}&body=${body}`;
      $("#fOk").style.display = "block";
    });
  }

  /* ===================================================================
     FLOATING ART FRAGMENTS — background ambience
     =================================================================== */
  /* ===================================================================
     HERO SLIDER — full-bleed gallery, navigate through all works
     =================================================================== */
  function initHeroSlider() {
    /* use curated list if set, otherwise all works */
    const ids = DATA.hero && DATA.hero.sliderWorkIds;
    const works = (ids && ids.length)
      ? ids.map(id => workById(id)).filter(Boolean)
      : DATA.works;
    if (!works.length) return;

    const hero  = $("#hero");
    const img   = $("#heroImg");
    const tag   = $("#heroTag");

    /* remove any leftover blur layer from previous version */
    const oldBlur = document.querySelector(".hero-bg-blur");
    if (oldBlur) oldBlur.remove();

    /* starting index = featured work */
    let idx = works.findIndex(w => w.id === DATA.hero.featuredWorkId);
    if (idx < 0) idx = 0;

    let timer = null;

    /* ── inject arrows (once) ── */
    if (!hero.querySelector(".hero-arrow")) {
      const mkBtn = (cls, html, label) => {
        const b = document.createElement("button");
        b.className = "hero-arrow " + cls;
        b.innerHTML = html;
        b.setAttribute("aria-label", label);
        return b;
      };
      const prev = mkBtn("hero-arrow-prev", "←", "Previous painting");
      const next = mkBtn("hero-arrow-next", "→", "Next painting");
      prev.addEventListener("click", () => { go(idx - 1); bump(); });
      next.addEventListener("click", () => { go(idx + 1); bump(); });
      hero.appendChild(prev);
      hero.appendChild(next);
    }

    /* ── inject dots (once) ── */
    let dots = hero.querySelector(".hero-dots");
    if (!dots) {
      dots = document.createElement("div");
      dots.className = "hero-dots";
      works.forEach((_, i) => {
        const d = document.createElement("button");
        d.className = "hero-dot";
        d.setAttribute("aria-label", `Work ${i + 1}`);
        d.addEventListener("click", () => { go(i); bump(); });
        dots.appendChild(d);
      });
      hero.appendChild(dots);
    }

    /* ── inject counter (once) ── */
    let counter = hero.querySelector(".hero-counter");
    if (!counter) {
      counter = document.createElement("div");
      counter.className = "hero-counter";
      counter.setAttribute("aria-live", "polite");
      hero.appendChild(counter);
    }

    /* ── go to slide ── */
    function go(n) {
      idx = ((n % works.length) + works.length) % works.length;
      const w = works[idx];

      /* crossfade */
      img.style.opacity = "0";
      clearTimeout(img._t);
      img._t = setTimeout(() => {
        img.src = w.img;
        tag.textContent = `${w.title}  ·  ${w.year}`;
        const t = w.heroTransform || w.imgTransform;
        img.style.transform = t ? `translate(${t.x||0}px,${t.y||0}px) scale(${t.s||1})` : '';
        img.style.opacity = "1";
      }, 380);

      /* dots */
      const allDots = dots.querySelectorAll(".hero-dot");
      allDots.forEach((d, i) => d.classList.toggle("active", i === idx));

      /* counter */
      counter.textContent = `${String(idx + 1).padStart(2, "0")} / ${String(works.length).padStart(2, "0")}`;
    }

    /* ── autoplay ── */
    function bump() {
      clearInterval(timer);
      timer = setInterval(() => go(idx + 1), 7000);
    }

    /* expose public interface */
    heroSlider = {
      go,
      prev() { go(idx - 1); bump(); },
      next() { go(idx + 1); bump(); },
      goToWork(id) {
        const i = works.findIndex(w => w.id === id);
        if (i >= 0) { go(i); bump(); }
      },
      get currentWork() { return works[idx]; }
    };

    /* start */
    go(idx);
    bump();
  }

  /* module-level ref so re-spawning can clear the old style tag */
  let _bgFragStyleEl = null;

  function spawnBgFrags() {
    const container = $("#bgFrags"); if (!container) return;

    /* clear previous spawn */
    container.innerHTML = "";
    if (_bgFragStyleEl) { try { _bgFragStyleEl.remove(); } catch(e){} _bgFragStyleEl = null; }

    /* ── if user has uploaded PNG figures → use them ── */
    const userItems = DATA.bgFrags && DATA.bgFrags.items;
    if (userItems && userItems.length) {
      _bgFragStyleEl = document.createElement("style");
      document.head.appendChild(_bgFragStyleEl);

      const N = Math.max(userItems.length, 6); /* repeat if fewer than 6 */
      for (let i = 0; i < N; i++) {
        const it  = userItems[i % userItems.length];
        const dur = 50 + Math.random() * 40;
        const del = -(Math.random() * dur);
        const left = Math.random() * 88;
        const top  = Math.random() * 88;
        const opa  = (it.opacity || 0.08) * (0.75 + Math.random() * 0.5);
        const sz   = (it.size || 120) * (0.6 + Math.random() * 0.8);

        const kx = [(Math.random()-0.5)*150,(Math.random()-0.5)*110,(Math.random()-0.5)*190,(Math.random()-0.5)*90];
        const ky = [(Math.random()-0.5)*110,(Math.random()-0.5)*150,(Math.random()-0.5)*90, (Math.random()-0.5)*130];
        const kr = [(Math.random()-0.5)*22, (Math.random()-0.5)*30, (Math.random()-0.5)*22, (Math.random()-0.5)*28];

        _bgFragStyleEl.sheet.insertRule(
          `@keyframes bf${i}{` +
          `0%{transform:translate(0px,0px) rotate(0deg)}` +
          `25%{transform:translate(${kx[0].toFixed(1)}px,${ky[0].toFixed(1)}px) rotate(${kr[0].toFixed(1)}deg)}` +
          `50%{transform:translate(${kx[1].toFixed(1)}px,${ky[1].toFixed(1)}px) rotate(${kr[1].toFixed(1)}deg)}` +
          `75%{transform:translate(${kx[2].toFixed(1)}px,${ky[2].toFixed(1)}px) rotate(${kr[2].toFixed(1)}deg)}` +
          `100%{transform:translate(0px,0px) rotate(0deg)}}`,
          _bgFragStyleEl.sheet.cssRules.length
        );

        const el = document.createElement("div");
        el.className = "bg-frag bg-frag-png";
        el.style.cssText = `left:${left.toFixed(1)}vw;top:${top.toFixed(1)}vh;opacity:${opa.toFixed(3)};animation:bf${i} ${dur.toFixed(1)}s ${del.toFixed(1)}s ease-in-out infinite;`;
        const img = document.createElement("img");
        img.src = it.src;
        img.alt = "";
        img.style.cssText = `width:${Math.round(sz)}px;height:auto;display:block;pointer-events:none;`;
        el.appendChild(img);
        container.appendChild(el);
      }
      return; /* PNG mode — skip SVG fallback */
    }

    /* ── DEFAULT: SVG motifs drawn from the 19 actual paintings ── */
    _bgFragStyleEl = document.createElement("style");
    document.head.appendChild(_bgFragStyleEl);

    const FRAGS = [
      /* Spiked totem head — MR. SLAM / FIRST CONTACT */
      { w:72, h:90, s:`<ellipse cx="36" cy="62" rx="24" ry="26" fill="none" stroke="currentColor" stroke-width="3.5"/><circle cx="36" cy="30" r="7" fill="currentColor"/><line x1="36" y1="23" x2="36" y2="6" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><line x1="36" y1="23" x2="22" y2="8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><line x1="36" y1="23" x2="50" y2="8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><line x1="36" y1="23" x2="10" y2="20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="36" y1="23" x2="62" y2="20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>` },
      /* Bold cross — MR. SLAM */
      { w:58, h:58, s:`<line x1="29" y1="5" x2="29" y2="53" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><line x1="5" y1="29" x2="53" y2="29" stroke="currentColor" stroke-width="9" stroke-linecap="round"/>` },
      /* Eye with radiating spike marks — ACE / DIRECTION */
      { w:84, h:84, s:`<ellipse cx="42" cy="42" rx="34" ry="20" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="42" cy="42" r="11" fill="currentColor"/><circle cx="46" cy="38" r="4" fill="rgba(255,255,255,0.4)"/><line x1="42" y1="8" x2="42" y2="2" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="42" y1="76" x2="42" y2="82" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="8" y1="42" x2="2" y2="42" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="76" y1="42" x2="82" y2="42" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="17" y1="17" x2="12" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="67" y1="17" x2="72" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="17" y1="67" x2="12" y2="72" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="67" y1="67" x2="72" y2="72" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>` },
      /* Halo + figure — KEEP YOUR FEEL */
      { w:70, h:78, s:`<circle cx="35" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="3.5"/><circle cx="35" cy="58" r="14" fill="currentColor"/><path d="M14 52 Q35 34 56 52" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>` },
      /* Open screaming mouth — WAR INSIDE */
      { w:102, h:52, s:`<path d="M6 14 Q51 4 96 14 L92 42 Q51 52 10 42 Z" fill="none" stroke="currentColor" stroke-width="3.5"/><line x1="24" y1="14" x2="24" y2="42" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="40" y1="11" x2="40" y2="45" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="56" y1="11" x2="56" y2="45" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="72" y1="14" x2="72" y2="42" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>` },
      /* Red lips — NOCTURNE / FIGURE IN TEAL */
      { w:100, h:48, s:`<path d="M8 24 Q30 6 50 16 Q70 6 92 24 Q70 42 50 34 Q30 42 8 24 Z" fill="currentColor"/><path d="M22 24 Q50 18 78 24" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="2.5"/>` },
      /* Bold arrow — DIRECTION */
      { w:120, h:50, s:`<path d="M6 25 H98 M74 6 L100 25 L74 44" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` },
      /* Coil/spiral creature — BLUE SCREAM */
      { w:82, h:82, s:`<path d="M41 41 a5 5 0 1 1 7 3 a13 13 0 1 1 -18-5 a22 22 0 1 1 31 10 a32 32 0 1 1 -44-15" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>` },
      /* Full moon — RED MOON */
      { w:64, h:64, s:`<circle cx="32" cy="32" r="28" fill="currentColor"/>` },
      /* "ONE LOVE" — COSMIC LOVE */
      { w:148, h:44, s:`<text x="4" y="34" font-family="Space Mono,monospace" font-size="22" font-weight="700" fill="currentColor" letter-spacing="3">ONE LOVE</text>` },
      /* "THINK" — BREATH */
      { w:112, h:44, s:`<text x="4" y="34" font-family="Space Mono,monospace" font-size="26" font-weight="700" fill="currentColor" letter-spacing="6">THINK</text>` },
      /* Gear — I CAN UNDERSTAND */
      { w:74, h:74, s:`<circle cx="37" cy="37" r="13" fill="none" stroke="currentColor" stroke-width="3.5"/><circle cx="37" cy="37" r="5" fill="currentColor"/><rect x="33" y="4" width="8" height="11" rx="2" fill="currentColor"/><rect x="33" y="59" width="8" height="11" rx="2" fill="currentColor"/><rect x="4" y="33" width="11" height="8" rx="2" fill="currentColor"/><rect x="59" y="33" width="11" height="8" rx="2" fill="currentColor"/><rect x="12" y="9" width="8" height="11" rx="2" transform="rotate(45 16 14)" fill="currentColor"/><rect x="52" y="9" width="8" height="11" rx="2" transform="rotate(-45 56 14)" fill="currentColor"/><rect x="12" y="52" width="8" height="11" rx="2" transform="rotate(-45 16 57)" fill="currentColor"/><rect x="52" y="52" width="8" height="11" rx="2" transform="rotate(45 56 57)" fill="currentColor"/>` },
      /* Balloon + string — FLOATING CITY */
      { w:50, h:82, s:`<ellipse cx="25" cy="26" rx="20" ry="24" fill="currentColor"/><ellipse cx="22" cy="20" rx="7" ry="9" fill="rgba(255,255,255,0.22)"/><path d="M25 50 Q22 64 25 82" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>` },
      /* Reaching hand — REACH */
      { w:60, h:90, s:`<path d="M30 90 Q20 72 22 52 Q24 32 28 22" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M28 22 Q21 13 17 6" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path d="M28 22 Q25 12 27 5" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path d="M28 22 Q31 12 34 6" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path d="M28 22 Q35 13 40 8" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path d="M28 22 Q37 16 44 15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>` },
      /* Question mark — WHAT IS HAPPENING? */
      { w:50, h:72, s:`<path d="M10 22 Q10 6 25 4 Q44 2 44 20 Q44 34 25 37 L25 48" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><circle cx="25" cy="60" r="5" fill="currentColor"/>` },
      /* "PLEASE" — I CAN UNDERSTAND */
      { w:138, h:44, s:`<text x="4" y="34" font-family="Space Mono,monospace" font-size="22" font-weight="700" fill="currentColor" letter-spacing="3">PLEASE</text>` },
    ];

    const COLORS = [
      { c:"var(--ink)",    o:0.10 },
      { c:"var(--red)",    o:0.08 },
      { c:"var(--yellow)", o:0.07 },
      { c:"var(--blue)",   o:0.07 },
      { c:"var(--grey)",   o:0.06 },
    ];

    const N = 6;
    for (let i = 0; i < N; i++) {
      const def   = FRAGS[i % FRAGS.length];
      const col   = COLORS[Math.floor(Math.random() * COLORS.length)];
      const sc    = 0.55 + Math.random() * 1.1;
      const dur   = 50 + Math.random() * 40;
      const delay = -(Math.random() * dur);
      const left  = Math.random() * 90;
      const top   = Math.random() * 90;

      const kx = [(Math.random()-0.5)*160, (Math.random()-0.5)*120, (Math.random()-0.5)*200, (Math.random()-0.5)*100];
      const ky = [(Math.random()-0.5)*120, (Math.random()-0.5)*160, (Math.random()-0.5)*100, (Math.random()-0.5)*140];
      const kr = [(Math.random()-0.5)*50,  (Math.random()-0.5)*70,  (Math.random()-0.5)*50,  (Math.random()-0.5)*60];

      _bgFragStyleEl.sheet.insertRule(
        `@keyframes frag${i}{` +
        `0%{transform:translate(0px,0px) rotate(0deg)}` +
        `25%{transform:translate(${kx[0].toFixed(1)}px,${ky[0].toFixed(1)}px) rotate(${kr[0].toFixed(1)}deg)}` +
        `50%{transform:translate(${kx[1].toFixed(1)}px,${ky[1].toFixed(1)}px) rotate(${kr[1].toFixed(1)}deg)}` +
        `75%{transform:translate(${kx[2].toFixed(1)}px,${ky[2].toFixed(1)}px) rotate(${kr[2].toFixed(1)}deg)}` +
        `100%{transform:translate(0px,0px) rotate(0deg)}}`,
        _bgFragStyleEl.sheet.cssRules.length
      );

      const el = document.createElement("div");
      el.className = "bg-frag";
      el.style.cssText = `left:${left.toFixed(1)}vw;top:${top.toFixed(1)}vh;opacity:${col.o};color:${col.c};transform-origin:center;animation:frag${i} ${dur.toFixed(1)}s ${delay.toFixed(1)}s ease-in-out infinite;`;
      el.innerHTML = `<svg viewBox="0 0 ${def.w} ${def.h}" xmlns="http://www.w3.org/2000/svg" width="${(def.w*sc).toFixed(0)}" height="${(def.h*sc).toFixed(0)}">${def.s}</svg>`;
      container.appendChild(el);
    }
  }

  /* ===================================================================
     VIRTUAL GALLERY — stub (Three.js removed; body kept but never called)
     =================================================================== */
  const Gallery3D = (function () {
    let rndr, scn, cam, raf;
    let meshes = [], works3d = [];
    let yaw = 0, pitch = 0, drag = false, lx = 0, ly = 0;
    let keys = {};
    let ready = false;

    /* room dimensions */
    const RW = 28, RH = 8.5, RD = 22;

    /* painting placements [px, py, pz, rotY, paintW, paintH] */
    const POS = [
      /* Back wall  z = -(RD/2 - 0.1) = -10.9, ry=0 */
      [-8.5, 3.0, -10.9, 0,          2.8, 3.5],
      [-4.5, 3.2, -10.9, 0,          2.3, 3.2],
      [-1.0, 3.3, -10.9, 0,          4.0, 3.0],
      [ 3.5, 3.0, -10.9, 0,          2.3, 3.8],
      [ 7.0, 3.2, -10.9, 0,          3.0, 3.3],
      [10.5, 3.0, -10.9, 0,          2.4, 3.0],
      [-6.5, 6.0, -10.9, 0,          3.0, 1.8],
      [ 0.0, 6.0, -10.9, 0,          3.5, 2.0],
      [ 6.5, 6.0, -10.9, 0,          3.0, 1.8],
      /* Left wall  x = -13.9, ry = +π/2 */
      [-13.9, 3.2, -8, Math.PI/2, 2.5, 3.2],
      [-13.9, 3.2, -4, Math.PI/2, 2.8, 3.6],
      [-13.9, 3.2,  0, Math.PI/2, 2.5, 3.0],
      [-13.9, 3.2,  4, Math.PI/2, 2.8, 2.8],
      [-13.9, 3.2,  8, Math.PI/2, 2.3, 3.0],
      /* Right wall x = +13.9, ry = -π/2 */
      [ 13.9, 3.2, -8, -Math.PI/2, 2.8, 3.2],
      [ 13.9, 3.2, -4, -Math.PI/2, 2.5, 3.8],
      [ 13.9, 3.2,  0, -Math.PI/2, 2.8, 3.0],
      [ 13.9, 3.2,  4, -Math.PI/2, 2.5, 3.2],
      [ 13.9, 3.2,  8, -Math.PI/2, 3.0, 2.8],
    ];

    function init() {
      if (ready || typeof THREE === "undefined") return;
      const canvas = $("#tourCanvas"); if (!canvas) return;

      scn = new THREE.Scene();
      scn.background = new THREE.Color(0x06181c);
      scn.fog = new THREE.Fog(0x06181c, 30, 60);

      cam = new THREE.PerspectiveCamera(68, 1, 0.1, 70);
      cam.position.set(0, 1.7, 7);

      rndr = new THREE.WebGLRenderer({ canvas, antialias: true });
      rndr.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      rndr.toneMapping = THREE.ACESFilmicToneMapping;
      rndr.toneMappingExposure = 1.05;

      resize();
      buildRoom();
      buildLights();
      buildPaintings();
      wireInput();
      window.addEventListener("resize", resize);
      ready = true;
    }

    function resize() {
      const el = $("#tour");
      const w = el ? el.clientWidth : window.innerWidth;
      const h = el ? el.clientHeight : window.innerHeight;
      if (cam) { cam.aspect = w / h; cam.updateProjectionMatrix(); }
      if (rndr) rndr.setSize(w, h);
    }

    function buildRoom() {
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.9 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.9 });
      const floorMat= new THREE.MeshStandardMaterial({ color: 0x0a1616, roughness: 0.96 });
      const ceilMat = new THREE.MeshStandardMaterial({ color: 0x040d0f, roughness: 1.0 });

      /* floor */
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), floorMat);
      floor.rotation.x = -Math.PI / 2; scn.add(floor);
      /* grid overlay */
      const grid = new THREE.GridHelper(RW * 1.5, 44, 0x0c2d2d, 0x092222);
      grid.position.y = 0.003; scn.add(grid);
      /* ceiling */
      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(RW, RD), ceilMat);
      ceil.rotation.x = Math.PI / 2; ceil.position.y = RH; scn.add(ceil);

      function addWall(w, h, mat, pos, ry) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        m.position.set(...pos); m.rotation.y = ry || 0; scn.add(m);
      }
      addWall(RW, RH, wallMat, [0, RH/2, -RD/2], 0);           /* back  */
      addWall(RD, RH, darkMat, [-RW/2, RH/2, 0], Math.PI/2);   /* left  */
      addWall(RD, RH, darkMat, [RW/2,  RH/2, 0], -Math.PI/2);  /* right */
      addWall(8,  RH, wallMat, [-10, RH/2, RD/2], Math.PI);    /* front L */
      addWall(8,  RH, wallMat, [ 10, RH/2, RD/2], Math.PI);    /* front R */
    }

    function buildLights() {
      scn.add(new THREE.AmbientLight(0xfff8f0, 0.55));
      scn.add(new THREE.HemisphereLight(0xfff4d0, 0x0a1a1d, 0.5));
      POS.forEach(([px, py, pz, ry]) => {
        const n = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, ry, 0));
        const spot = new THREE.SpotLight(0xfff8e8, 4.0, 16, Math.PI / 6, 0.4, 1.5);
        spot.position.set(px + n.x * 1.8, RH - 0.4, pz + n.z * 1.8);
        spot.target.position.set(px, py, pz);
        scn.add(spot); scn.add(spot.target);
      });
    }

    function buildPaintings() {
      meshes = []; works3d = [];
      const loader   = new THREE.TextureLoader();
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.95 });
      const works    = window.DP ? window.DP.data.works : [];
      if (!works.length) return;

      POS.forEach(([px, py, pz, ry, pw, ph], i) => {
        const w = works[i % works.length];
        const n = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, ry, 0));

        /* dark frame backing plate */
        const frame = new THREE.Mesh(new THREE.PlaneGeometry(pw + 0.24, ph + 0.24), frameMat);
        frame.position.set(px, py, pz).addScaledVector(n, 0.015);
        frame.rotation.y = ry; scn.add(frame);

        /* painting plane */
        const tex = loader.load(w.img);
        tex.anisotropy = rndr ? Math.min(4, rndr.capabilities.getMaxAnisotropy()) : 4;
        const paint = new THREE.Mesh(
          new THREE.PlaneGeometry(pw, ph),
          new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65 })
        );
        paint.position.set(px, py, pz).addScaledVector(n, 0.032);
        paint.rotation.y = ry;
        paint.userData = { idx: i, workId: w.id };
        scn.add(paint);
        meshes.push(paint);
        works3d.push(w);
      });
    }

    function wireInput() {
      const canvas = $("#tourCanvas"); if (!canvas) return;

      /* mouse drag look */
      canvas.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        drag = true; lx = e.clientX; ly = e.clientY;
      });
      window.addEventListener("mouseup", () => { drag = false; });
      window.addEventListener("mousemove", (e) => {
        if (!drag) return;
        yaw   -= (e.clientX - lx) * 0.0034;
        pitch -= (e.clientY - ly) * 0.003;
        pitch = Math.max(-0.44, Math.min(0.38, pitch));
        lx = e.clientX; ly = e.clientY;
      });

      /* touch look */
      let tp = null;
      canvas.addEventListener("touchstart",  (e) => { tp = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive:true });
      canvas.addEventListener("touchmove",   (e) => {
        if (!tp) return;
        yaw   -= (e.touches[0].clientX - tp.x) * 0.004;
        pitch -= (e.touches[0].clientY - tp.y) * 0.004;
        pitch = Math.max(-0.44, Math.min(0.38, pitch));
        tp = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }, { passive:true });
      canvas.addEventListener("touchend", () => { tp = null; });

      /* keyboard */
      window.addEventListener("keydown", (e) => { keys[e.code] = true; });
      window.addEventListener("keyup",   (e) => { delete keys[e.code]; });

      /* click painting → show label */
      const ray = new THREE.Raycaster();
      const m2d = new THREE.Vector2();
      let cd = { x: 0, y: 0 };
      canvas.addEventListener("mousedown", (e) => { cd = { x: e.clientX, y: e.clientY }; });
      canvas.addEventListener("mouseup",   (e) => {
        if (Math.hypot(e.clientX - cd.x, e.clientY - cd.y) > 7) return;
        const rect = canvas.getBoundingClientRect();
        m2d.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
        m2d.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
        ray.setFromCamera(m2d, cam);
        const hits = ray.intersectObjects(meshes);
        const lbl = $("#tourLabel");
        if (hits.length) { showLabel(hits[0].object.userData.idx); }
        else { if (lbl) lbl.classList.remove("visible"); }
      });
    }

    function showLabel(idx) {
      const w = works3d[idx]; if (!w) return;
      const el = $("#tourLabel"); if (!el) return;
      el.innerHTML = `
        <div class="tl-ix">${String(idx+1).padStart(2,"0")} / ${String(works3d.length).padStart(2,"0")}</div>
        <h3>${escapeHTML(w.title)}</h3>
        <div class="tl-meta">${escapeHTML(w.year)} — ${escapeHTML(w.medium)}</div>
        ${(w.showPrice && w.price) ? `<div class="tl-meta" style="color:var(--red)">${escapeHTML(w.price)}</div>` : ""}
        <p class="tl-desc">${escapeHTML(w.desc || "")}</p>
        <a class="tl-open" href="#work/${w.id}">View full work ↗</a>`;
      /* use inline style to override any specificity wars */
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
      el._hideTimer = setTimeout(() => hideLabel(el), 5000);
    }
    function hideLabel(el) {
      if (!el) return;
      el.style.opacity = "0";
      el.style.transform = "translateY(10px)";
    }

    function tick() {
      raf = requestAnimationFrame(tick);

      /* WASD / arrow movement (horizontal only) */
      const sp = 0.07;
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw); /* forward */
      const rx =  Math.cos(yaw), rz = -Math.sin(yaw); /* right   */

      if (keys["ArrowUp"]    || keys["KeyW"]) { cam.position.x += fx*sp; cam.position.z += fz*sp; }
      if (keys["ArrowDown"]  || keys["KeyS"]) { cam.position.x -= fx*sp; cam.position.z -= fz*sp; }
      if (keys["ArrowLeft"]  || keys["KeyA"]) { cam.position.x -= rx*sp; cam.position.z -= rz*sp; }
      if (keys["ArrowRight"] || keys["KeyD"]) { cam.position.x += rx*sp; cam.position.z += rz*sp; }

      /* constrain inside room */
      cam.position.x = Math.max(-RW/2+1.4, Math.min(RW/2-1.4, cam.position.x));
      cam.position.z = Math.max(-RD/2+1.4, Math.min(RD/2-1.4, cam.position.z));
      cam.position.y = 1.7;

      /* apply look direction */
      cam.rotation.order = "YXZ";
      cam.rotation.y = yaw;
      cam.rotation.x = pitch;

      rndr.render(scn, cam);
    }

    return { open() {}, close() {}, rebuild() {} };
  })(); /* Gallery3D — stub, body unreachable without Three.js */

  /* ===================================================================
     PUBLIC API (used by admin.js)
     =================================================================== */
  window.DP = {
    get data() { return DATA; },
    save: saveStore,
    reset() { localStorage.removeItem(STORE_KEY); loadStore(); renderAll(); },
    rerender: renderAll,
    renderGallery, renderStudio, renderExhibitions, renderJournal,
    renderAbout, renderHero, renderPhotography, bindEditables,
    bindStaticText, applyHiddenSections, renderNav,
    renderCustomSections, applySectionOrder, enableReorder, openPhotoLightbox,
    workById, imgFor,
    getPath, setPath, clone, toast, $, $$,
    openDetail, renderDetail, openPurchaseModal,
    initHeroSlider,
    get heroSlider() { return heroSlider; },
    spawnBgFrags,
    exportJSON() {
      const blob = new Blob([JSON.stringify(DATA, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "deliquente-data.json"; a.click();
      URL.revokeObjectURL(a.href);
    },
    importJSON(obj) { DATA = deepMerge(DEFAULT_DATA, obj); saveStore(); renderAll(); }
  };

  /* ===================================================================
     IMAGE PROTECTION
     Prevents casual right-click saving, drag-and-drop, and Ctrl+S.
     NOTE: determined users with browser DevTools can still access
     image URLs via the Network tab — server-side signed URLs are
     required for absolute protection, which a static site cannot do.
     =================================================================== */
  function initImageProtection() {
    /* 1 — Block right-click context menu on all artwork image areas */
    document.addEventListener("contextmenu", (e) => {
      const blocked = e.target.closest(
        ".media, .detail-hero, .detail-photo-item, .detail-photo-grid, " +
        ".hslide .ph, .portrait, .jcard .jimg, .hero-art, .cp-preview, " +
        ".photo-thumb, .photo-grid"
      );
      if (blocked || e.target.tagName === "IMG") {
        e.preventDefault();
        return false;
      }
    });

    /* 2 — Block image drag (prevents dropping onto desktop / another tab) */
    document.addEventListener("dragstart", (e) => {
      if (e.target.tagName === "IMG") {
        e.preventDefault();
        return false;
      }
    });

    /* 3 — Block Ctrl+S / Cmd+S (page save) and PrintScreen tip */
    document.addEventListener("keydown", (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === "s" || e.key === "S")) {
        e.preventDefault(); return false;
      }
      /* Block Ctrl+U (view-source) */
      if (mod && (e.key === "u" || e.key === "U")) {
        e.preventDefault(); return false;
      }
    });

    /* 4 — Devtools console notice */
    try {
      console.log(
        "%c© DELIQUENTE PENSAMIENTO — SABA BEZHASHVILI",
        "color:#E83A3A;font-size:15px;font-weight:bold;letter-spacing:.08em"
      );
      console.log(
        "%cAll artworks are protected by copyright. Unauthorized reproduction or distribution is prohibited.",
        "color:#141414;font-size:11px"
      );
    } catch(_) {}
  }

  /* ---------- INIT ---------- */
  async function init() {
    await loadStore(); /* async: waits for API or falls back to localStorage */
    renderAll();
    observeReveal();
    heroParallax();
    navMenu();
    contactForm();
    spawnBgFrags();
    initHeroSlider();
    initImageProtection();
    $("#year").textContent = new Date().getFullYear();
    $("#detailBack").addEventListener("click", () => { closeDetail(); });

    window.addEventListener("hashchange", handleHash);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { closeDetail(); return; }
      /* arrow keys navigate hero slider when detail is closed */
      if (document.getElementById("detail").classList.contains("open")) return;
      if (e.key === "ArrowLeft"  && heroSlider) { e.preventDefault(); heroSlider.prev(); }
      if (e.key === "ArrowRight" && heroSlider) { e.preventDefault(); heroSlider.next(); }
    });
    handleHash();
  }
  document.addEventListener("DOMContentLoaded", init);
})();
