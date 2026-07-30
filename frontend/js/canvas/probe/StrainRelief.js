export function drawStrainRelief(ctx, bodyTopY = -100, color = '#1e293b') {
  ctx.save();
  ctx.fillStyle = color;

  // Flexible rubber boot at top of probe body
  ctx.beginPath();
  ctx.moveTo(-6, bodyTopY);
  ctx.lineTo(6, bodyTopY);
  ctx.lineTo(3, bodyTopY - 18);
  ctx.lineTo(-3, bodyTopY - 18);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
