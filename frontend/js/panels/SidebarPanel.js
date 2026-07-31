import { getState, setState, subscribe } from '../state/store.js';
import { api } from '../api/client.js';
import { showToast } from '../components/Toast.js';

export class SidebarPanel {
  constructor(containerEl, canvasEngine) {
    this.container = containerEl;
    this.engine = canvasEngine;
    this.searchQuery = '';
    this.activeFilter = 'ALL';

    subscribe((state) => this.render(state));

    // Listen for project-loaded CustomEvent dispatched by standalone script in index.html
    document.addEventListener('project-loaded', (e) => {
      console.log('[SP] project-loaded event received, detail:', e.detail && e.detail.assembly_no);
      try {
        this._onProjectLoaded(e.detail);
      } catch (err) {
        console.error('[SP] ERROR in event listener calling _onProjectLoaded:', err);
      }
    });

    // Race condition fallback: ZIP was loaded before this module initialised
    if (window._pendingProjectInfo) {
      console.log('[SP] consuming _pendingProjectInfo on construct');
      const info = window._pendingProjectInfo;
      window._pendingProjectInfo = null;
      try {
        this._onProjectLoaded(info);
      } catch (err) {
        console.error('[SP] ERROR in constructor pending fallback:', err);
      }
    }

    console.log('[SP] SidebarPanel constructed, engine:', !!this.engine);
  }

  _onProjectLoaded(projectInfo) {
    console.log('[SP] _onProjectLoaded called, projectInfo:', projectInfo && projectInfo.assembly_no);
    try {
      if (!projectInfo) { console.warn('[SP] projectInfo is null/undefined'); return; }
      setState({ project: projectInfo, activeLayer: projectInfo.active_layer });
      console.log('[SP] setState done, getState().project:', !!(getState().project));
      showToast(`✅ Loaded: ${projectInfo.assembly_no} (${projectInfo.assembly_rev})`, 'success');
      if (projectInfo.warnings && projectInfo.warnings.length > 0) {
        projectInfo.warnings.forEach(w => showToast(w, 'warning', 6000));
      }
      const imgUrl = api.project.image(projectInfo.active_layer);
      console.log('[SP] initImage URL:', imgUrl);
      this.engine.initImage(imgUrl, () => {
        console.log('[SP] image loaded callback fired');
        const projEl = document.getElementById('status-project');
        const layerEl = document.getElementById('status-layer');
        if (projEl) projEl.textContent = `${projectInfo.assembly_no} / ${projectInfo.assembly_rev}`;
        if (layerEl) layerEl.textContent = projectInfo.active_layer;
      });
      this.fetchElements();
    } catch (err) {
      console.error('[SP] _onProjectLoaded EXCEPTION:', err.message, err.stack);
      showToast(`❌ Load error: ${err.message}`, 'error');
    }
  }

  async fetchElements() {
    const state = getState();
    if (!state.project) return;
    try {
      const [comps, tps, ctps, tcd] = await Promise.all([
        api.components.list({ layer: state.activeLayer }),
        api.testpoints.list({ side: state.activeLayer }),
        api.ctps.list(),
        api.tcd.getResolved(state.activeLayer).catch(() => null)
      ]);
      setState({ loadedComponents: comps, loadedTPs: tps, loadedCTPs: ctps, loadedTCD: tcd });
    } catch (e) {
      console.error('Error fetching elements:', e);
    }
  }


