import { getState, setState, subscribe } from './state/store.js';
import { setLang, translateDOM } from './i18n/i18n.js';
import { api } from './api/client.js';
import { CanvasEngine } from './canvas/CanvasEngine.js';
import { Minimap } from './canvas/Minimap.js';
import { SidebarPanel } from './panels/SidebarPanel.js';
import { HighlightPanel } from './panels/HighlightPanel.js';
import { CTPPanel } from './panels/CTPPanel.js';
import { PlanningPanel } from './panels/PlanningPanel.js';
import { MeasurementPanel } from './panels/MeasurementPanel.js';
import { ReportPanel } from './panels/ReportPanel.js';
import { drawGlobalHighlight } from './canvas/markers/GlobalHighlight.js';
import { drawBadgeMarker } from './canvas/markers/BadgeMarker.js';
import { showToast } from './components/Toast.js';
import { showModal } from './components/Modal.js';
import { TextInput } from './components/TextInput.js';
import { Dropdown } from './components/Dropdown.js';

class App {
  constructor() {
    this.initI18n();
    this.initCanvas();
    this.initPanels();
    this.initEvents();
    this.initSettings();
  }

  async initI18n() {
    try {
      const enRes = await fetch('/js/i18n/en.json');
      const enDict = await enRes.json();
      setLang('en', enDict);
    } catch (e) {
      console.warn('Failed to load i18n dictionary:', e);
    }
  }

  initCanvas() {
    const mainCanvasEl = document.getElementById('main-canvas');
    this.engine = new CanvasEngine(mainCanvasEl);

    const minimapCanvasEl = document.getElementById('minimap-canvas');
    this.minimap = new Minimap(minimapCanvasEl, this.engine);

    // Coordinate status bar listener
    this.engine.onHoverCallback = async (cx, cy) => {
      const state = getState();
      document.getElementById('status-zoom').textContent = `${Math.round(this.engine.scale * 100)}%`;

      if (state.project && state.activeLayer) {
        try {
          const mm = await api.transform.pxToMm(state.activeLayer, cx, cy);
          document.getElementById('status-coords').textContent = `X: ${mm.x_mm.toFixed(2)} mm | Y: ${mm.y_mm.toFixed(2)} mm`;
        } catch (e) {
          document.getElementById('status-coords').textContent = `X: ${cx.toFixed(0)} px | Y: ${cy.toFixed(0)} px`;
        }
      } else {
        document.getElementById('status-coords').textContent = `X: ${cx.toFixed(0)} px | Y: ${cy.toFixed(0)} px`;
      }
    };

    // Selected Element Overlay Marker
    subscribe((state) => {
      this.engine.unregisterOverlay('selected-element');
      const sel = state.selectedElement;
      if (sel && state.mode === 'highlight') {
        api.transform.mmToPx(state.activeLayer, sel.x, sel.y).then(px => {
          this.engine.registerOverlay('selected-element', (ctx, engine, timestamp) => {
            const screen = engine.canvasToScreen(px.x_px, px.y_px);
            const hl = state.settings.highlight || {};
            drawGlobalHighlight(ctx, screen.sx, screen.sy, hl, timestamp, engine);
            drawBadgeMarker(ctx, screen.sx, screen.sy, sel.label, { color: hl.color || '#00d4ff' });
          });
        }).catch(() => {});
      }
    });
  }

  initPanels() {
    const sidebarEl = document.getElementById('left-sidebar');
    this.sidebarPanel = new SidebarPanel(sidebarEl, this.engine);

    const rightPanelEl = document.getElementById('right-panel');
    this.highlightPanel = new HighlightPanel(rightPanelEl, this.engine);
    this.ctpPanel = new CTPPanel(rightPanelEl, this.engine);
    this.planningPanel = new PlanningPanel(rightPanelEl, this.engine);
    this.measurementPanel = new MeasurementPanel(rightPanelEl, this.engine);
    this.reportPanel = new ReportPanel(rightPanelEl);

    // Initial render for sidebar
    this.sidebarPanel.render(getState());
  }

