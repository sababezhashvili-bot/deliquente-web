/* =====================================================================
   DELIQUENTE PENSAMIENTO — ADMIN LAYER
   ===================================================================== */
(function () {
  "use strict";
  const D = window.DP;
  const $ = D.$, $$ = D.$$;
  const AUTH_KEY = "dp_admin_on";

  /* ---------- modal helper ---------- */
  const modal = $("#modal"), modalBox = $("#modalBox");
  function openModal(html) {
    modalBox.innerHTML = html;
    modal.classList.add("open");
  }
  function closeModal() { modal.classList.remove("open"); modalBox.innerHTML = ""; }
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && modal.classList.contains("open")) closeModal(); });

  /* ── Fallback: base64 via FileReader (used when API is unavailable) ── */
  function readFile(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  /* ── API image upload with progress toast + localStorage fallback ── */
  async function uploadImage(file, workId) {
    const pwd = window.DPAdmin?._adminPassword;
    if (!pwd) return readFile(file); /* no API password → base64 fallback */

    try {
      D.toast("↑ იტვირთება…");
      const fd = new FormData();
      fd.append('image', file);
      fd.append('password', pwd);
      if (workId) fd.append('workId', workId);

      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      if (!json.url) throw new Error('No URL in response');
      D.toast("✓ ატვირთულია Cloudinary-ზე");
      return json.url;
    } catch (e) {
      console.warn('API upload failed, falling back to base64:', e.message);
      D.toast("⚠ API მიუწვდომელია — base64 გამოიყენება");
      return readFile(file);
    }
  }

  /* ===================================================================
     AUTH — stores password in memory for API calls
     =================================================================== */
  let _adminPassword = null; /* set on successful login */

  function isAdmin() { return document.body.classList.contains("admin"); }

  function enterAdmin(pwd) {
    _adminPassword = pwd;
    if (window.DPAdmin) window.DPAdmin._adminPassword = pwd;
    document.body.classList.add("admin");
    sessionStorage.setItem(AUTH_KEY, "1");
    makeTextEditable(true);
    wireCards();
    wireHeroImgTransform();
    D.toast("✎ Edit mode ჩართულია");
  }
  function exitAdmin() {
    _adminPassword = null;
    if (window.DPAdmin) window.DPAdmin._adminPassword = null;
    document.body.classList.remove("admin");
    sessionStorage.removeItem(AUTH_KEY);
    makeTextEditable(false);
    D.rerender();
    D.toast("Edit mode გამოირთო");
  }

  function loginPrompt() {
    openModal(`
      <h3>Admin login</h3>
      <label>Password</label>
      <input type="password" id="mPass" placeholder="••••••••" autofocus>
      <div class="modal-note">პაროლი: meta.adminPassword (data.js ან Railway env)</div>
      <div class="modal-actions">
        <button class="cancel" id="mCancel">Cancel</button>
        <button class="save" id="mGo">Enter</button>
      </div>`);
    const go = () => {
      const entered = $("#mPass").value;
      if (entered === D.data.meta.adminPassword) { closeModal(); enterAdmin(entered); }
      else D.toast("არასწორი პაროლი");
    };
    $("#mGo").onclick = go;
    $("#mCancel").onclick = closeModal;
    $("#mPass").onkeydown = (e) => { if (e.key === "Enter") go(); };
  }

  $("#adminFab").addEventListener("click", () => { isAdmin() ? exitAdmin() : loginPrompt(); });

  /* ===================================================================
     INLINE TEXT EDIT  ([data-edit])
     =================================================================== */
  const MULTILINE = new Set(["hero.name", "contact.heading"]);
  function makeTextEditable(on) {
    $$("[data-edit]").forEach((node) => {
      const path = node.dataset.edit;
      if (on) {
        node.contentEditable = "true";
        node.spellcheck = false;
        if (!node._bound) {
          node._bound = true;
          node.addEventListener("focus", () => {
            if (MULTILINE.has(path)) node.textContent = D.getPath(path); // edit raw text
          });
          node.addEventListener("blur", () => {
            const v = node.innerText.replace(/\u00a0/g, " ").trim();
            D.setPath(path, v); D.save();
            if (MULTILINE.has(path) || path.startsWith("hero.") || path.startsWith("contact."))
              D.bindEditables();
            // refresh dependent UI
            if (path.startsWith("hero.")) D.renderHero();
          });
          node.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !MULTILINE.has(path)) { e.preventDefault(); node.blur(); }
          });
        }
      } else {
        node.contentEditable = "false";
      }
    });
  }

  /* ===================================================================
     FREE-TRANSFORM — pan + zoom for gallery images & hero cover
     =================================================================== */
  let _drag = null; // { img, ctr, startX, startY, startTx, startTy, s }
  let _saveTimer = null;

  /** Get actual rendered size of an <img> with object-fit:cover */
  function _imgRendered(img, ctr) {
    const cw = ctr.clientWidth, ch = ctr.clientHeight;
    const nw = img.naturalWidth  || cw;
    const nh = img.naturalHeight || ch;
    const scale = Math.max(cw / nw, ch / nh);
    return { w: nw * scale, h: nh * scale };
  }

  /** Clamp translation so no empty space is revealed.
   *  Minimum scale = 1.0 so image always fills the container. */
  function _clampTfm(nx, ny, ns, img, ctr) {
    const s = Math.max(1.0, ns);   // never shrink below container fill
    const { w, h } = _imgRendered(img, ctr);
    const cw = ctr.clientWidth, ch = ctr.clientHeight;
    const rw = w * s, rh = h * s;
    const maxX = Math.max(0, (rw - cw) / 2);
    const maxY = Math.max(0, (rh - ch) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, nx)),
             y: Math.max(-maxY, Math.min(maxY, ny)),
             s };
  }

  /** Apply transform to img element */
  function _applyTfm(img, t) {
    img.style.transform = `translate(${t.x}px,${t.y}px) scale(${t.s})`;
  }

  /** Debounce-save transform to DATA (key = 'imgTransform' or 'heroTransform') */
  function _saveImgTfm(w, t, key) {
    w[key || 'imgTransform'] = { x: t.x, y: t.y, s: t.s };
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => D.save(), 600);
  }

  /** Wire pan (drag) on a .media, .frame, or crop-modal element.
   *  transformKey = 'imgTransform' (default) or 'heroTransform' */
  function wireMediaTransform(mediaEl, getWork, getImg, transformKey) {
    const key = transformKey || 'imgTransform';
    if (mediaEl._tfmWired) return;
    mediaEl._tfmWired = true;

    /* ── pointer down (mouse) ── */
    mediaEl.addEventListener("mousedown", (e) => {
      if (!isAdmin()) return;
      if (e.button !== 0) return;
      /* skip tool buttons, reset btn, and resize handles */
      if (e.target.closest(".card-tools,.img-reset-btn,.resize-handle,.img-scale-handle")) return;
      e.preventDefault();
      const img = getImg();
      if (!img) return;
      const w = getWork(); if (!w) return;
      const t = w[key] || { x:0, y:0, s:1 };
      _drag = { img, ctr: mediaEl, startX: e.clientX, startY: e.clientY,
                startTx: t.x, startTy: t.y, s: t.s, work: w, key };
      mediaEl.classList.add("dragging");
      /* tell card not to drag-reorder while we're transforming */
      const card = mediaEl.closest(".card");
      if (card) card.draggable = false;
    });

    /* ── touch start ── */
    mediaEl.addEventListener("touchstart", (e) => {
      if (!isAdmin()) return;
      if (e.target.closest(".card-tools,.img-reset-btn,.resize-handle,.img-scale-handle")) return;
      if (e.touches.length !== 1) return;
      const img = getImg();
      if (!img) return;
      const w = getWork(); if (!w) return;
      const t = w[key] || { x:0, y:0, s:1 };
      _drag = { img, ctr: mediaEl, startX: e.touches[0].clientX, startY: e.touches[0].clientY,
                startTx: t.x, startTy: t.y, s: t.s, work: w, key, touch: true };
      mediaEl.classList.add("dragging");
    }, { passive: true });

    /* ── Ctrl+scroll = image zoom ── */
    mediaEl.addEventListener("wheel", (e) => {
      if (!isAdmin()) return;
      if (!e.ctrlKey && !e.altKey) return; /* require modifier so page still scrolls normally */
      e.preventDefault(); e.stopPropagation();
      const img = getImg();
      if (!img) return;
      const w = getWork(); if (!w) return;
      const t = w[key] || { x:0, y:0, s:1 };
      const factor = e.deltaY < 0 ? 1.08 : 0.925; /* scroll up = zoom in */
      const clamped = _clampTfm(t.x, t.y, t.s * factor, img, mediaEl);
      _applyTfm(img, clamped);
      _saveImgTfm(w, clamped, key);
    }, { passive: false });
  }

  /* ── global mouse/touch move + up (outside element) ── */
  document.addEventListener("mousemove", (e) => {
    if (!_drag) return;
    const dx = e.clientX - _drag.startX;
    const dy = e.clientY - _drag.startY;
    const clamped = _clampTfm(_drag.startTx + dx, _drag.startTy + dy, _drag.s, _drag.img, _drag.ctr);
    _applyTfm(_drag.img, clamped);
    _drag.live = clamped;
  });
  document.addEventListener("mouseup", () => {
    if (!_drag) return;
    if (_drag.live) _saveImgTfm(_drag.work, _drag.live, _drag.key);
    _drag.ctr.classList.remove("dragging");
    // re-enable card drag-reorder
    const card = _drag.ctr.closest(".card");
    if (card) setTimeout(() => { card.draggable = true; }, 0);
    _drag = null;
  });
  document.addEventListener("touchmove", (e) => {
    if (!_drag || !_drag.touch) return;
    const dx = e.touches[0].clientX - _drag.startX;
    const dy = e.touches[0].clientY - _drag.startY;
    const clamped = _clampTfm(_drag.startTx + dx, _drag.startTy + dy, _drag.s, _drag.img, _drag.ctr);
    _applyTfm(_drag.img, clamped);
    _drag.live = clamped;
  }, { passive: true });
  document.addEventListener("touchend", () => {
    if (!_drag || !_drag.touch) return;
    if (_drag.live) _saveImgTfm(_drag.work, _drag.live, _drag.key);
    _drag.ctr.classList.remove("dragging");
    _drag = null;
  });

  /** Inject a reset button into a media/frame element */
  function addResetBtn(mediaEl, getWork, getImg) {
    if (mediaEl.querySelector(".img-reset-btn")) return;
    const btn = document.createElement("button");
    btn.className = "img-reset-btn";
    btn.textContent = "↺ Reset";
    btn.title = "სურათის პოზიცია გადაყენება";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const img = getImg(); if (!img) return;
      const w = getWork();
      delete w.imgTransform;
      img.style.transform = "";
      D.save();
    });
    mediaEl.appendChild(btn);
  }

  /** Corner resize handles for GALLERY CARDS — drag changes card size class.
   *  Drag outward → lg/wide/tall · drag inward → md/sm
   *  Direction determines wide vs tall preference at large sizes. */
  function addResizeHandles(mediaEl, getWork) {
    if (mediaEl.querySelector(".resize-handle")) return;
    const card = mediaEl.closest(".card");
    if (!card) return; // only for gallery cards
    [
      { cls:"resize-nw", sx:-1, sy:-1 },
      { cls:"resize-ne", sx: 1, sy:-1 },
      { cls:"resize-sw", sx:-1, sy: 1 },
      { cls:"resize-se", sx: 1, sy: 1 },
    ].forEach(({ cls, sx, sy }) => {
      const h = document.createElement("div");
      h.className = "resize-handle " + cls;
      h.addEventListener("mousedown", (e) => {
        if (!isAdmin()) return;
        e.preventDefault(); e.stopPropagation();
        const w = getWork(); if (!w) return;
        const startX = e.clientX, startY = e.clientY;
        const origSize = w.size || 'md';
        let currentSize = origSize;

        /* floating size label */
        const ind = document.createElement("div");
        ind.className = "size-drag-indicator";
        ind.textContent = origSize.toUpperCase();
        card.appendChild(ind);

        const STEP = 70; // px per size step
        const onMove = (me) => {
          const dx = me.clientX - startX;
          const dy = me.clientY - startY;
          /* signed delta: outward from this corner = positive */
          const delta = (dx * sx + dy * sy) / 2;
          const absDx = Math.abs(dx), absDy = Math.abs(dy);
          const isVertical = absDy > absDx * 1.4 && delta > 0;

          let newSize;
          if (isVertical)               newSize = 'tall';
          else if (delta < -STEP)       newSize = 'sm';
          else if (delta < 0)           newSize = 'md';
          else if (delta < STEP)        newSize = 'lg';
          else if (delta < 2 * STEP)    newSize = 'wide';
          else if (delta < 3 * STEP)    newSize = 'xl';
          else                          newSize = 'full';

          if (newSize !== currentSize) {
            card.dataset.size = newSize;
            ind.textContent   = newSize.toUpperCase();
            currentSize = newSize;
          }
        };
        const onUp = () => {
          card.removeChild(ind);
          if (currentSize !== origSize) { w.size = currentSize; D.save(); }
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup",   onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup",   onUp);
      });
      mediaEl.appendChild(h);
    });
  }

  /** Corner scale handles for HERO / CROP frames — drag to zoom image.
   *  transformKey = 'imgTransform' or 'heroTransform'. */
  function addImageScaleHandles(mediaEl, getWork, getImg, transformKey) {
    const key = transformKey || 'imgTransform';
    if (mediaEl.querySelector(".img-scale-handle")) return;
    [
      { cls:"resize-nw", sx:-1, sy:-1 },
      { cls:"resize-ne", sx: 1, sy:-1 },
      { cls:"resize-sw", sx:-1, sy: 1 },
      { cls:"resize-se", sx: 1, sy: 1 },
    ].forEach(({ cls, sx, sy }) => {
      const h = document.createElement("div");
      h.className = "img-scale-handle resize-handle " + cls;
      h.addEventListener("mousedown", (e) => {
        if (!isAdmin()) return;
        e.preventDefault(); e.stopPropagation();
        const img = getImg(); const w = getWork();
        if (!img || !w) return;
        const t0     = w[key] || { x:0, y:0, s:1 };
        const startX = e.clientX, startY = e.clientY, startS = t0.s;
        const avgSize = (mediaEl.clientWidth + mediaEl.clientHeight) / 2;
        let live = null;
        const onMove = (me) => {
          const delta = ((me.clientX - startX) * sx + (me.clientY - startY) * sy) / 2;
          const ns    = Math.max(0.25, startS * (1 + (delta / avgSize) * 2.6));
          const clamped = _clampTfm(t0.x, t0.y, ns, img, mediaEl);
          _applyTfm(img, clamped); live = clamped;
        };
        const onUp = () => {
          if (live) _saveImgTfm(w, live, key);
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup",   onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup",   onUp);
      });
      mediaEl.appendChild(h);
    });
  }

  /** Wire admin controls on gallery cards.
   *  Images are shown full (contain) — no pan/drag needed.
   *  Only the corner resize handles (card size class) are wired. */
  function wireImgTransforms() {
    if (!isAdmin()) return;
    $$("#gallery .card").forEach((card) => {
      const id = card.dataset.id;
      const mediaEl = card.querySelector(".media");
      if (!mediaEl) return;
      addResizeHandles(mediaEl, () => D.workById(id)); /* card size class only */
    });
  }

  /** Wire free-transform on the hero cover image */
  function wireHeroImgTransform() {
    if (!isAdmin()) return;
    const frame = document.querySelector(".hero-art .frame");
    if (!frame || frame._tfmWired) return;
    const getHeroWork = () => D.heroSlider ? D.heroSlider.currentWork : null;
    const getHeroImg  = () => document.getElementById("heroImg");
    wireMediaTransform(frame, getHeroWork, getHeroImg, 'heroTransform');
    addResetBtn(frame, getHeroWork, getHeroImg);
    addImageScaleHandles(frame, getHeroWork, getHeroImg, 'heroTransform');
  }

  /* ===================================================================
     CARDS — drag reorder · resize · edit · delete
     =================================================================== */
  let dragId = null;
  function wireCards() {
    if (!isAdmin()) return;
    $$("#gallery .card").forEach((card) => {
      card.draggable = true;
      card.ondragstart = (e) => {
        /* Block reorder-drag when it originates from the image/media area
           (that gesture is reserved for image-pan).
           The user drags the caption strip to reorder. */
        if (e.target.closest(".media")) { e.preventDefault(); return; }
        dragId = card.dataset.id;
        card.classList.add("drag-active");
        e.dataTransfer.effectAllowed = "move";
      };
      card.ondragend = () => {
        dragId = null;
        $$(".card").forEach(c => c.classList.remove("drag-active","drop-target"));
      };
      card.ondragover = (e) => { e.preventDefault(); card.classList.add("drop-target"); };
      card.ondragleave = () => card.classList.remove("drop-target");
      card.ondrop = (e) => {
        e.preventDefault(); card.classList.remove("drop-target");
        if (!dragId || dragId === card.dataset.id) return;
        const works = D.data.works;
        const from = works.findIndex(w => w.id === dragId);
        const to   = works.findIndex(w => w.id === card.dataset.id);
        const [m] = works.splice(from, 1); works.splice(to, 0, m);
        D.save(); D.renderGallery();
      };
      /* tool buttons */
      const tools = card.querySelector(".card-tools");
      tools.onclick = (e) => {
        e.stopPropagation();
        const t = e.target.closest("button"); if (!t) return;
        const id = card.dataset.id;
        if (t.dataset.tool === "size") sizeModal(id);
        if (t.dataset.tool === "edit") workModal(id);
        if (t.dataset.tool === "open") { location.hash = "work/" + id; }
        if (t.dataset.tool === "del") delWork(id);
      };
    });
    wireImgTransforms();
  }

  function sizeModal(id) {
    const w = D.workById(id);
    const sizes = ["sm", "md", "lg", "wide", "tall"];
    openModal(`
      <h3>ზომა — ${w.title}</h3>
      <div class="size-pills">
        ${sizes.map(s => `<button data-s="${s}" class="${w.size === s ? "active" : ""}">${s}</button>`).join("")}
      </div>
      <div class="modal-note">sm = პატარა · lg = დიდი · wide = განიერი · tall = მაღალი</div>
      <div class="modal-actions"><button class="cancel" id="mClose">Done</button></div>`);
    modalBox.querySelectorAll(".size-pills button").forEach(b => {
      b.onclick = () => { w.size = b.dataset.s; D.save(); D.renderGallery();
        modalBox.querySelectorAll(".size-pills button").forEach(x => x.classList.remove("active"));
        b.classList.add("active"); };
    });
    $("#mClose").onclick = closeModal;
  }

  function workModal(id) {
    const w = D.workById(id);
    openModal(`
      <h3>ნამუშევრის რედაქტირება</h3>
      <img id="wPrev" src="${w.img}" style="width:100%;max-height:200px;object-fit:cover;border:2px solid var(--ink);margin-bottom:10px">
      <label>სურათის შეცვლა</label><input type="file" id="wImg" accept="image/*,.tif,.tiff,.heic,.heif,.raw,.dng,.cr2,.nef,.arw,.psd">
      <label>Title</label><input id="wTitle" value="${attr(w.title)}">
      <label>Year</label><input id="wYear" value="${attr(w.year)}">
      <label>Medium</label><input id="wMed" value="${attr(w.medium)}">
      <label>Dimensions / ზომები (სურვილისამებრ)</label><input id="wDim" value="${attr(w.dimensions || "")}" placeholder="120×100cm">
      <label>Description</label><textarea id="wDesc">${esc(w.desc)}</textarea>
      <label>ფასი (სურვილისამებრ)</label><input id="wPrice" value="${attr(w.price || "")}" placeholder="₾ 500 · €180">
      <div class="toggle-row">
        <span class="toggle-label">ფასი საჯაროდ ჩვენება</span>
        <input type="checkbox" id="wShowPrice" ${w.showPrice ? "checked" : ""}>
      </div>
      <div class="modal-actions">
        <button class="cancel" id="mCancel">Cancel</button>
        <button class="save" id="mSave">Save</button>
      </div>`);
    let newImg = null;
    $("#wImg").onchange = async (e) => {
      if (e.target.files[0]) {
        newImg = await uploadImage(e.target.files[0], id);
        $("#wPrev").src = newImg;
      }
    };
    $("#mSave").onclick = () => {
      w.title = $("#wTitle").value; w.year = $("#wYear").value;
      w.medium = $("#wMed").value; w.dimensions = $("#wDim").value;
      w.desc = $("#wDesc").value;
      w.price = $("#wPrice").value; w.showPrice = $("#wShowPrice").checked;
      if (newImg) w.img = newImg;
      D.save(); D.renderGallery(); D.renderHero();
      if (document.getElementById("detail").classList.contains("open")) D.renderDetail(id);
      closeModal(); D.toast("შენახულია");
    };
    $("#mCancel").onclick = closeModal;
  }

  function delWork(id) {
    const w = D.workById(id);
    if (!confirm(`წავშალო „${w.title}"?`)) return;
    const i = D.data.works.findIndex(x => x.id === id);
    D.data.works.splice(i, 1); D.save(); D.renderGallery();
  }

  function addWork() {
    openModal(`
      <h3>ახალი ნამუშევარი</h3>
      <label>სურათი (აუცილებელია)</label><input type="file" id="nImg" accept="image/*,.tif,.tiff,.heic,.heif,.raw,.dng,.cr2,.nef,.arw,.psd">
      <img id="nPrev" style="display:none;width:100%;max-height:200px;object-fit:cover;border:2px solid var(--ink);margin-top:10px">
      <label>Title</label><input id="nTitle" placeholder="UNTITLED">
      <label>Year</label><input id="nYear" placeholder="2026">
      <label>Medium</label><input id="nMed" placeholder="Mixed media">
      <label>Description</label><textarea id="nDesc"></textarea>
      <label>ფასი (სურვილისამებრ)</label><input id="nPrice" placeholder="₾ 500 · €180">
      <div class="toggle-row">
        <span class="toggle-label">ფასი საჯაროდ ჩვენება</span>
        <input type="checkbox" id="nShowPrice">
      </div>
      <div class="modal-actions">
        <button class="cancel" id="mCancel">Cancel</button>
        <button class="save" id="mSave">Add</button>
      </div>`);
    let img = null;
    $("#nImg").onchange = async (e) => {
      if (e.target.files[0]) {
        img = await uploadImage(e.target.files[0], null);
        const p = $("#nPrev"); p.src = img; p.style.display = "block";
      }
    };
    $("#mSave").onclick = () => {
      if (!img) { D.toast("ატვირთე სურათი"); return; }
      const id = "w" + Date.now().toString(36);
      D.data.works.push({
        id, img, title: $("#nTitle").value || "UNTITLED", year: $("#nYear").value || "—",
        medium: $("#nMed").value || "Mixed media", size: "md", desc: $("#nDesc").value || "",
        price: $("#nPrice").value, showPrice: $("#nShowPrice").checked,
        photos: [], videos: []
      });
      D.save(); D.renderGallery(); D.renderStudio(); closeModal(); D.toast("ნამუშევარი დაემატა");
    };
    $("#mCancel").onclick = closeModal;
  }

  /* ===================================================================
     EXHIBITIONS
     =================================================================== */
  function exModal(idx) {
    const it = idx == null ? { year: "", type: "Solo", title: "", venue: "" } : D.data.exhibitions.items[idx];
    openModal(`
      <h3>${idx == null ? "ახალი ჩანაწერი" : "რედაქტირება"}</h3>
      <label>Year</label><input id="eYear" value="${attr(it.year)}">
      <label>Type</label><input id="eType" value="${attr(it.type)}" placeholder="Solo / Group / Award / Residency">
      <label>Title</label><input id="eTitle" value="${attr(it.title)}">
      <label>Venue</label><input id="eVenue" value="${attr(it.venue)}">
      <div class="modal-actions">
        <button class="cancel" id="mCancel">Cancel</button>
        <button class="save" id="mSave">Save</button>
      </div>`);
    $("#mSave").onclick = () => {
      const rec = { year: $("#eYear").value, type: $("#eType").value, title: $("#eTitle").value, venue: $("#eVenue").value };
      if (idx == null) D.data.exhibitions.items.unshift(rec); else D.data.exhibitions.items[idx] = rec;
      D.save(); D.renderExhibitions(); closeModal();
    };
    $("#mCancel").onclick = closeModal;
  }
  // delete via delegated click
  document.addEventListener("click", (e) => {
    const d = e.target.closest("[data-del-ex]");
    if (d && isAdmin()) { e.stopPropagation(); D.data.exhibitions.items.splice(+d.dataset.delEx, 1); D.save(); D.renderExhibitions(); }
  });

  /* ===================================================================
     JOURNAL
     =================================================================== */
  function postModal(idx) {
    const works = D.data.works;
    const p = idx == null ? { tag: "NOTE", title: "", excerpt: "", date: "", workId: works[0] && works[0].id } : D.data.journal.posts[idx];
    openModal(`
      <h3>${idx == null ? "ახალი პოსტი" : "პოსტის რედაქტირება"}</h3>
      <label>Tag</label><input id="pTag" value="${attr(p.tag)}">
      <label>Title</label><input id="pTitle" value="${attr(p.title)}">
      <label>Excerpt</label><textarea id="pEx">${esc(p.excerpt)}</textarea>
      <label>Date</label><input id="pDate" value="${attr(p.date)}" placeholder="MAY 2026">
      <label>Cover image (work)</label>
      <select id="pWork">${works.map(w => `<option value="${w.id}" ${w.id === p.workId ? "selected" : ""}>${esc(w.title)}</option>`).join("")}</select>
      <div class="modal-actions">
        <button class="cancel" id="mCancel">Cancel</button>
        <button class="save" id="mSave">Save</button>
      </div>`);
    $("#mSave").onclick = () => {
      const rec = { tag: $("#pTag").value, title: $("#pTitle").value, excerpt: $("#pEx").value, date: $("#pDate").value, workId: $("#pWork").value };
      if (idx == null) D.data.journal.posts.unshift(rec); else D.data.journal.posts[idx] = rec;
      D.save(); D.renderJournal(); closeModal();
    };
    $("#mCancel").onclick = closeModal;
  }
  document.addEventListener("click", (e) => {
    const d = e.target.closest("[data-del-post]");
    if (d && isAdmin()) { e.stopPropagation(); D.data.journal.posts.splice(+d.dataset.delPost, 1); D.save(); D.renderJournal(); }
  });

  /* ===================================================================
     DETAIL PAGE — text edit · photo & video upload
     =================================================================== */
  function wireDetail(w) {
    if (!isAdmin()) return;
    $$('[data-work-edit]').forEach((node) => {
      node.spellcheck = false;
      node.addEventListener("blur", () => {
        const [id, field] = node.dataset.workEdit.split(":");
        const work = D.workById(id);
        work[field] = node.innerText.trim();
        D.save(); D.renderGallery();
      });
    });
    /* "Edit Work Info" button opens the work modal */
    const ewBtn = $(`[data-edit-work="${w.id}"]`);
    if (ewBtn) ewBtn.onclick = () => workModal(w.id);
    /* All add-photo / add-video buttons in the detail view */
    $$(`[data-add-photo="${w.id}"]`).forEach(btn => { btn.onclick = () => photoModal(w.id); });
    $$(`[data-add-video="${w.id}"]`).forEach(btn => { btn.onclick = () => videoModal(w.id); });
  }

  function photoModal(id) {
    const w = D.workById(id);
    openModal(`
      <h3>ფოტოების დამატება</h3>
      <label>ფაილების ატვირთვა (მრავალი შესაძლებელია — .jpg .png .tif .heic .raw …)</label>
      <input type="file" id="phFiles" accept="image/*,.tif,.tiff,.heic,.heif,.raw,.dng,.cr2,.nef,.arw,.psd" multiple>
      <label>ან ჩასვი სურათის URL</label>
      <input id="phUrl" placeholder="https://…">
      <div class="modal-note">⚠ დიდი ფაილები ბრაუზერის მეხსიერებას ავსებს. ბევრი ფოტოსთვის ჯობს ფაილები პირდაპირ <b>images/</b> საქაღალდეში ჩადო და URL მისცე.</div>
      ${(w.photos || []).length ? `<label>არსებული (დააჭირე წასაშლელად)</label><div id="phList" style="display:flex;flex-wrap:wrap;gap:6px">${w.photos.map((s, i) => `<img data-rm="${i}" src="${s}" style="width:54px;height:54px;object-fit:cover;border:2px solid var(--ink);cursor:pointer">`).join("")}</div>` : ""}
      <div class="modal-actions">
        <button class="cancel" id="mCancel">Close</button>
        <button class="save" id="mSave">Add</button>
      </div>`);
    if (w.photos && w.photos.length) modalBox.querySelectorAll("[data-rm]").forEach(im => im.onclick = () => {
      w.photos.splice(+im.dataset.rm, 1); D.save(); D.renderDetail(id); photoModal(id);
    });
    $("#mSave").onclick = async () => {
      w.photos = w.photos || [];
      const files = $("#phFiles").files;
      for (const f of files) w.photos.push(await uploadImage(f, id));
      if ($("#phUrl").value.trim()) w.photos.push($("#phUrl").value.trim());
      D.save(); D.renderDetail(id); D.toast("ფოტო დაემატა"); closeModal();
    };
    $("#mCancel").onclick = closeModal;
  }

  function videoModal(id) {
    const w = D.workById(id);
    openModal(`
      <h3>ვიდეოს დამატება</h3>
      <label>YouTube / Vimeo ბმული</label>
      <input id="vUrl" placeholder="https://youtu.be/…">
      <label>ან ვიდეო ფაილის ატვირთვა</label>
      <input type="file" id="vFile" accept="video/*">
      <div class="modal-note">⚠ ვიდეო ფაილის ატვირთვა ბრაუზერში დიდ ადგილს იკავებს — სჯობს YouTube/Vimeo ბმული.</div>
      ${(w.videos || []).length ? `<label>არსებული (დააჭირე წასაშლელად)</label><div id="vList">${w.videos.map((s, i) => `<div data-rm="${i}" style="cursor:pointer;font-family:var(--f-mono);font-size:.7rem;padding:6px;border:1px solid var(--ink);margin-top:4px">✕ ${esc(String(s).slice(0, 48))}…</div>`).join("")}</div>` : ""}
      <div class="modal-actions">
        <button class="cancel" id="mCancel">Close</button>
        <button class="save" id="mSave">Add</button>
      </div>`);
    if (w.videos && w.videos.length) modalBox.querySelectorAll("[data-rm]").forEach(el => el.onclick = () => {
      w.videos.splice(+el.dataset.rm, 1); D.save(); D.renderDetail(id); videoModal(id);
    });
    $("#mSave").onclick = async () => {
      w.videos = w.videos || [];
      if ($("#vUrl").value.trim()) w.videos.push($("#vUrl").value.trim());
      if ($("#vFile").files[0]) w.videos.push(await readFile($("#vFile").files[0]));
      D.save(); D.renderDetail(id); D.toast("ვიდეო დაემატა"); closeModal();
    };
    $("#mCancel").onclick = closeModal;
  }

  /* ===================================================================
     COVER CROP MODAL — adjust image position/zoom for hero display
     =================================================================== */
  function openCropModal(workId) {
    const w = D.workById(workId); if (!w) return;
    openModal(`
      <h3 style="margin-bottom:10px">🖼 Cover Crop — ${esc(w.title)}</h3>
      <div id="cropFrame" style="position:relative;width:100%;padding-top:52%;overflow:hidden;background:#111;border:2px solid var(--ink);cursor:grab">
        <img id="cropImg" src="${esc(w.img)}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;">
        <div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);font-family:var(--f-mono);font-size:.48rem;color:rgba(255,255,255,.45);letter-spacing:.18em;pointer-events:none;white-space:nowrap">DRAG TO PAN · CORNER HANDLES TO ZOOM</div>
      </div>
      <div class="modal-actions" style="margin-top:10px">
        <button class="cancel" id="mCancel">Cancel</button>
        <button class="cancel" id="mReset">↺ Reset</button>
        <button class="save" id="mSave">✓ Save Cover Crop</button>
      </div>`);

    const cropFrame = document.getElementById("cropFrame");
    const cropImg   = document.getElementById("cropImg");

    /* apply existing heroTransform (or imgTransform fallback) */
    const t = w.heroTransform || w.imgTransform || { x:0, y:0, s:1 };
    _applyTfm(cropImg, t);

    /* wire pan + image-scale handles — both use 'heroTransform' key */
    wireMediaTransform(cropFrame, () => w, () => cropImg, 'heroTransform');
    addImageScaleHandles(cropFrame, () => w, () => cropImg, 'heroTransform');

    document.getElementById("mCancel").onclick = closeModal;
    document.getElementById("mReset").onclick = () => {
      delete w.heroTransform;
      cropImg.style.transform = "";
    };
    document.getElementById("mSave").onclick = () => {
      D.save();
      /* reflect on live hero if it's showing this work */
      if (D.heroSlider) {
        const hw = D.heroSlider.currentWork;
        const heroImg = document.getElementById("heroImg");
        if (hw && heroImg && hw.id === workId) {
          const ht = w.heroTransform;
          heroImg.style.transform = ht ? `translate(${ht.x||0}px,${ht.y||0}px) scale(${ht.s||1})` : '';
        }
      }
      closeModal();
      D.toast("✓ Cover crop შენახულია");
    };
  }

  /* ===================================================================
     COVER GALLERY — choose which works appear in hero slider
     =================================================================== */
  function coverGalleryModal() {
    const works  = D.data.works;
    const selIds = (D.data.hero.sliderWorkIds || []).slice();

    const grid = works.map(w => `
      <div class="cover-pick-item ${selIds.includes(w.id) ? "selected" : ""}" data-cpid="${w.id}">
        <img src="${esc(w.img)}" alt="${esc(w.title)}" loading="lazy">
        <div class="cp-check">✓</div>
      </div>`).join("");

    const ordered = selIds.map(id => {
      const w = works.find(x => x.id === id);
      return w ? `<span class="cover-order-item" data-oid="${id}">${esc(w.title.slice(0,12))}<button data-rm-oid="${id}">✕</button></span>` : "";
    }).join("");

    openModal(`
      <h3>Cover Gallery</h3>
      <div class="modal-note">ნამუშევრები რომელიც მთავარ gallery-ში გამოჩნდება. ცარიელი = ყველა.</div>
      <label>ნამუშევრის შერჩევა (დაჭერით)</label>
      <div class="cover-pick-grid" id="cpGrid">${grid}</div>
      <label>შერჩეული — cover gallery თანმიმდევრობა</label>
      <div class="cover-order-list" id="cpOrder">${ordered || "<em style='font-family:var(--f-hand);color:var(--grey);font-size:.9rem'>ყველა ნამუშევარი</em>"}</div>
      <div class="modal-actions">
        <button class="cancel" id="mCancel">გაუქმება</button>
        <button class="cancel" id="cpClear">ყველა</button>
        <button class="save" id="mSave">შენახვა</button>
      </div>`);

    let chosen = selIds.slice();

    function refreshOrder() {
      const ord = $("#cpOrder");
      ord.innerHTML = chosen.length
        ? chosen.map(id => {
            const w = works.find(x => x.id === id);
            return w ? `<span class="cover-order-item" data-oid="${id}">${esc(w.title.slice(0,12))}<button class="cp-crop-btn" data-crop-oid="${id}" title="Crop / adjust view">✂</button><button data-rm-oid="${id}">✕</button></span>` : "";
          }).join("")
        : `<em style='font-family:var(--f-hand);color:var(--grey);font-size:.9rem'>ყველა ნამუშევარი</em>`;
      /* re-wire remove buttons */
      ord.querySelectorAll("[data-rm-oid]").forEach(b => {
        b.onclick = (e) => {
          e.stopPropagation();
          chosen = chosen.filter(x => x !== b.dataset.rmOid);
          const item = $("#cpGrid").querySelector(`[data-cpid="${b.dataset.rmOid}"]`);
          if (item) item.classList.remove("selected");
          refreshOrder();
        };
      });
      /* wire crop buttons */
      ord.querySelectorAll("[data-crop-oid]").forEach(b => {
        b.onclick = (e) => { e.stopPropagation(); openCropModal(b.dataset.cropOid); };
      });
    }

    /* toggle selection */
    $("#cpGrid").querySelectorAll(".cover-pick-item").forEach(item => {
      item.onclick = () => {
        const id = item.dataset.cpid;
        if (chosen.includes(id)) {
          chosen = chosen.filter(x => x !== id);
          item.classList.remove("selected");
        } else {
          chosen.push(id);
          item.classList.add("selected");
        }
        refreshOrder();
      };
    });

    $("#cpClear").onclick = () => { chosen = []; $("#cpGrid").querySelectorAll(".cover-pick-item").forEach(i => i.classList.remove("selected")); refreshOrder(); };

    $("#mSave").onclick = () => {
      D.data.hero.sliderWorkIds = chosen.slice();
      D.save();
      /* re-init slider */
      const hero = document.getElementById("hero");
      if (hero) {
        hero.querySelectorAll(".hero-arrow,.hero-dots,.hero-counter").forEach(el => el.remove());
        if (D.initHeroSlider) D.initHeroSlider();
      }
      closeModal();
      D.toast("✓ Cover gallery შენახულია");
    };
    $("#mCancel").onclick = closeModal;

    refreshOrder(); /* wire initial rm buttons */
  }

  /* ===================================================================
     PURCHASE REQUESTS — view orders from visitors
     =================================================================== */
  function purchasesModal() {
    const reqs = (D.data.purchaseRequests || []);
    const newCount = reqs.filter(r => !r.read).length;

    const cards = reqs.length ? reqs.map((r, i) => `
      <div class="req-card ${r.read ? "" : "req-new"}">
        ${!r.read ? `<span class="req-new-badge">ახალი</span>` : ""}
        <h4>${esc(r.workTitle)} ${r.price ? "— " + esc(r.price) : ""}</h4>
        <div class="req-meta">
          📅 ${esc(r.date)}<br>
          👤 ${esc(r.name)} ${esc(r.surname)}<br>
          📞 ${r.phone ? esc(r.phone) : "—"}<br>
          ✉ <a href="mailto:${esc(r.email)}" style="color:var(--blue)">${esc(r.email)}</a>
        </div>
        ${r.message ? `<div class="req-msg">${esc(r.message)}</div>` : ""}
        <div class="req-actions">
          ${!r.read ? `<button class="req-done" data-req-done="${i}">✓ დამუშავებული</button>` : `<span style="font-family:var(--f-mono);font-size:.6rem;color:var(--grey)">✓ დამუშავებული</span>`}
          <button data-req-del="${i}" style="border-color:var(--red);color:var(--red)">წაშლა</button>
        </div>
      </div>`).join("")
    : `<p style="font-family:var(--f-hand);font-weight:600;color:var(--grey);padding:20px 0">შეკვეთები არ არის</p>`;

    openModal(`
      <h3>შეკვეთები ${newCount ? `<span style="background:var(--red);color:#fff;font-size:.7rem;padding:2px 8px;border-radius:10px;margin-left:8px">${newCount} ახალი</span>` : ""}</h3>
      <div class="req-list">${cards}</div>
      <div class="modal-actions">
        <button class="cancel" id="mCancel">დახურვა</button>
        ${reqs.length ? `<button class="save" id="reqExport">⬇ CSV</button>` : ""}
      </div>`);

    /* mark done */
    modalBox.querySelectorAll("[data-req-done]").forEach(b => {
      b.onclick = () => { D.data.purchaseRequests[+b.dataset.reqDone].read = true; D.save(); purchasesModal(); };
    });
    /* delete */
    modalBox.querySelectorAll("[data-req-del]").forEach(b => {
      b.onclick = () => { if (!confirm("წაიშალოს?")) return; D.data.purchaseRequests.splice(+b.dataset.reqDel, 1); D.save(); purchasesModal(); };
    });
    /* CSV export */
    const expBtn = $("#reqExport");
    if (expBtn) expBtn.onclick = () => {
      const header = "Date,Work,Price,Name,Surname,Phone,Email,Message";
      const rows = reqs.map(r => [r.date,r.workTitle,r.price,r.name,r.surname,r.phone,r.email,(r.message||"").replace(/,/g," ")].map(v=>`"${v}"`).join(","));
      const blob = new Blob([header + "\n" + rows.join("\n")], {type:"text/csv"});
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = "purchase-requests.csv"; a.click(); URL.revokeObjectURL(a.href);
    };
    $("#mCancel").onclick = closeModal;
  }

  /* ===================================================================
     BACKGROUND FIGURES — upload PNG images that float on the background
     =================================================================== */
  function bgFragsModal() {
    if (!D.data.bgFrags) D.data.bgFrags = { items: [] };
    const items = D.data.bgFrags.items || [];

    const thumbs = items.map((it, i) => `
      <div style="position:relative;display:inline-flex;flex-direction:column;align-items:center;gap:4px">
        <div style="position:relative">
          <img src="${esc(it.src)}" style="width:68px;height:68px;object-fit:contain;border:2px solid var(--ink);background:#e8e2d4;display:block">
          <button data-del-bf="${i}" style="position:absolute;top:-7px;right:-7px;background:var(--red);color:#fff;width:20px;height:20px;border-radius:50%;font-size:.65rem;display:flex;align-items:center;justify-content:center;border:none;cursor:pointer;line-height:1">✕</button>
        </div>
        <div style="display:flex;align-items:center;gap:4px">
          <input type="range" data-op-bf="${i}" min="2" max="25" value="${Math.round((it.opacity||0.08)*100)}"
            style="width:52px;height:4px;cursor:pointer" title="გამჭვირვალობა">
          <span data-op-label="${i}" style="font-family:var(--f-mono);font-size:.55rem;color:var(--grey)">${Math.round((it.opacity||0.08)*100)}%</span>
        </div>
      </div>`).join("");

    openModal(`
      <h3>ფონის ფიგურები</h3>
      <div class="modal-note">ატვირთე PNG ფაილები (გამჭვირვალე ფონით) რომ ფონზე ტივტივებდნენ.</div>
      <label>PNG ფაილების ატვირთვა (შეგიძლია მრავალი ერთად)</label>
      <input type="file" id="bfFiles" accept="image/png,image/webp,image/*" multiple>
      ${items.length ? `
        <label>ატვირთული ფიგურები — ${items.length} ცალი</label>
        <div id="bfList" style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;padding:12px;border:2px solid var(--ink);max-height:220px;overflow-y:auto">
          ${thumbs}
        </div>
        <div style="margin-top:10px">
          <button class="cancel" id="bfClearAll" style="padding:8px 14px;font-size:.62rem">✕ ყველა წაშლა</button>
        </div>
      ` : `<p style="font-family:var(--f-hand);font-weight:600;color:var(--grey);margin-top:10px">ჯერ ფიგურები არ ატვირთულა — SVG-ები ჩანს</p>`}
      <div class="modal-note">⚠ PNG-ები ბრაუზერში ინახება. ბევრი დიდი ფაილი localStorage-ს ავსებს.</div>
      <div class="modal-actions">
        <button class="cancel" id="mCancel">დახურვა</button>
        <button class="save" id="mSave">ატვირთვა</button>
      </div>`);

    /* opacity sliders */
    modalBox.querySelectorAll("[data-op-bf]").forEach(sl => {
      sl.oninput = () => {
        const i = +sl.dataset.opBf;
        const v = +sl.value / 100;
        D.data.bgFrags.items[i].opacity = v;
        const lbl = modalBox.querySelector(`[data-op-label="${i}"]`);
        if (lbl) lbl.textContent = sl.value + "%";
        D.save();
        if (D.spawnBgFrags) D.spawnBgFrags();
      };
    });

    /* delete individual */
    modalBox.querySelectorAll("[data-del-bf]").forEach(btn => {
      btn.onclick = () => {
        D.data.bgFrags.items.splice(+btn.dataset.delBf, 1);
        D.save();
        if (D.spawnBgFrags) D.spawnBgFrags();
        bgFragsModal();
      };
    });

    /* clear all */
    const clrAll = $("#bfClearAll");
    if (clrAll) clrAll.onclick = () => {
      if (!confirm("ყველა ფიგურა წაიშლება?")) return;
      D.data.bgFrags.items = [];
      D.save();
      if (D.spawnBgFrags) D.spawnBgFrags();
      bgFragsModal();
    };

    /* upload new files */
    $("#mSave").onclick = async () => {
      const files = [...($("#bfFiles").files || [])];
      if (!files.length) { closeModal(); return; }
      D.toast("იტვირთება…");
      for (const f of files) {
        const src = await readFile(f);
        D.data.bgFrags.items.push({ src, opacity: 0.08, size: 120 });
      }
      D.save();
      if (D.spawnBgFrags) D.spawnBgFrags();
      closeModal(); D.toast(`✓ ${files.length} ფიგურა დაემატა`);
    };

    $("#mCancel").onclick = closeModal;
  }

  /* ===================================================================
     ADMIN BAR BUTTONS
     =================================================================== */
  /* ===================================================================
     PHOTOGRAPHY SECTION — upload photos
     =================================================================== */
  function photoSectionModal() {
    openModal(`
      <h3>ფოტოს დამატება</h3>
      <label>ფაილის ატვირთვა (.jpg .png .tif .heic .raw …)</label>
      <input type="file" id="psFile" accept="image/*,.tif,.tiff,.heic,.heif,.raw,.dng,.cr2,.nef,.arw,.psd">
      <img id="psPrev" style="display:none;width:100%;max-height:180px;object-fit:cover;border:2px solid var(--ink);margin-top:8px">
      <label>ან სურათის URL</label>
      <input id="psUrl" placeholder="https://…">
      <label>Caption (სურვილისამებრ)</label>
      <input id="psCap" placeholder="Tbilisi, 2026">
      <label>ფასი (სურვილისამებრ)</label>
      <input id="psPrice" placeholder="₾ 200 · €70">
      <div class="toggle-row">
        <span class="toggle-label">ფასი საჯაროდ ჩვენება</span>
        <input type="checkbox" id="psShowPrice">
      </div>
      <div class="modal-note">⚠ დიდი ფაილები ბრაუზერს ავსებს — სჯობს URL გამოიყენო.</div>
      <div class="modal-actions">
        <button class="cancel" id="mCancel">Cancel</button>
        <button class="save" id="mSave">Add photo</button>
      </div>`);
    let src = null;
    $("#psFile").onchange = async (e) => {
      if (e.target.files[0]) {
        src = await uploadImage(e.target.files[0], null);
        const p = $("#psPrev"); p.src = src; p.style.display = "block";
      }
    };
    $("#mSave").onclick = async () => {
      const url = $("#psUrl").value.trim();
      const finalSrc = src || url;
      if (!finalSrc) { D.toast("ატვირთე ფოტო ან მიუთითე URL"); return; }
      if (!D.data.photography) D.data.photography = { heading: "PHOTOGRAPHY", intro: "", photos: [] };
      if (!D.data.photography.photos) D.data.photography.photos = [];
      D.data.photography.photos.push({
        src: finalSrc,
        caption: $("#psCap").value.trim(),
        price: $("#psPrice").value.trim(),
        showPrice: $("#psShowPrice").checked
      });
      D.save();
      if (D.renderPhotography) D.renderPhotography();
      closeModal(); D.toast("ფოტო დაემატა");
    };
    $("#mCancel").onclick = closeModal;
  }

  function editPhotoModal(idx) {
    if (!D.data.photography || !D.data.photography.photos) return;
    const ph = D.data.photography.photos[idx];
    if (!ph) return;
    openModal(`
      <h3>ფოტოს რედაქტირება</h3>
      <img id="epPrev" src="${esc(ph.src)}" style="width:100%;max-height:160px;object-fit:cover;border:2px solid var(--ink);margin-bottom:10px">
      <label>სურათის შეცვლა (.jpg .png .tif .heic .raw …)</label>
      <input type="file" id="epFile" accept="image/*,.tif,.tiff,.heic,.heif,.raw,.dng,.cr2,.nef,.arw,.psd">
      <label>Caption</label>
      <input id="epCap" value="${attr(ph.caption || "")}">
      <label>ფასი (სურვილისამებრ)</label>
      <input id="epPrice" value="${attr(ph.price || "")}" placeholder="₾ 200 · €70">
      <div class="toggle-row">
        <span class="toggle-label">ფასი საჯაროდ ჩვენება</span>
        <input type="checkbox" id="epShowPrice" ${ph.showPrice ? "checked" : ""}>
      </div>
      <div class="modal-actions">
        <button class="cancel" id="mCancel">Cancel</button>
        <button class="save" id="mSave">Save</button>
      </div>`);
    let newSrc = null;
    $("#epFile").onchange = async (e) => {
      if (e.target.files[0]) {
        newSrc = await uploadImage(e.target.files[0], null);
        $("#epPrev").src = newSrc;
      }
    };
    $("#mSave").onclick = () => {
      ph.caption = $("#epCap").value.trim();
      ph.price = $("#epPrice").value.trim();
      ph.showPrice = $("#epShowPrice").checked;
      if (newSrc) ph.src = newSrc;
      D.save();
      if (D.renderPhotography) D.renderPhotography();
      closeModal(); D.toast("შენახულია");
    };
    $("#mCancel").onclick = closeModal;
  }

  /* delegated delete / edit for photography photos */
  document.addEventListener("click", (e) => {
    const d = e.target.closest("[data-del-photo]");
    if (d && isAdmin()) {
      e.stopPropagation();
      if (!D.data.photography || !D.data.photography.photos) return;
      D.data.photography.photos.splice(+d.dataset.delPhoto, 1);
      D.save();
      if (D.renderPhotography) D.renderPhotography();
      return;
    }
    const ep = e.target.closest("[data-edit-photo]");
    if (ep && isAdmin()) {
      e.stopPropagation();
      editPhotoModal(+ep.dataset.editPhoto);
    }
  });

  /* ── Section toggle panel ── */
  function openSectionsPanel() {
    const SECS = [
      { id:'works',        label:'Works / Portfolio' },
      { id:'about',        label:'About the Artist' },
      { id:'studio',       label:'Studio / Process' },
      { id:'exhibitions',  label:'Exhibitions & Awards' },
      { id:'journal',      label:'Journal / Notes' },
      { id:'photography',  label:'Photography' },
      { id:'contact',      label:'Contact' },
    ];
    if (!D.data.meta.hiddenSections) D.data.meta.hiddenSections = [];
    const hidden = D.data.meta.hiddenSections;

    openModal(`
      <h3>⚡ სექციების მართვა</h3>
      <div class="modal-note">გამორთული სექციები საიტიდანაც და ნავიგაციიდანაც გაქრება.</div>
      <div class="sections-list">
        ${SECS.map(s => `
          <div class="section-toggle-row">
            <span class="sec-toggle-label">${s.label}</span>
            <label class="sec-toggle-switch">
              <input type="checkbox" data-sec="${s.id}" ${!hidden.includes(s.id) ? 'checked' : ''}>
              <span class="sec-toggle-track"></span>
            </label>
          </div>`).join("")}
      </div>
      <div class="modal-actions" style="margin-top:14px">
        <button class="cancel" id="mCancel">გაუქმება</button>
        <button class="save" id="mSave">💾 შენახვა</button>
      </div>`);
    $("#mCancel").onclick = closeModal;
    $("#mSave").onclick = () => {
      D.data.meta.hiddenSections = [...modalBox.querySelectorAll("[data-sec]")]
        .filter(cb => !cb.checked).map(cb => cb.dataset.sec);
      D.save();
      D.applyHiddenSections();
      closeModal();
      D.toast("✓ სექციები შენახულია");
    };
  }

  /* ── Backup modal (replaces Export + Import buttons) ── */
  function openBackupModal() {
    openModal(`
      <h3>💾 Backup / Restore</h3>
      <div class="modal-note" style="margin-bottom:14px">
        <b>Export JSON</b> — ჩამოტვირთე საიტის ყველა მონაცემი (ნამუშევრები, ტექსტები, პარამეტრები) ერთ ფაილად. გამოიყენე:<br>
        • სარეზერვო ასლისთვის<br>
        • სხვა კომპიუტერზე გადასატანად<br>
        • მუდმივი ცვლილებების გამოქვეყნებისთვის (ჩაანაცვლე <b>data.js</b>-ში DEFAULT_DATA)<br><br>
        <b>Import JSON</b> — აღადგინე ადრე ექსპორტირებული ფაილიდან.
      </div>
      <div class="modal-actions" style="flex-wrap:wrap;gap:10px">
        <button class="cancel" id="mCancel">დახურვა</button>
        <button class="cancel" id="mDoImport">⬆ Import JSON</button>
        <button class="save" id="mDoExport">⬇ Export JSON</button>
      </div>`);
    $("#mCancel").onclick = closeModal;
    $("#mDoExport").onclick = () => { D.exportJSON(); closeModal(); };
    $("#mDoImport").onclick = () => { closeModal(); $("#importFile").click(); };
  }

  $("#aAddWork").onclick = addWork;
  $("#addWork2").onclick = addWork;
  $("#addExhibition").onclick = () => exModal(null);
  $("#addPost").onclick = () => postModal(null);
  const ap2 = $("#addPhoto2"); if (ap2) ap2.onclick = photoSectionModal;
  const aBg = $("#aBgFrags"); if (aBg) aBg.onclick = bgFragsModal;
  const aCover = $("#aCoverGallery"); if (aCover) aCover.onclick = coverGalleryModal;
  const aPurch = $("#aPurchases"); if (aPurch) aPurch.onclick = purchasesModal;
  const aBack = $("#aBackup"); if (aBack) aBack.onclick = openBackupModal;
  const aSec  = $("#aSections"); if (aSec) aSec.onclick = openSectionsPanel;
  $("#aLogout").onclick = exitAdmin;
  $("#aReset").onclick = () => { if (confirm("ყველა ცვლილება წაიშლება და დაბრუნდება საწყისი ვერსია. გავაგრძელო?")) D.reset(); };
  $("#importFile").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { D.importJSON(JSON.parse(await f.text())); D.toast("მონაცემები ჩაიტვირთა"); }
    catch (err) { D.toast("ფაილი არასწორია"); }
  };

  /* ===================================================================
     TEXT PANEL — edit all site text from one modal
     =================================================================== */
  function openTextPanel() {
    const f = (path, label, multiline, rows) => `
      <div class="tp-field">
        <label>${label}</label>
        ${multiline
          ? `<textarea class="tp" data-path="${path}" rows="${rows||3}">${esc(String(D.getPath(path)||""))}</textarea>`
          : `<input class="tp" data-path="${path}" value="${attr(String(D.getPath(path)||""))}">`}
      </div>`;

    openModal(`
      <h3 style="margin-bottom:14px">✎ ყველა ტექსტის რედაქტირება</h3>
      <div class="tp-sections">

        <div class="tp-section">
          <div class="tp-section-title">00 — Site / Nav / Footer</div>
          ${f("meta.navTitle","Artist name (nav + footer)")}
          ${f("meta.navSubtitle","Studio name (nav + footer)")}
          ${f("meta.city","City / location (footer)")}
        </div>

        <div class="tp-section">
          <div class="tp-section-title">01 — Hero</div>
          ${f("hero.eyebrow","Eyebrow label")}
          ${f("hero.role","Role / პოზიცია")}
          ${f("hero.statement","Statement / განცხადება",true,2)}
          ${f("hero.btnPrimary","Button — Portfolio")}
          ${f("hero.btnSecondary","Button — Contact")}
        </div>

        <div class="tp-section">
          <div class="tp-section-title">01b — Works Section</div>
          ${f("worksSection.heading","Section heading (Enter = line break)",true,2)}
          ${f("worksSection.tagline","Section tagline")}
        </div>

        <div class="tp-section">
          <div class="tp-section-title">02 — About</div>
          ${f("about.heading","Section heading")}
          ${f("about.studioNote1","Portrait note 1 (e.g. \"in the studio\")")}
          ${f("about.studioNote2","Portrait note 2 (e.g. \"↳ memory & chaos\")")}
          ${f("about.bioTitle","Bio section title")}
          ${f("about.bio","Biography",true,4)}
          ${f("about.philosophyTitle","Philosophy title")}
          ${f("about.philosophy","Philosophy",true,3)}
          ${f("about.influencesTitle","Influences title")}
          ${f("about.influences","Influences",true,3)}
          ${f("about.processTitle","Process title")}
          ${f("about.process","Process",true,3)}
        </div>

        <div class="tp-section">
          <div class="tp-section-title">03 — Studio</div>
          ${f("studio.heading","Section heading")}
          ${f("studio.intro","Intro text",true,2)}
        </div>

        <div class="tp-section">
          <div class="tp-section-title">04 — Exhibitions</div>
          ${f("exhibitions.heading","Section heading")}
        </div>

        <div class="tp-section">
          <div class="tp-section-title">05 — Journal</div>
          ${f("journal.heading","Section heading")}
          ${f("journal.intro","Intro text",true,2)}
        </div>

        <div class="tp-section">
          <div class="tp-section-title">06 — Photography</div>
          ${f("photography.heading","Section heading")}
          ${f("photography.intro","Intro text",true,2)}
        </div>

        <div class="tp-section">
          <div class="tp-section-title">07 — Contact</div>
          ${f("contact.heading","Heading",true,2)}
          ${f("contact.intro","Intro paragraph",true,2)}
          ${f("contact.email","Email")}
          ${f("contact.instagram","Instagram handle")}
          ${f("contact.behance","Behance link")}
          ${f("contact.formNote","Form label")}
        </div>

      </div>
      <div class="modal-actions" style="margin-top:14px;position:sticky;bottom:0;background:var(--paper);padding-top:8px">
        <button class="cancel" id="mCancel">Cancel</button>
        <button class="save" id="mSave">💾 შენახვა</button>
      </div>`);

    /* widen the modal for text fields */
    document.getElementById("modalBox").classList.add("modal-wide");

    $("#mCancel").onclick = closeModal;
    $("#mSave").onclick = () => {
      document.getElementById("modalBox").querySelectorAll(".tp[data-path]").forEach(el => {
        D.setPath(el.dataset.path, el.value);
      });
      D.save(); D.rerender(); D.bindStaticText(); closeModal();
      D.toast("✎ ყველა ტექსტი შენახულია");
    };
  }

  const _aTexts = $("#aTexts");
  if (_aTexts) _aTexts.onclick = openTextPanel;

  /* ---------- expose ---------- */
  window.DPAdmin = {
    wireCards, wireDetail, wireImgTransforms, wireHeroImgTransform,
    openTextPanel, openCropModal, openSectionsPanel,
    editExhibition: exModal, editPost: postModal,
    uploadImage,    /* used by app.js for photo uploads */
    _adminPassword, /* synced by enterAdmin() / exitAdmin() */
  };

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }
  function attr(s) { return String(s == null ? "" : s).replace(/"/g, "&quot;"); }

  /* ── show purchase count badge on admin bar ── */
  function updatePurchaseBadge() {
    const btn = $("#aPurchases"); if (!btn) return;
    const n = (D.data.purchaseRequests || []).filter(r => !r.read).length;
    btn.textContent = n ? `◉ შეკვეთები (${n})` : "◉ შეკვეთები";
    btn.style.borderColor = n ? "var(--red)" : "";
    btn.style.color = n ? "var(--red)" : "";
  }
  /* refresh badge whenever data changes */
  const _origSave = D.save;
  D.save = function() { _origSave(); updatePurchaseBadge(); };

  /* ---------- restore session ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    /* On session restore we don't have the password — prompt again for API sync */
    if (sessionStorage.getItem(AUTH_KEY) === "1") setTimeout(() => enterAdmin(null), 60);
    setTimeout(updatePurchaseBadge, 200);
  });
})();