  render(state) {
    console.log('[SP] render called, state.project:', !!(state && state.project));
    const dynamicContainer = document.getElementById('sidebar-dynamic-content');
    if (!dynamicContainer) { console.warn('[SP] sidebar-dynamic-content NOT FOUND'); return; }

    dynamicContainer.innerHTML = '';

    // Update export button presence
    const zipCard = document.getElementById('zip-load-card');
    if (zipCard) {
      const existing = zipCard.querySelector('#btn-export-zip');
      if (state && state.project && !existing) {
        const exportBtn = document.createElement('a');
        exportBtn.id = 'btn-export-zip';
        exportBtn.className = 'btn btn-secondary';
        exportBtn.style.cssText = 'width:100%;margin-top:8px;text-decoration:none;text-align:center;display:flex;align-items:center;justify-content:center;';
        exportBtn.href = api.project.exportUrl();
        exportBtn.download = '';
        exportBtn.textContent = '💾 Download Updated ZIP';
        zipCard.appendChild(exportBtn);
      } else if (!state?.project && existing) {
        existing.remove();
      }
    }

    if (!state || !state.project) {
      const msg = document.createElement('div');
      msg.style.cssText = 'text-align:center;color:var(--text-muted);margin-top:20px;font-size:13px;';
      msg.textContent = 'No project loaded. Please load a ZIP file to inspect.';
      dynamicContainer.appendChild(msg);
      return;
    }

    // Layer Switcher
    const layerCard = document.createElement('div');
    layerCard.className = 'card';
    layerCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;font-weight:600;color:var(--text-secondary);">Active Layer:</span>
        <div style="display:flex;gap:6px;">
          <button class="btn ${state.activeLayer === 'TOP' ? 'btn-primary' : 'btn-secondary'}" id="btn-layer-top" style="padding:4px 12px;font-size:12px;">TOP</button>
          <button class="btn ${state.activeLayer === 'BOT' ? 'btn-primary' : 'btn-secondary'}" id="btn-layer-bot" style="padding:4px 12px;font-size:12px;">BOT</button>
        </div>
      </div>`;
    dynamicContainer.appendChild(layerCard);

    layerCard.querySelector('#btn-layer-top')?.addEventListener('click', () => this.switchLayer('TOP'));
    layerCard.querySelector('#btn-layer-bot')?.addEventListener('click', () => this.switchLayer('BOT'));

    // Search bar
    const searchInput = document.createElement('input');
    searchInput.className = 'input-field';
    searchInput.placeholder = 'Search elements...';
    searchInput.value = this.searchQuery;
    searchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.renderElementList(listContainer);
    });
    dynamicContainer.appendChild(searchInput);

    // Filter Chips
    const filters = document.createElement('div');
    filters.style.cssText = 'display:flex;gap:4px;margin:10px 0;';
    ['ALL', 'TPR', 'CTP', 'PPL'].forEach(f => {
      const chip = document.createElement('button');
      chip.className = `btn ${this.activeFilter === f ? 'btn-primary' : 'btn-secondary'}`;
      chip.style.cssText = 'padding:2px 8px;font-size:11px;';
      chip.textContent = f;
      chip.addEventListener('click', () => { this.activeFilter = f; this.render(getState()); });
      filters.appendChild(chip);
    });
    dynamicContainer.appendChild(filters);

    const listContainer = document.createElement('div');
    listContainer.className = 'element-list';
    dynamicContainer.appendChild(listContainer);
    this.renderElementList(listContainer);
  }

  async switchLayer(layer) {
    const state = getState();
    if (state.activeLayer === layer) return;
    try {
      await api.project.setActiveLayer(layer);
      this.engine.unregisterOverlay('selected-element');
      setState({ activeLayer: layer, selectedElement: null });
      this.engine.initImage(api.project.image(layer), () => {
        this.engine.resetView();
      });
      const layerEl = document.getElementById('status-layer');
      if (layerEl) layerEl.textContent = layer;
      this.fetchElements();
    } catch (e) {
      showToast(e.message || 'Failed to switch layer', 'error');
    }
  }


  renderElementList(container) {
    container.innerHTML = '';
    const state = getState();
    let items = [];

    if (this.activeFilter === 'ALL' || this.activeFilter === 'TPR') {
      (state.loadedTPs || []).forEach(tp => items.push({ type: 'TPR', id: tp.id, label: tp.id, sub: tp.net, x: tp.x_mm, y: tp.y_mm }));
    }
    if (this.activeFilter === 'ALL' || this.activeFilter === 'CTP') {
      (state.loadedCTPs || [])
        .filter(ctp => !ctp.side || ctp.side.toUpperCase() === 'BOTH' || ctp.side.toUpperCase() === state.activeLayer)
        .forEach(ctp => items.push({ type: 'CTP', id: ctp.id, label: ctp.name, sub: ctp.net, x: ctp.x_mm, y: ctp.y_mm }));
    }
    if (this.activeFilter === 'ALL' || this.activeFilter === 'PPL') {
      (state.loadedComponents || []).forEach(c => items.push({ type: c.type || 'PPL', id: c.designator, label: c.designator, sub: c.comment, x: c.x_mm, y: c.y_mm }));
    }

    if (this.searchQuery) {
      const sq = this.searchQuery.toLowerCase();
      items = items.filter(i => i.label.toLowerCase().includes(sq) || (i.sub && i.sub.toLowerCase().includes(sq)));
    }

    items.slice(0, 100).forEach(item => {
      const row = document.createElement('div');
      row.className = 'card';
      row.style.cssText = 'padding:8px 12px;margin:4px 0;cursor:pointer;display:flex;justify-content:space-between;align-items:center;';
      row.innerHTML = `
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--text-primary);">${item.label}</div>
          <div style="font-size:11px;color:var(--text-muted);">${item.sub || '—'}</div>
        </div>
        <span class="badge badge-${item.type.toLowerCase()}">${item.type}</span>`;
      row.addEventListener('click', () => {
        setState({ selectedElement: item });
        this.flyToElement(item);
      });
      container.appendChild(row);
    });
  }

  async flyToElement(item) {
    const state = getState();
    try {
      const res = await api.transform.mmToPx(state.activeLayer, item.x, item.y);
      if (res.x_px !== undefined) {
        this.engine.flyTo(res.x_px, res.y_px, state.settings.flyto.target_zoom, state.settings.flyto.duration_ms);
      }
    } catch (e) {
      console.error(e);
    }
  }
}
