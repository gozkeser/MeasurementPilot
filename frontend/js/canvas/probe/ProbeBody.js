export function drawProbeBody(ctx, color = '#ff4757', length = 80, width = 14) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 1.5;

  const halfW = width / 2;

  // Main cylindrical body (starts at y = -20 from tip)
  ctx.beginPath();
  ctx.roundRect(-halfW, -20 - length, width, length, 4);
  ctx.fill();
  ctx.stroke();

  // Rubber grip ribs
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2;
  for (let y = -35; y > -20 - length + 15; y -= 8) {
    ctx.beginPath();
    ctx.moveTo(-halfW + 2, y);
    ctx.lineTo(halfW - 2, y);
    ctx.stroke();
  }

  ctx.restore();
}
