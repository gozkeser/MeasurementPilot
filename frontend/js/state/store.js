const state = {
  project: null,
  activeLayer: 'TOP',
  mode: 'highlight', // 'highlight' | 'ctp' | 'plan' | 'measure' | 'report'
  selectedElement: null, // { source: 'TPR'|'CTP'|'PPL', data: ... }
  activeSession: null,
  activeTestCaseIndex: 0,
  settings: {
    theme: 'dark',
    language: 'en',
    flyto: { duration_ms: 800, easing: 'easeInOut', target_zoom: 2.5 },
    minimap: { position: 'bottom-right', width_px: 220, height_px: 140, opacity: 0.85 },
    overlays: {
      TPR: { shape: 'reticle', color: '#00d4ff', size_px: 24 },
      CTP: { shape: 'ping', color: '#ff9f1a', size_px: 24 },
      FIDUCIAL: { shape: 'crosshair', color: '#2ed573', size_px: 24 },
      COMPONENT: { shape: 'badge', color: '#a55eea', size_px: 24 }
    },
    probe: { positive_color: '#ff4757', negative_color: '#2ed573', body_length_px: 80, tip_length_px: 20, cable_sag_factor: 0.35 }
  }
};

const listeners = new Set();

export function getState() {
  return state;
}

export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach(fn => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
