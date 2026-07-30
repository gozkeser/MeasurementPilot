export function drawFlash(ctx, screenX, screenY, { color = '#ff4757', size = 20 } = {}, timestamp = 0) {
  ctx.save();
  const opacity = 0.3 + 0.7 * Math.abs(Math.sin((timestamp / 1000) * 4));

  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;

  ctx.beginPath();
  ctx.arc(screenX, screenY, size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
