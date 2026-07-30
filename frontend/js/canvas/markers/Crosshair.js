export function drawCrosshair(ctx, screenX, screenY, { color = '#00d4ff', size = 24, gap = 6, thickness = 2 } = {}) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;

  const half = size / 2;

  ctx.beginPath();
  // Top
  ctx.moveTo(screenX, screenY - half);
  ctx.lineTo(screenX, screenY - gap);
  // Bottom
  ctx.moveTo(screenX, screenY + gap);
  ctx.lineTo(screenX, screenY + half);
  // Left
  ctx.moveTo(screenX - half, screenY);
  ctx.lineTo(screenX - gap, screenY);
  // Right
  ctx.moveTo(screenX + gap, screenY);
  ctx.lineTo(screenX + half, screenY);
  ctx.stroke();

  ctx.restore();
}
