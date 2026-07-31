import { easing } from '../utils/easing.js';

export class CanvasEngine {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');

    this.viewportX = 0; // pan offset X in canvas space
    this.viewportY = 0; // pan offset Y in canvas space
    this.scale = 1.0;

    this.img = null;
    this.offscreenCanvas = null;

    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.viewportStart = { x: 0, y: 0 };

    this.overlays = new Map();
    this.animatingFlyTo = null;

    this.onHoverCallback = null;
    this.onClickCallback = null;

    this.bindEvents();
    this.startLoop();
  }

  initImage(imgUrl, onLoaded) {
    const img = new Image();
    img.onload = () => {
      this.img = img;

      // Pre-render into OffscreenCanvas for ultra-fast drawing
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = img.width;
      this.offscreenCanvas.height = img.height;
      const offCtx = this.offscreenCanvas.getContext('2d');
      offCtx.drawImage(img, 0, 0);

      this.resetView();
      if (onLoaded) onLoaded(img.width, img.height);
    };
    img.src = imgUrl;
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  resetView() {
    this.resize();
    if (!this.img) return;

    const scaleX = this.canvas.width / this.img.width;
    const scaleY = this.canvas.height / this.img.height;
    this.scale = Math.min(scaleX, scaleY) * 0.95;

    this.viewportX = (this.canvas.width - this.img.width * this.scale) / 2;
    this.viewportY = (this.canvas.height - this.img.height * this.scale) / 2;
  }

  screenToCanvas(sx, sy) {
    const rect = this.canvas.getBoundingClientRect();
    const x = sx - rect.left;
    const y = sy - rect.top;
    // Map to unscaled image pixel coords
    const cx = (x - this.viewportX) / this.scale;
    const cy = (y - this.viewportY) / this.scale;
    return { cx, cy };
  }

  canvasToScreen(cx, cy) {
    const sx = cx * this.scale + this.viewportX;
    const sy = cy * this.scale + this.viewportY;
    return { sx, sy };
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('pointerdown', (e) => {
      const isCTPRightDrag = e.button === 2 && window._appMode === 'ctp';
      if (e.button !== 0 && !isCTPRightDrag) return;
      this.isDragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.viewportStart = { x: this.viewportX, y: this.viewportY };
      this.canvas.style.cursor = 'grabbing';
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      if (window._appMode === 'ctp') e.preventDefault();
    });

    window.addEventListener('pointermove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        this.viewportX = this.viewportStart.x + dx;
        this.viewportY = this.viewportStart.y + dy;
      }

      const { cx, cy } = this.screenToCanvas(e.clientX, e.clientY);
      if (this.onHoverCallback) {
        this.onHoverCallback(cx, cy);
      }
    });

    window.addEventListener('pointerup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.canvas.style.cursor = 'default';
      }
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      const mouse = this.screenToCanvas(e.clientX, e.clientY);

      const newScale = Math.max(0.1, Math.min(20.0, this.scale * zoomFactor));

      // Zoom towards mouse cursor
      this.viewportX = (e.clientX - this.canvas.getBoundingClientRect().left) - mouse.cx * newScale;
      this.viewportY = (e.clientY - this.canvas.getBoundingClientRect().top) - mouse.cy * newScale;
      this.scale = newScale;
    }, { passive: false });

    this.canvas.addEventListener('click', (e) => {
      const { cx, cy } = this.screenToCanvas(e.clientX, e.clientY);
      if (this.onClickCallback) {
        this.onClickCallback(cx, cy, e);
      }
    });
  }

  registerOverlay(id, renderFn) {
    this.overlays.set(id, renderFn);
  }

  unregisterOverlay(id) {
    this.overlays.delete(id);
  }

  clearOverlays() {
    this.overlays.clear();
  }

  flyTo(targetCx, targetCy, targetScale = 2.5, durationMs = 800, easingName = 'easeInOut', onComplete = null) {
    this.resize();
    const startX = this.viewportX;
    const startY = this.viewportY;
    const startScale = this.scale;

    const endViewportX = (this.canvas.width / 2) - targetCx * targetScale;
    const endViewportY = (this.canvas.height / 2) - targetCy * targetScale;

    const startTime = performance.now();
    const easeFn = easing[easingName] || easing.easeInOut;

    this.animatingFlyTo = {
      update: (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(1.0, elapsed / durationMs);
        const t = easeFn(progress);

        this.scale = startScale + (targetScale - startScale) * t;
        this.viewportX = startX + (endViewportX - startX) * t;
        this.viewportY = startY + (endViewportY - startY) * t;

        if (progress >= 1.0) {
          this.animatingFlyTo = null;
          if (onComplete) onComplete();
        }
      }
    };
  }

  startLoop() {
    const render = (timestamp) => {
      if (this.animatingFlyTo) {
        this.animatingFlyTo.update(timestamp);
      }

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      if (this.offscreenCanvas) {
        this.ctx.save();
        this.ctx.translate(this.viewportX, this.viewportY);
        this.ctx.scale(this.scale, this.scale);
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
        this.ctx.restore();
      }

      // Render registered overlays
      this.overlays.forEach((fn) => fn(this.ctx, this, timestamp));

      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
  }
}
