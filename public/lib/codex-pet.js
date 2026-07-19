/*!
 * CodexPet Embed SDK
 * 在任意网页中挂载 Codex 桌面宠物。
 *
 * 用法见同目录 example.html
 */
(function (global) {
  "use strict";

  const DEFAULT_ATLAS = {
    columns: 8,
    rows: 9,
    cell_width: 192,
    cell_height: 208,
    width: 1536,
    height: 1872,
  };

  const DEFAULT_ROWS = [
    { state: "idle", row: 0, frames: 6, purpose: "idle" },
    { state: "running-right", row: 1, frames: 8, purpose: "run right" },
    { state: "running-left", row: 2, frames: 8, purpose: "run left" },
    { state: "waving", row: 3, frames: 4, purpose: "wave" },
    { state: "jumping", row: 4, frames: 5, purpose: "jump" },
    { state: "failed", row: 5, frames: 8, purpose: "failed" },
    { state: "waiting", row: 6, frames: 6, purpose: "waiting" },
    { state: "running", row: 7, frames: 6, purpose: "working" },
    { state: "review", row: 8, frames: 6, purpose: "review" },
  ];

  const DEFAULTS = {
    /**
     * 推荐：分两个路径分别配置
     * petJson     — pet.json 的 URL/路径，或已解析的对象
     * spritesheet — spritesheet.webp 的 URL/路径
     *
     * 兼容：src 为宠物目录，会自动拼 pet.json + spritesheet.webp
     */
    petJson: "../firefly/pet.json",
    spritesheet: "../firefly/spritesheet.json",
    /** 可选：宠物目录 URL（未单独配置上面两项时使用） */
    src: "",
    /** 初始动画状态 */
    state: "idle",
    /** 显示倍率：1 = 原始单元格大小（192×208），0.5 = 一半，2 = 两倍 */
    scale: 1,
    /** 毫秒/帧 */
    speed: 100,
    /**
     * 定位：
     * - 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center'
     * - 或 { x, y } 像素（相对 mount 容器 / fixed 视口）
     */
    position: "bottom-right",
    /** fixed 浮在整页 / absolute 在容器内 */
    mode: "fixed",
    /** 是否可拖拽 */
    draggable: true,
    /** 单击循环切换动画 */
    clickCycle: true,
    /** 拖动时自动切换左右跑 */
    dragAnim: true,
    /** 松手后回到的状态（null 表示保持） */
    releaseState: "idle",
    /** 层级 */
    zIndex: 2147483000,
    /** 边距（角落定位时） */
    margin: 16,
    /** 是否显示；false 可先 mount 再 show */
    visible: true,
    /** 暂停 */
    paused: false,
    /** 镜像（部分宠物面朝可翻转） */
    flip: false,
    /** 加载失败回调 */
    onError: null,
    /** 就绪回调 (instance) */
    onReady: null,
    /** 状态变化回调 (stateName) */
    onStateChange: null,
  };

  function joinUrl(base, path) {
    if (!base) return path || "";
    if (!path) return base;
    if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
    const b = String(base).replace(/\/?$/, "/");
    return b + String(path).replace(/^\//, "");
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // 远程图需要 CORS 才能画到 canvas；同域 / 已配置 CORS 的 CDN 可正常工作
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load spritesheet: " + url));
      img.src = url;
    });
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: "no-store", mode: "cors" });
    if (!res.ok) throw new Error("Failed to load pet.json: " + url + " (" + res.status + ")");
    return res.json();
  }

  function normalizeConfig(json) {
    const atlas = { ...DEFAULT_ATLAS, ...(json && json.atlas ? json.atlas : {}) };
    let rows = DEFAULT_ROWS.map((r) => ({ ...r }));
    if (json && Array.isArray(json.rows) && json.rows.length) {
      rows = json.rows.map((r) => ({
        state: r.state,
        row: Number(r.row),
        frames: Number(r.frames),
        purpose: r.purpose || "",
      }));
    }
    return {
      id: (json && (json.id || json.pet_id || json.name)) || "",
      displayName: (json && (json.displayName || json.display_name)) || "",
      description: (json && json.description) || "",
      spritesheetPath: (json && json.spritesheetPath) || "spritesheet.webp",
      atlas,
      rows,
    };
  }

  function parseDataAttrs(el) {
    const d = el.dataset || {};
    const out = {};
    if (d.src != null) out.src = d.src;
    if (d.spritesheet != null) out.spritesheet = d.spritesheet;
    if (d.petJson != null) out.petJson = d.petJson;
    if (d.state != null) out.state = d.state;
    if (d.scale != null) out.scale = Number(d.scale);
    if (d.speed != null) out.speed = Number(d.speed);
    if (d.position != null) {
      try {
        out.position = JSON.parse(d.position);
      } catch {
        out.position = d.position;
      }
    }
    if (d.mode != null) out.mode = d.mode;
    if (d.draggable != null) out.draggable = d.draggable !== "false";
    if (d.clickCycle != null) out.clickCycle = d.clickCycle !== "false";
    if (d.dragAnim != null) out.dragAnim = d.dragAnim !== "false";
    if (d.releaseState != null) {
      out.releaseState = d.releaseState === "null" ? null : d.releaseState;
    }
    if (d.zIndex != null) out.zIndex = Number(d.zIndex);
    if (d.margin != null) out.margin = Number(d.margin);
    if (d.visible != null) out.visible = d.visible !== "false";
    if (d.paused != null) out.paused = d.paused === "true";
    if (d.flip != null) out.flip = d.flip === "true";
    return out;
  }

  const HOST_CSS = `
    :host, .cp-root {
      all: initial;
      font-family: system-ui, sans-serif;
    }
    .cp-root {
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }
    .cp-root[data-mode="fixed"] {
      position: fixed;
      inset: 0;
      width: auto;
      height: auto;
      z-index: var(--cp-z, 2147483000);
    }
    .cp-root[data-mode="absolute"] {
      position: absolute;
      inset: 0;
      z-index: var(--cp-z, 10);
    }
    .cp-root[data-mode="inline"] {
      position: relative;
      inset: auto;
      width: max-content;
      height: max-content;
      pointer-events: none;
    }
    .cp-pet {
      position: absolute;
      left: 0;
      top: 0;
      cursor: grab;
      pointer-events: auto;
      user-select: none;
      touch-action: none;
      line-height: 0;
      /** filter: drop-shadow(0 12px 14px rgba(0,0,0,.28));*/
      transform-origin: top left;
      will-change: left, top;
    }
    .cp-root[data-mode="inline"] .cp-pet {
      position: relative;
      left: 0 !important;
      top: 0 !important;
    }
    .cp-pet.dragging {
      cursor: grabbing;
      /** filter: drop-shadow(0 18px 18px rgba(0,0,0,.4)); */
    }
    .cp-pet canvas {
      display: block;
      /* 宽高由 JS 按 scale 直接写入，避免 calc(var*var) 兼容问题 */
      transform: scaleX(var(--cp-flip, 1));
    }
    .cp-pet[hidden] {
      display: none !important;
    }
    .cp-error {
      pointer-events: auto;
      position: absolute;
      right: 12px;
      bottom: 12px;
      max-width: 280px;
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(20,20,24,.92);
      color: #ffb4b4;
      font-size: 12px;
      line-height: 1.4;
      box-shadow: 0 8px 24px rgba(0,0,0,.35);
    }
  `;

  class CodexPetInstance {
    constructor(mountEl, options) {
      this.mountEl = mountEl;
      this.options = { ...DEFAULTS, ...options };
      this._atlas = { ...DEFAULT_ATLAS };
      this._rows = DEFAULT_ROWS.map((r) => ({ ...r }));
      this._image = null;
      this._animState = this.options.state || "idle";
      this._frame = 0;
      this._lastTick = 0;
      this._raf = 0;
      this._pos = null; // {x,y} 相对 root
      this._drag = null;
      this._meta = {};
      this._destroyed = false;
      this._ready = false;

      this._buildDom();
      this._bindEvents();
      this._applyChrome();
      this._boot();
    }

    _buildDom() {
      // 使用 open shadow，便于调试；样式完全隔离
      const host = document.createElement("div");
      host.className = "codex-pet-host";
      host.setAttribute("data-codex-pet-host", "");
      // mount 容器若是 static，absolute 模式需要 relative
      const cs = global.getComputedStyle(this.mountEl);
      if (cs.position === "static" && this.options.mode !== "fixed") {
        this.mountEl.style.position = "relative";
      }
      this.mountEl.appendChild(host);
      this.host = host;

      this.shadow = host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = HOST_CSS;
      this.root = document.createElement("div");
      this.root.className = "cp-root";
      this.petEl = document.createElement("div");
      this.petEl.className = "cp-pet";
      this.petEl.setAttribute("role", "img");
      this.petEl.setAttribute("aria-label", "Codex pet");
      this.canvas = document.createElement("canvas");
      this.canvas.width = DEFAULT_ATLAS.cell_width;
      this.canvas.height = DEFAULT_ATLAS.cell_height;
      this.ctx = this.canvas.getContext("2d");
      this.petEl.appendChild(this.canvas);
      this.root.appendChild(this.petEl);
      this.shadow.appendChild(style);
      this.shadow.appendChild(this.root);
    }

    _applyChrome() {
      const o = this.options;
      this.root.dataset.mode = o.mode || "fixed";
      this.root.style.setProperty("--cp-z", String(o.zIndex));
      this.root.style.setProperty("--cp-flip", o.flip ? "-1" : "1");
      this.petEl.hidden = !o.visible;
      this._applyScale();
      this._placeInitial();
    }

    /** 按 scale 把显示尺寸写到 canvas 上（比 CSS calc 可靠） */
    _applyScale() {
      const scale = Number(this.options.scale);
      const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
      this.options.scale = s;
      const w = this._atlas.cell_width * s;
      const h = this._atlas.cell_height * s;
      this.canvas.style.width = w + "px";
      this.canvas.style.height = h + "px";
      return s;
    }

    _placeInitial() {
      if (this.options.mode === "inline") {
        this._pos = { x: 0, y: 0 };
        this._applyPos();
        return;
      }
      const pos = this.options.position;
      if (pos && typeof pos === "object" && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
        this._pos = { x: pos.x, y: pos.y };
        this._applyPos();
        return;
      }
      // 等一帧拿到尺寸
      requestAnimationFrame(() => this._placeCorner(String(pos || "bottom-right")));
    }

    _placeCorner(corner) {
      const rw = this.root.clientWidth || global.innerWidth;
      const rh = this.root.clientHeight || global.innerHeight;
      const w = this.petEl.offsetWidth || this._atlas.cell_width * this.options.scale;
      const h = this.petEl.offsetHeight || this._atlas.cell_height * this.options.scale;
      const m = Number(this.options.margin) || 0;
      let x = m;
      let y = m;
      switch (corner) {
        case "top-left":
          x = m;
          y = m;
          break;
        case "top-right":
          x = Math.max(m, rw - w - m);
          y = m;
          break;
        case "bottom-left":
          x = m;
          y = Math.max(m, rh - h - m);
          break;
        case "center":
          x = Math.max(0, (rw - w) / 2);
          y = Math.max(0, (rh - h) / 2);
          break;
        case "bottom-right":
        default:
          x = Math.max(m, rw - w - m);
          y = Math.max(m, rh - h - m);
          break;
      }
      this._pos = { x, y };
      this._applyPos();
    }

    _applyPos() {
      if (!this._pos) return;
      this.petEl.style.left = this._pos.x + "px";
      this.petEl.style.top = this._pos.y + "px";
    }

    _bindEvents() {
      this._onPointerDown = (e) => {
        if (!this.options.draggable) return;
        if (e.button != null && e.button !== 0) return;
        if (this.options.mode === "inline") return;
        const rootRect = this.root.getBoundingClientRect();
        const petRect = this.petEl.getBoundingClientRect();
        this._drag = {
          offsetX: e.clientX - petRect.left,
          offsetY: e.clientY - petRect.top,
          startX: e.clientX,
          startY: e.clientY,
          moved: false,
          lastX: e.clientX,
        };
        this._pos = {
          x: petRect.left - rootRect.left,
          y: petRect.top - rootRect.top,
        };
        this._applyPos();
        this.petEl.classList.add("dragging");
        try {
          this.petEl.setPointerCapture(e.pointerId);
        } catch (_) {}
        e.preventDefault();
      };

      this._onPointerMove = (e) => {
        if (!this._drag) return;
        const dx = e.clientX - this._drag.startX;
        const dy = e.clientY - this._drag.startY;
        if (Math.hypot(dx, dy) > 4) this._drag.moved = true;

        const rootRect = this.root.getBoundingClientRect();
        const w = this.petEl.offsetWidth;
        const h = this.petEl.offsetHeight;
        let x = e.clientX - rootRect.left - this._drag.offsetX;
        let y = e.clientY - rootRect.top - this._drag.offsetY;
        x = Math.min(Math.max(0, x), Math.max(0, rootRect.width - w));
        y = Math.min(Math.max(0, y), Math.max(0, rootRect.height - h));
        this._pos = { x, y };
        this._applyPos();

        if (this.options.dragAnim) {
          const step = e.clientX - this._drag.lastX;
          this._drag.lastX = e.clientX;
          if (Math.abs(step) > 1) {
            const want = step > 0 ? "running-right" : "running-left";
            if (this._rows.some((r) => r.state === want)) this.setState(want, { silentFrameReset: false });
          }
        }
      };

      this._onPointerUp = (e) => {
        if (!this._drag) return;
        const moved = this._drag.moved;
        this._drag = null;
        this.petEl.classList.remove("dragging");
        try {
          this.petEl.releasePointerCapture(e.pointerId);
        } catch (_) {}

        if (!moved && this.options.clickCycle) {
          this.nextState();
        } else if (moved && this.options.releaseState) {
          this.setState(this.options.releaseState);
        }
      };

      this.petEl.addEventListener("pointerdown", this._onPointerDown);
      global.addEventListener("pointermove", this._onPointerMove);
      global.addEventListener("pointerup", this._onPointerUp);
      global.addEventListener("pointercancel", this._onPointerUp);

      this._onResize = () => {
        // fixed 模式下窗口变化不强制复位，保持用户拖动位置
      };
      global.addEventListener("resize", this._onResize);
    }

    async _boot() {
      try {
        await this._loadAssets();
        this._ready = true;
        if (typeof this.options.onReady === "function") this.options.onReady(this);
        this._lastTick = 0;
        this._raf = requestAnimationFrame((t) => this._tick(t));
      } catch (err) {
        this._showError(err);
        if (typeof this.options.onError === "function") this.options.onError(err, this);
      }
    }

    async _loadAssets() {
      const o = this.options;
      let json = null;

      // 1) pet.json：优先独立路径 petJson，其次目录 src/pet.json
      if (o.petJson && typeof o.petJson === "object") {
        json = o.petJson;
      } else if (o.petJson && typeof o.petJson === "string" && o.petJson) {
        json = await fetchJson(o.petJson);
      } else if (o.src) {
        try {
          json = await fetchJson(joinUrl(o.src, "pet.json"));
        } catch {
          json = null; // 允许只有雪碧图 + 默认 atlas
        }
      }

      const cfg = normalizeConfig(json);
      this._atlas = cfg.atlas;
      this._rows = cfg.rows;
      this._meta = cfg;

      if (!this._rows.some((r) => r.state === this._animState)) {
        this._animState = this._rows[0] ? this._rows[0].state : "idle";
      }

      // 2) 雪碧图：优先独立路径 spritesheet，其次目录 src/spritesheet.webp
      let sheetUrl = o.spritesheet;
      if (!sheetUrl) {
        if (!o.src) {
          throw new Error(
            "请分别配置 petJson + spritesheet 两个路径，或配置 src 目录"
          );
        }
        sheetUrl = joinUrl(o.src, cfg.spritesheetPath || "spritesheet.webp");
      }

      this._image = await loadImage(sheetUrl);
      this.canvas.width = this._atlas.cell_width;
      this.canvas.height = this._atlas.cell_height;
      this._applyScale();
      this.petEl.setAttribute(
        "aria-label",
        cfg.displayName || cfg.id || "Codex pet"
      );
      this._draw();
      // 资源就绪后按角落再放一次（尺寸已准）
      if (typeof this.options.position === "string" && this.options.mode !== "inline") {
        this._placeCorner(this.options.position);
      }
    }

    _currentRow() {
      return (
        this._rows.find((r) => r.state === this._animState) ||
        this._rows[0] ||
        DEFAULT_ROWS[0]
      );
    }

    _draw() {
      if (!this._image || !this.ctx) return;
      const cw = this._atlas.cell_width;
      const ch = this._atlas.cell_height;
      const row = this._currentRow();
      const frames = Math.max(1, row.frames | 0);
      const sx = (this._frame % frames) * cw;
      const sy = (row.row | 0) * ch;
      this.ctx.clearRect(0, 0, cw, ch);
      try {
        this.ctx.drawImage(this._image, sx, sy, cw, ch, 0, 0, cw, ch);
      } catch (err) {
        // 跨域未 CORS 时 canvas 会 tainted；给出提示
        this._showError(
          new Error(
            "无法绘制雪碧图（多为跨域 CORS）。请把图片放到同域，或在 CDN 开启 Access-Control-Allow-Origin。"
          )
        );
        cancelAnimationFrame(this._raf);
      }
    }

    _tick(now) {
      if (this._destroyed) return;
      this._raf = requestAnimationFrame((t) => this._tick(t));
      if (this.options.paused || !this._image) {
        this._draw();
        return;
      }
      if (!this._lastTick) this._lastTick = now;
      const frameMs = Math.max(16, Number(this.options.speed) || 100);
      const elapsed = now - this._lastTick;
      if (elapsed >= frameMs) {
        const steps = Math.floor(elapsed / frameMs);
        this._lastTick += steps * frameMs;
        const row = this._currentRow();
        const frames = Math.max(1, row.frames | 0);
        this._frame = (this._frame + steps) % frames;
      }
      this._draw();
    }

    _showError(err) {
      const msg = (err && err.message) || String(err);
      console.error("[CodexPet]", msg);
      let box = this.shadow.querySelector(".cp-error");
      if (!box) {
        box = document.createElement("div");
        box.className = "cp-error";
        this.root.appendChild(box);
      }
      box.textContent = msg;
    }

    // ---------- Public API ----------

    setState(name, opts) {
      if (!name || name === this._animState) {
        if (!opts || !opts.silentFrameReset) {
          /* keep */
        }
        return this;
      }
      if (!this._rows.some((r) => r.state === name)) {
        console.warn("[CodexPet] unknown state:", name);
        return this;
      }
      this._animState = name;
      this._frame = 0;
      this._lastTick = 0;
      if (typeof this.options.onStateChange === "function") {
        this.options.onStateChange(name, this);
      }
      return this;
    }

    getState() {
      return this._animState;
    }

    listStates() {
      return this._rows.map((r) => r.state);
    }

    nextState() {
      if (!this._rows.length) return this;
      const i = this._rows.findIndex((r) => r.state === this._animState);
      const n = this._rows[(i + 1) % this._rows.length];
      return this.setState(n.state);
    }

    setScale(n) {
      this.options.scale = Number(n) || 1;
      this._applyScale();
      // 角落定位时按新尺寸重算，避免缩小后仍贴着旧边界
      if (typeof this.options.position === "string" && this.options.mode !== "inline" && !this._drag) {
        this._placeCorner(this.options.position);
      }
      return this;
    }

    setSpeed(ms) {
      this.options.speed = Math.max(16, Number(ms) || 100);
      return this;
    }

    pause() {
      this.options.paused = true;
      return this;
    }

    resume() {
      this.options.paused = false;
      this._lastTick = 0;
      return this;
    }

    show() {
      this.options.visible = true;
      this.petEl.hidden = false;
      return this;
    }

    hide() {
      this.options.visible = false;
      this.petEl.hidden = true;
      return this;
    }

    setPosition(x, y) {
      if (typeof x === "string") {
        this.options.position = x;
        this._placeCorner(x);
        return this;
      }
      this._pos = { x: Number(x) || 0, y: Number(y) || 0 };
      this.options.position = { ...this._pos };
      this._applyPos();
      return this;
    }

    getPosition() {
      return this._pos ? { ...this._pos } : null;
    }

    getMeta() {
      return { ...this._meta };
    }

    /** 热切换资源：可传 { src } / { spritesheet, petJson } */
    async load(next) {
      Object.assign(this.options, next || {});
      const box = this.shadow.querySelector(".cp-error");
      if (box) box.remove();
      await this._loadAssets();
      return this;
    }

    destroy() {
      this._destroyed = true;
      cancelAnimationFrame(this._raf);
      this.petEl.removeEventListener("pointerdown", this._onPointerDown);
      global.removeEventListener("pointermove", this._onPointerMove);
      global.removeEventListener("pointerup", this._onPointerUp);
      global.removeEventListener("pointercancel", this._onPointerUp);
      global.removeEventListener("resize", this._onResize);
      if (this.host && this.host.parentNode) this.host.parentNode.removeChild(this.host);
      this._image = null;
    }
  }

  function resolveMount(target) {
    if (!target) return document.body;
    if (typeof target === "string") {
      const el = document.querySelector(target);
      if (!el) throw new Error("CodexPet.mount: 找不到元素 " + target);
      return el;
    }
    if (target.nodeType === 1) return target;
    throw new Error("CodexPet.mount: target 必须是选择器或元素");
  }

  function mount(target, options) {
    const el = resolveMount(target);
    const fromData = el.hasAttribute("data-codex-pet") ? parseDataAttrs(el) : {};
    const opts = { ...fromData, ...(options || {}) };
    return new CodexPetInstance(el, opts);
  }

  /** 扫描页面上所有 [data-codex-pet] 并自动挂载 */
  function autoMount(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const nodes = scope.querySelectorAll("[data-codex-pet]");
    const instances = [];
    nodes.forEach((el) => {
      if (el.__codexPet) return;
      const inst = mount(el, parseDataAttrs(el));
      el.__codexPet = inst;
      instances.push(inst);
    });
    return instances;
  }

  const API = {
    version: "1.0.0",
    mount,
    autoMount,
    defaults: { ...DEFAULTS },
    defaultRows: DEFAULT_ROWS.map((r) => ({ ...r })),
  };

  global.CodexPet = API;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => autoMount());
  } else {
    autoMount();
  }
})(typeof window !== "undefined" ? window : globalThis);
