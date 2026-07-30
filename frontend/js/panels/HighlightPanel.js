import { getState, subscribe } from '../state/store.js';
import { api } from '../api/client.js';
import { showToast } from '../components/Toast.js';

export class HighlightPanel {
  constructor(containerEl, canvasEngine) {
    this.container = containerEl;
    this.engine = canvasEngine;

    subscribe((state) => {
      if (state.mode === 'highlight') {
        this.render(state);
      }
    });
  }

  async render(state) {
    this.container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `<span>Element Details</span>`;
    this.container.appendChild(header);

    const content = document.createElement('div');
    content.className = 'panel-content';

    const sel = state.selectedElement;
    if (!sel) {
      content.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); margin-top: 40px;">
          <div style="font-size: 32px; margin-bottom: 12px;">🔍</div>
          <div style="font-size: 14px;">Select any element from the left list to inspect its properties.</div>
        </div>
      `;
      this.container.appendChild(content);
      return;
    }

    let pxCoords = { x_px: '—', y_px: '—' };
    try {
      pxCoords = await api.transform.mmToPx(state.activeLayer, sel.x, sel.y);
    } catch (e) {}

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="margin: 0; font-size: 18px; color: var(--accent-cyan);">${sel.label}</h3>
        <span class="badge badge-${sel.type.toLowerCase()}">${sel.type}</span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px;">
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 11px;">NET</span>
          <strong>${sel.sub || '—'}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 11px;">LAYER</span>
          <strong>${sel.data?.side || sel.data?.layer || state.activeLayer}</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 11px;">X (MM)</span>
          <strong>${sel.x.toFixed(3)} mm</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 11px;">Y (MM)</span>
          <strong>${sel.y.toFixed(3)} mm</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 11px;">X (PX)</span>
          <strong>${typeof pxCoords.x_px === 'number' ? pxCoords.x_px.toFixed(1) : pxCoords.x_px} px</strong>
        </div>
        <div>
          <span style="color: var(--text-muted); display: block; font-size: 11px;">Y (PX)</span>
          <strong>${typeof pxCoords.y_px === 'number' ? pxCoords.y_px.toFixed(1) : pxCoords.y_px} px</strong>
        </div>
      </div>
    `;

    content.appendChild(card);

    const btnZoom = document.createElement('button');
    btnZoom.className = 'btn btn-primary';
    btnZoom.style.width = '100%';
    btnZoom.innerHTML = `🎯 Zoom & Focus`;
    btnZoom.addEventListener('click', async () => {
      try {
        const coords = await api.transform.mmToPx(state.activeLayer, sel.x, sel.y);
        if (typeof coords.x_px === 'number' && typeof coords.y_px === 'number') {
          this.engine.flyTo(coords.x_px, coords.y_px, state.settings.flyto.target_zoom);
        } else {
          showToast('Could not calculate target coordinates for focus', 'error');
        }
      } catch (err) {
        showToast(err.message || 'Error transforming coordinates for focus', 'error');
      }
    });

    content.appendChild(btnZoom);
    this.container.appendChild(content);
  }
}
