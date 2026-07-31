export class Minimap {
  constructor(minimapCanvasEl, canvasEngine) {
    this.canvas = minimapCanvasEl;
    this.ctx = minimapCanvasEl.getContext('2d');
    this.engine = canvasEngine;

    this.bindEvents();
    this.startLoop();
  }

  bindEvents() {
    this.canvas.addEventListener('click', (e) => {
      if (!this.engine.img) return;

      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // Map click to unscaled image pixel coords
      const scaleX = this.canvas.width / this.engine.img.width;
      const scaleY = this.canvas.height / this.engine.img.height;
      const miniScale = Math.min(scaleX, scaleY);

      const imgOffsetX = (this.canvas.width - this.engine.img.width * miniScale) / 2;
      const imgOffsetY = (this.canvas.height - this.engine.img.height * miniScale) / 2;

      const cx = (clickX - imgOffsetX) / miniScale;
      const cy = (clickY - imgOffsetY) / miniScale;

      this.engine.flyTo(cx, cy, this.engine.scale, 500);
    });
  }

  _updateCanvasSize() {
    if (!this.engine.img) return;
    const ar = this.engine.img.width / this.engine.img.height;
    const maxW = 220;
    const maxH = 140;
    let newW, newH;
    if (ar > maxW / maxH) {
      newW = maxW;
      newH = Math.round(maxW / ar);
    } else {
      newH = maxH;
      newW = Math.round(maxH * ar);
    }
    // Only update if changed to avoid thrashing
    if (this.canvas.width !== newW || this.canvas.height !== newH) {
      this.canvas.width  = newW;
      this.canvas.height = newH;
    }
  }

  startLoop() {
    const render = () => {
      if (this.engine.img) {
        this._updateCanvasSize();
      }

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      if (this.engine.offscreenCanvas && this.engine.img) {
        const scaleX = this.canvas.width / this.engine.img.width;
        const scaleY = this.canvas.height / this.engine.img.height;
        const miniScale = Math.min(scaleX, scaleY);

        const imgOffsetX = (this.canvas.width - this.engine.img.width * miniScale) / 2;
        const imgOffsetY = (this.canvas.height - this.engine.img.height * miniScale) / 2;

        this.ctx.drawImage(
          this.engine.offscreenCanvas,
          imgOffsetX, imgOffsetY,
          this.engine.img.width * miniScale,
          this.engine.img.height * miniScale
        );

        // Draw Viewport Rect — direct transform without getBoundingClientRect (more accurate)
        const cStartCx = (0                          - this.engine.viewportX) / this.engine.scale;
        const cStartCy = (0                          - this.engine.viewportY) / this.engine.scale;
        const cEndCx   = (this.engine.canvas.width   - this.engine.viewportX) / this.engine.scale;
        const cEndCy   = (this.engine.canvas.height  - this.engine.viewportY) / this.engine.scale;

        const rx = imgOffsetX + cStartCx * miniScale;
        const ry = imgOffsetY + cStartCy * miniScale;
        const rw = (cEndCx - cStartCx) * miniScale;
        const rh = (cEndCy - cStartCy) * miniScale;

        this.ctx.strokeStyle = '#00d4ff';
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = 'rgba(0, 212, 255, 0.15)';
        this.ctx.beginPath();
        this.ctx.rect(rx, ry, rw, rh);
        this.ctx.fill();
        this.ctx.stroke();
      }

      requestAnimationFrame(render);
    };

    requestAnimationFrame(render);
  }
}