  initEvents() {
    // Canvas Controls (Fit Image & Fullscreen)
    const btnFit = document.getElementById('btn-canvas-fit');
    if (btnFit) {
      btnFit.addEventListener('click', () => {
        this.engine.resetView();
        showToast('Canvas view reset to fit image', 'info');
      });
    }

    const btnFullscreen = document.getElementById('btn-canvas-fullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => {
        const container = document.getElementById('canvas-container');
        if (!document.fullscreenElement) {
          container.requestFullscreen().catch(err => {
            showToast(`Error enabling fullscreen: ${err.message}`, 'error');
          });
        } else {
          document.exitFullscreen();
        }
      });
    }

    document.addEventListener('fullscreenchange', () => {
      setTimeout(() => {
        if (this.engine) {
          this.engine.resize();
          this.engine.resetView();
        }
      }, 150);
    });

    // Mode Switcher Tabs
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const mode = tab.getAttribute('data-mode');
        window._appMode = mode;

        // Highlight tabından çıkılınca animasyonu sonlandır
        if (mode !== 'highlight') {
          this.engine.unregisterOverlay('selected-element');
          setState({ selectedElement: null });
        }

        setState({ mode });
      });
    });

    // Theme Toggle Button
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : (current === 'light' ? 'corporate' : 'dark');
        document.documentElement.setAttribute('data-theme', next);
        showToast(`Theme switched to ${next}`, 'info');
      });
    }

    // Language Toggle Button
    const langBtn = document.getElementById('btn-lang-toggle');
    if (langBtn) {
      langBtn.addEventListener('click', async () => {
        const state = getState();
        const currentLang = state.settings.language || 'en';
        const nextLang = currentLang === 'en' ? 'tr' : 'en';

        try {
          const dictRes = await fetch(`/js/i18n/${nextLang}.json`);
          const dict = await dictRes.json();
          setLang(nextLang, dict);
          langBtn.textContent = nextLang.toUpperCase();
          setState({ settings: { ...state.settings, language: nextLang } });
          showToast(`Language: ${nextLang.toUpperCase()}`, 'info');
        } catch (e) {
          console.error(e);
        }
      });
    }

    // Gear Settings Button Modal
    const settingsBtn = document.getElementById('btn-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.openSettingsModal());
    }
  }

  openSettingsModal() {
    const state = getState();
    const settings = state.settings;
    const form = document.createElement('form');

    let themeVal = settings.theme || 'dark';
    let flyDurationVal = settings.flyto?.duration_ms || 800;
    let flyZoomVal = settings.flyto?.target_zoom || 2.5;
    let posColorVal = settings.probe?.positive_color || '#dc2626';
    let negColorVal = settings.probe?.negative_color || '#000000';
    let probeAngleVal = settings.probe?.probe_angle || 40;
    let hlAnimVal   = settings.highlight?.animation || 'reticle';
    let hlColorVal  = settings.highlight?.color || '#00d4ff';
    let hlSizeVal   = settings.highlight?.size || 32;
    let hlLineWVal  = settings.highlight?.line_width || 2;
    let hlZoomScaleRatioVal = settings.highlight?.zoom_scale_ratio !== undefined ? settings.highlight.zoom_scale_ratio : 1.0;

    form.appendChild(Dropdown({
      label: 'UI Theme',
      options: [
        { value: 'dark', label: 'Dark Mode (Default)' },
        { value: 'light', label: 'Light Mode' },
        { value: 'corporate', label: 'Corporate Mode' }
      ],
      selected: themeVal,
      onSelect: (v) => themeVal = v
    }));

    const flyRow = document.createElement('div');
    flyRow.style.display = 'grid';
    flyRow.style.gridTemplateColumns = '1fr 1fr';
    flyRow.style.gap = '10px';

    flyRow.appendChild(TextInput({
      label: 'Fly-to Duration (ms)',
      value: flyDurationVal,
      type: 'number',
      onChange: (v) => flyDurationVal = parseInt(v) || 800
    }));

    flyRow.appendChild(TextInput({
      label: 'Target Zoom Level',
      value: flyZoomVal,
      type: 'number',
      onChange: (v) => flyZoomVal = parseFloat(v) || 2.5
    }));

    form.appendChild(flyRow);

    const probeRow = document.createElement('div');
    probeRow.style.display = 'grid';
    probeRow.style.gridTemplateColumns = '1fr 1fr';
    probeRow.style.gap = '10px';

    probeRow.appendChild(TextInput({
      label: 'Positive Probe (+) Color',
      value: posColorVal,
      onChange: (v) => posColorVal = v
    }));

    probeRow.appendChild(TextInput({
      label: 'Negative Probe (-) Color',
      value: negColorVal,
      onChange: (v) => negColorVal = v
    }));

    form.appendChild(probeRow);

    form.appendChild(TextInput({
      label: 'Probe Tilt Angle (Degrees 0..90)',
      value: probeAngleVal,
      type: 'number',
      onChange: (v) => probeAngleVal = parseInt(v) || 40
    }));

    // ---- Highlight Animation Settings ----
    const hlDivider = document.createElement('div');
    hlDivider.style.cssText = 'border-top: 1px solid var(--border-color); margin: 16px 0 12px; padding-top: 12px; font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;';
    hlDivider.textContent = 'Highlight Animation';
    form.appendChild(hlDivider);

    form.appendChild(Dropdown({
      label: 'Animation Type',
      options: [
        { value: 'reticle',   label: 'Reticle — Rotating Ring' },
        { value: 'ping',      label: 'Ping — Expanding Pulse' },
        { value: 'crosshair', label: 'Crosshair — Fixed Target' }
      ],
      selected: hlAnimVal,
      onSelect: (v) => hlAnimVal = v
    }));

    const hlRow = document.createElement('div');
    hlRow.style.display = 'grid';
    hlRow.style.gridTemplateColumns = '1fr 1fr';
    hlRow.style.gap = '10px';

    hlRow.appendChild(TextInput({
      label: 'Color',
      value: hlColorVal,
      onChange: (v) => hlColorVal = v
    }));

    hlRow.appendChild(TextInput({
      label: 'Size (px)',
      value: hlSizeVal,
      type: 'number',
      onChange: (v) => hlSizeVal = parseInt(v) || 32
    }));

    form.appendChild(hlRow);

    const hlRow2 = document.createElement('div');
    hlRow2.style.display = 'grid';
    hlRow2.style.gridTemplateColumns = '1fr 1fr';
    hlRow2.style.gap = '10px';

    hlRow2.appendChild(TextInput({
      label: 'Line Width (px)',
      value: hlLineWVal,
      type: 'number',
      onChange: (v) => hlLineWVal = parseInt(v) || 2
    }));

    hlRow2.appendChild(TextInput({
      label: 'Zoom Scale Ratio (0..2)',
      value: hlZoomScaleRatioVal,
      type: 'number',
      step: '0.1',
      onChange: (v) => hlZoomScaleRatioVal = parseFloat(v) ?? 1.0
    }));

    form.appendChild(hlRow2);

    showModal({
      title: '⚙️ Application & Canvas Settings',
      bodyEl: form,
      actions: [
        { label: 'Cancel', variant: 'secondary' },
        {
          label: 'Save Settings',
          variant: 'primary',
          onClick: async () => {
            const patch = {
              theme: themeVal,
              flyto: { duration_ms: flyDurationVal, target_zoom: flyZoomVal },
              probe: { positive_color: posColorVal, negative_color: negColorVal, probe_angle: probeAngleVal },
              highlight: { animation: hlAnimVal, color: hlColorVal, size: hlSizeVal, line_width: hlLineWVal, zoom_scale_ratio: hlZoomScaleRatioVal }
            };

            try {
              const updated = await api.settings.update(patch);
              setState({ settings: { ...state.settings, ...updated } });
              document.documentElement.setAttribute('data-theme', themeVal);
              showToast('Settings saved successfully', 'success');
            } catch (err) {
              showToast(err.message || 'Failed to save settings', 'error');
            }
          }
        }
      ]
    });
  }


  async initSettings() {
    try {
      const serverSettings = await api.settings.get();
      const state = getState();
      setState({ settings: { ...state.settings, ...serverSettings } });
      if (serverSettings.theme) {
        document.documentElement.setAttribute('data-theme', serverSettings.theme);
      }
    } catch (e) {
      console.warn('Could not load backend settings:', e);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
