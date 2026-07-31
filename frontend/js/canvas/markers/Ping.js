export function drawPing(ctx, screenX, screenY, { color = '#ff9f1a', size = 30, line_width = 2, lineWidth = 2 } = {}, timestamp = 0) {
  ctx.save();
  ctx.strokeStyle = color;

  const cycle = (timestamp % 1500) / 1500; // 0..1
  const radius = (size / 2) * cycle;
  const alpha = 1.0 - cycle;

  ctx.lineWidth = line_width || lineWidth || 2;
  ctx.globalAlpha = alpha;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;

  ctx.beginPath();
  ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Solid center dot
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
