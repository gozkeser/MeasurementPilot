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

  startLoop() {
    const render = () => {
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

        // Draw Viewport Rect
        const vpScreenStart = { x: 0, y: 0 };
        const vpScreenEnd = { x: this.engine.canvas.width, y: this.engine.canvas.height };

        const cStart = this.engine.screenToCanvas(vpScreenStart.x, vpScreenStart.y);
        const cEnd = this.engine.screenToCanvas(vpScreenEnd.x, vpScreenEnd.y);

        const rx = imgOffsetX + cStart.cx * miniScale;
        const ry = imgOffsetY + cStart.cy * miniScale;
        const rw = (cEnd.cx - cStart.cx) * miniScale;
        const rh = (cEnd.cy - cStart.cy) * miniScale;

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
