export function drawCable(ctx, P0, P3, color = '#ff4757', sagFactor = 0.35) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;

  const distY = Math.abs(P3.y - P0.y);
  const sagY = Math.max(80, distY * sagFactor);

  const P1 = { x: P0.x + (P3.x - P0.x) * 0.25, y: P0.y - sagY };
  const P2 = { x: P0.x + (P3.x - P0.x) * 0.75, y: P3.y + sagY };

  ctx.beginPath();
  ctx.moveTo(P0.x, P0.y);
  ctx.bezierCurveTo(P1.x, P1.y, P2.x, P2.y, P3.x, P3.y);
  ctx.stroke();

  ctx.restore();
}
