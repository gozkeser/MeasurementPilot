export function drawProbeAssembly(ctx, screenX, screenY, role = 'positive', config = {}, canvasWidth = 800, opacity = 1.0) {
  if (opacity <= 0.01) return;
  const isPos = role === 'positive';

  // Probe'un ekrandaki konumuna göre yönü belirlenir:
  // Sol yarıda → gövde ve kablo sol-üste uzanır, iğne ucu SAĞ-ALTA bakar
  // Sağ yarıda → gövde ve kablo sağ-üste uzanır, iğne ucu SOL-ALTA bakar
  const isOnLeftSide = screenX < canvasWidth / 2;

  const colorHex       = isPos ? (config.positive_color || '#dc2626') : (config.negative_color || '#000000');
  const handleGradStart = isPos ? '#f87171' : '#4a4a4a';
  const handleGradMid  = isPos ? '#dc2626' : '#1a1a1a';
  const handleGradDark = isPos ? '#991b1b' : '#000000';

  const tiltDeg = config.probe_angle || 40;
  // Sol taraf: angleDeg = -140° (gövde sol-üste, tip sağ-alta). Sağ taraf: angleDeg = -40° (gövde sağ-üste, tip sol-alta).
  const angleDeg = isOnLeftSide ? -(180 - tiltDeg) : -tiltDeg;
  const angleRad = (angleDeg * Math.PI) / 180;

  ctx.save();
  ctx.globalAlpha = opacity;
  // Origin centered exactly at metal needle tip (screenX, screenY)
  ctx.translate(screenX, screenY);
  ctx.rotate(angleRad);

  // 1. Sharp Metal Needle Tip (Hotspot at 0,0) pointing downward into target
  const tipGrad = ctx.createLinearGradient(0, -3, 35, 3);
  tipGrad.addColorStop(0, '#ffffff');
  tipGrad.addColorStop(0.3, '#e2e8f0');
  tipGrad.addColorStop(0.7, '#64748b');
  tipGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = tipGrad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(35, -3.5);
  ctx.lineTo(35, 3.5);
  ctx.closePath();
  ctx.fill();

  // Metallic Specular Highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.lineTo(33, -1.8);
  ctx.stroke();

  // 2. Front Plastic Shaft Collar
  ctx.fillStyle = handleGradDark;
  ctx.beginPath();
  ctx.roundRect(35, -5.5, 15, 11, 2);
  ctx.fill();

  // 3. Colored Plastic Handle
  const handleGrad = ctx.createLinearGradient(50, -10, 50, 10);
  handleGrad.addColorStop(0, handleGradStart);
  handleGrad.addColorStop(0.4, handleGradMid);
  handleGrad.addColorStop(0.8, handleGradDark);
  handleGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = handleGrad;
  ctx.beginPath();
  ctx.roundRect(50, -9, 110, 18, 4);
  ctx.fill();

  // Anti-slip Finger Grips
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  for (let x = 65; x <= 120; x += 7) {
    ctx.fillRect(x, -8.5, 3, 17);
  }

  // Probe Markings
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = 'bold 8px Inter, sans-serif';
  ctx.fillText('CAT IV 1000V', 65, 3);
  ctx.restore();

  // 4. Rear Strain Relief Rubber Sleeve
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(160, -8);
  ctx.lineTo(190, -4);
  ctx.lineTo(190, 4);
  ctx.lineTo(160, 8);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  for (let sx = 168; sx <= 184; sx += 5) {
    ctx.beginPath();
    ctx.moveTo(sx, -6);
    ctx.lineTo(sx, 6);
    ctx.stroke();
  }

  ctx.restore();

  // 5. Cable Physics — kablo probe'un ekrandaki tarafına göre köşeye gider
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  const tailX = screenX + 190 * cosA;
  const tailY = screenY + 190 * sinA;

  // Sol tarafta ise kablo sol-üst köşeye (25, 25), sağ tarafta ise sağ-üst köşeye (canvasWidth-25, 25)
  const destX = isOnLeftSide ? 25 : ctx.canvas.width - 25;
  const destY = 25;

  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.bezierCurveTo(
    tailX + cosA * 60,
    tailY + sinA * 60 - 50,
    destX + (isOnLeftSide ? 60 : -60),
    destY + 100,
    destX,
    destY
  );
  ctx.stroke();

  // Wire Specular Reflection
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.bezierCurveTo(
    tailX + cosA * 60,
    tailY + sinA * 60 - 50,
    destX + (isOnLeftSide ? 60 : -60),
    destY + 100,
    destX,
    destY
  );
  ctx.stroke();
}
