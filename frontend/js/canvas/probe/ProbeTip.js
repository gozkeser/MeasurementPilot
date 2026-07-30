export function drawProbeTip(ctx, color = '#cbd5e1') {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;

  // Sharp metallic tip pointing down (0,0 is tip point)
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-3, -20);
  ctx.lineTo(3, -20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}
