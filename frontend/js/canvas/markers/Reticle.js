export function drawReticle(ctx, screenX, screenY, { color = '#00d4ff', size = 28 } = {}, timestamp = 0) {
  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;

  // Inner ring
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
  ctx.stroke();

  // Outer rotating dashed ring
  const angle = (timestamp / 1000) * 1.5;
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.6, 0, Math.PI * 2);
  ctx.setLineDash([6, 6]);
  ctx.stroke();

  ctx.restore();
}
