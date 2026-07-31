import { drawReticle } from './Reticle.js';
import { drawPing } from './Ping.js';
import { drawCrosshair } from './Crosshair.js';

export function drawGlobalHighlight(ctx, screenX, screenY, highlightConfig = {}, timestamp = 0, engine = null) {
  const color = highlightConfig.color || '#00d4ff';
  let size = highlightConfig.size || 32;
  const line_width = highlightConfig.line_width || 2;
  const anim = highlightConfig.animation || 'reticle';

  if (engine && engine.fitScale && engine.scale > engine.fitScale) {
    const zoomRatio = engine.scale / engine.fitScale;
    const ratio = highlightConfig.zoom_scale_ratio !== undefined ? parseFloat(highlightConfig.zoom_scale_ratio) : 1.0;
    size = Math.round(size * (1 + ratio * (zoomRatio - 1)));
  }

  if (anim === 'reticle') {
    drawReticle(ctx, screenX, screenY, { color, size, line_width }, timestamp);
  } else if (anim === 'ping') {
    drawPing(ctx, screenX, screenY, { color, size, line_width }, timestamp);
  } else if (anim === 'crosshair') {
    drawCrosshair(ctx, screenX, screenY, { color, size, line_width });
  }
}
