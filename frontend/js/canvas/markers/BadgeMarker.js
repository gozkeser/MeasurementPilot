export function drawBadgeMarker(ctx, screenX, screenY, labelText = '', { color = '#a55eea' } = {}) {
  ctx.save();

  // Pin dot
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(screenX, screenY, 5, 0, Math.PI * 2);
  ctx.fill();

  if (labelText) {
    ctx.font = '600 12px Inter, sans-serif';
    const textWidth = ctx.measureText(labelText).width;
    const padding = 6;
    const boxW = textWidth + padding * 2;
    const boxH = 20;

    const bx = screenX + 10;
    const by = screenY - 24;

    // Background pill
    ctx.fillStyle = 'rgba(19, 23, 34, 0.9)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, 6);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(labelText, bx + padding, by + 14);
  }

  ctx.restore();
}
