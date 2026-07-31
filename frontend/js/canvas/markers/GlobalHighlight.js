import { drawReticle } from './Reticle.js';
import { drawPing } from './Ping.js';
import { drawCrosshair } from './Crosshair.js';

export function drawGlobalHighlight(ctx, screenX, screenY, highlightConfig = {}, timestamp = 0) {
  const color = highlightConfig.color || '#00d4ff';
  const size = highlightConfig.size || 32;
  const line_width = highlightConfig.line_width || 2;
  const anim = highlightConfig.animation || 'reticle';

  if (anim === 'reticle') {
    drawReticle(ctx, screenX, screenY, { color, size, line_width }, timestamp);
  } else if (anim === 'ping') {
    drawPing(ctx, screenX, screenY, { color, size, line_width }, timestamp);
  } else if (anim === 'crosshair') {
    drawCrosshair(ctx, screenX, screenY, { color, size, line_width });
  }
}
