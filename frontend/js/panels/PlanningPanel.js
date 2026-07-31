import { getState, setState, subscribe } from '../state/store.js';
import { api } from '../api/client.js';
import { showModal } from '../components/Modal.js';
import { TextInput } from '../components/TextInput.js';
import { Dropdown } from '../components/Dropdown.js';
import { ComboBox } from '../components/ComboBox.js';
import { getUnitSuggestions, getPrefixOptions, toBaseUnit, fromBaseUnit, formatWithPrefix } from '../utils/units.js';
import { showToast } from '../components/Toast.js';
import { drawProbeAssembly } from '../canvas/probe/ProbeAssembly.js';
import { drawGlobalHighlight } from '../canvas/markers/GlobalHighlight.js';

export class PlanningPanel {
  constructor(containerEl, canvasEngine) {
    this.container = containerEl;
    this.engine = canvasEngine;

    subscribe((state) => {
      if (state.mode === 'plan') {
        if (!state.loadedTCD) {
          this.fetchTCD();
        }
        this.render(state);
      } else {
        // Başka taba geçince planning probe overlay'i temizle
        this.engine.unregisterOverlay('planning-probes');
      }
    });

  }

  async fetchTCD() {
    try {
      const tcd = await api.tcd.getResolved(getState().activeLayer);
      setState({ loadedTCD: tcd });
    } catch (e) {
      console.error(e);
    }
  }

  openTestCaseModal(existing = null) {
    const state = getState();
    const form = document.createElement('form');

    let nameVal = existing ? existing.name : '';
    let descVal = existing ? existing.description : '';
    let mTypeVal = existing ? existing.measurement_type : 'DC_VOLTAGE';

    // Base unit değerler (saklama formatı)
    let minBaseVal = existing ? existing.expected_min : 0.0;
    let maxBaseVal = existing ? existing.expected_max : 5.0;
    let unitVal    = existing ? existing.unit   : 'V';
    let prefixVal  = existing ? existing.prefix : '';

    // Display değerler (prefix'e göre çevrilen gösterim)
    let minDisplayVal = fromBaseUnit(minBaseVal, prefixVal);
    let maxDisplayVal = fromBaseUnit(maxBaseVal, prefixVal);

    let posSource = existing ? existing.probe_positive.source : 'TPR';
    let posRef    = existing ? existing.probe_positive.ref   : '';
    let posLayer  = existing ? (existing.probe_positive.layer || state.activeLayer) : state.activeLayer;
    let negSource = existing ? existing.probe_negative.source : 'TPR';
    let negRef    = existing ? existing.probe_negative.ref   : '';
    let negLayer  = existing ? (existing.probe_negative.layer || state.activeLayer) : state.activeLayer;

    form.appendChild(TextInput({
      label: 'Test Case Name',
      value: nameVal,
      placeholder: 'e.g. 3.3V Rail Voltage Check',
      onChange: (v) => nameVal = v
    }));

    form.appendChild(TextInput({
      label: 'Description',
      value: descVal,
      placeholder: 'Brief instructions for operator',
      onChange: (v) => descVal = v
    }));

    const types = [
      { value: 'DC_VOLTAGE',  label: 'DC Voltage (V)' },
      { value: 'AC_VOLTAGE',  label: 'AC Voltage (V)' },
      { value: 'RESISTANCE',  label: 'Resistance (Ohm)' },
      { value: 'FREQUENCY',   label: 'Frequency (Hz)' },
      { value: 'DIODE',       label: 'Diode Test (V)' },
      { value: 'CONTINUITY',  label: 'Continuity' }
    ];

    form.appendChild(Dropdown({
      label: 'Measurement Type',
      options: types,
      selected: mTypeVal,
      onSelect: (v) => {
        mTypeVal = v;
        const sugs = getUnitSuggestions(v);
        unitVal   = sugs.defaultUnit;
        prefixVal = sugs.defaultPrefix;
      }
    }));

    // --- Min / Max + Prefix Row ---
    const rangeRow = document.createElement('div');
    rangeRow.style.display = 'grid';
    rangeRow.style.gridTemplateColumns = '1fr 1fr';
    rangeRow.style.gap = '10px';

    // Min wrapper: [input | prefix dropdown]
    const minWrapper = document.createElement('div');
    minWrapper.style.display = 'grid';
    minWrapper.style.gridTemplateColumns = '2fr 1fr';
    minWrapper.style.gap = '4px';
    minWrapper.style.alignItems = 'end';

    minWrapper.appendChild(TextInput({
      label: 'Expected Min',
      value: minDisplayVal,
      type: 'number',
      onChange: (v) => { minDisplayVal = parseFloat(v) || 0; }
    }));
    minWrapper.appendChild(Dropdown({
      label: 'Prefix',
      options: getPrefixOptions(mTypeVal),
      selected: prefixVal,
      onSelect: (v) => {
        prefixVal = v;
      }
    }));
    rangeRow.appendChild(minWrapper);

    // Max wrapper: [input | (no label prefix — shared)]
    const maxWrapper = document.createElement('div');
    maxWrapper.style.display = 'grid';
    maxWrapper.style.gridTemplateColumns = '2fr 1fr';
    maxWrapper.style.gap = '4px';
    maxWrapper.style.alignItems = 'end';

    maxWrapper.appendChild(TextInput({
      label: 'Expected Max',
      value: maxDisplayVal,
      type: 'number',
      onChange: (v) => { maxDisplayVal = parseFloat(v) || 0; }
    }));
    // Boş placeholder (prefix min ile ortak)
    const maxPrefixPlaceholder = document.createElement('div');
    maxPrefixPlaceholder.style.cssText = 'display:flex;align-items:flex-end;padding-bottom:2px;font-size:12px;color:var(--text-muted);';
    maxPrefixPlaceholder.textContent = '← prefix';
    maxWrapper.appendChild(maxPrefixPlaceholder);
    rangeRow.appendChild(maxWrapper);

    form.appendChild(rangeRow);

    // --- Probe Points ---
    const allOptions = [];
    (state.loadedTPs  || []).forEach(tp  => allOptions.push({ source: 'TPR', id: tp.id,          layer: tp.side || 'TOP', label: `[TPR] ${tp.id}`,          sub: tp.net || '' }));
    (state.loadedCTPs || []).forEach(ctp => allOptions.push({ source: 'CTP', id: ctp.id,         layer: ctp.side || 'TOP', label: `[CTP] ${ctp.name}`,       sub: ctp.net || '' }));
    (state.loadedComponents || []).forEach(c => allOptions.push({ source: 'PPL', id: c.designator, layer: c.layer || 'TOP', label: `[PPL] ${c.designator}`, sub: c.comment || '' }));

    form.appendChild(ComboBox({
      label: '🔴 Positive Probe Point (+)',
      value: posRef,
      options: allOptions,
      placeholder: 'Search point (e.g. TP1, CTP-1, FD1)...',
      onSelect: (opt) => {
        posSource = opt.source || 'TPR';
        posRef    = opt.id || opt.value || '';
        posLayer  = opt.layer || state.activeLayer;
      }
    }));

    form.appendChild(ComboBox({
      label: '⚫ Negative Probe Point (-)',
      value: negRef,
      options: allOptions,
      placeholder: 'Search point (e.g. TP2, GND)...',
      onSelect: (opt) => {
        negSource = opt.source || 'TPR';
        negRef    = opt.id || opt.value || '';
        negLayer  = opt.layer || state.activeLayer;
      }
    }));

    showModal({
      title: existing ? 'Edit Test Case' : 'Add Test Case',
      bodyEl: form,
      actions: [
        { label: 'Cancel', variant: 'secondary' },
        {
          label: 'Save Test Case',
          variant: 'primary',
          onClick: async () => {
            // Kullanıcının girdiği display değerlerini base unit'e çevir
            const minBase = toBaseUnit(minDisplayVal, prefixVal);
            const maxBase = toBaseUnit(maxDisplayVal, prefixVal);

            const caseData = {
              id: existing ? existing.id : '',
              name: nameVal,
              description: descVal,
              measurement_type: mTypeVal,
              expected_min: minBase,
              expected_max: maxBase,
              unit: unitVal,
              prefix: prefixVal,
              probe_positive: { source: posSource, ref: posRef, layer: posLayer },
              probe_negative: { source: negSource, ref: negRef, layer: negLayer }
            };

            try {
              if (existing) {
                await api.tcd.updateCase(existing.id, caseData);
                showToast(`Updated test case ${existing.id}`, 'success');
              } else {
                await api.tcd.addCase(caseData);
                showToast('Added test case', 'success');
              }
              this.fetchTCD();
            } catch (err) {
              showToast(err.message || 'Failed to save test case', 'error');
            }
          }
        }
      ]
    });
  }

  // Her iki probu gösterecek şekilde zoom ayarlar
  _flyToBothProbes(posX, posY, negX, negY, state) {
    const validPoints = [[posX, posY], [negX, negY]].filter(([x]) => x != null && !isNaN(x));
    if (validPoints.length === 0) return;

    const xs = validPoints.map(p => p[0]);
    const ys = validPoints.map(p => p[1]);
    const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
    const dx = Math.max(...xs) - Math.min(...xs) || 100;
    const dy = Math.max(...ys) - Math.min(...ys) || 100;
    const margin = 2.5;
    const fitZoom = Math.min(
      this.engine.canvas.width  / (dx * margin),
      this.engine.canvas.height / (dy * margin),
      state.settings?.flyto?.target_zoom || 2.5
    );

    this.engine.flyTo(midX, midY, Math.max(fitZoom, 0.5), state.settings?.flyto?.duration_ms || 800);
  }

  async showProbesOnCanvas(tc, state) {
    this.engine.unregisterOverlay('planning-probes');

    // Auto Layer Switch if test case probe point is on a different layer
    const targetLayer = tc.probe_positive?.layer || tc.probe_negative?.layer;
    if (targetLayer && targetLayer !== state.activeLayer) {
      try {
        await api.project.setActiveLayer(targetLayer);
        const [comps, tps, ctps] = await Promise.all([
          api.components.list({ layer: targetLayer }),
          api.testpoints.list({ side: targetLayer }),
          api.ctps.list()
        ]);
        setState({ activeLayer: targetLayer, loadedComponents: comps, loadedTPs: tps, loadedCTPs: ctps });
        state = getState(); // refresh state reference
        this.engine.initImage(api.project.image(targetLayer));
      } catch (e) {
        console.warn('Auto layer switch failed:', e);
      }
    }

    const findPx = async (probeRef) => {
      if (!probeRef || !probeRef.ref) return null;
      const ref = probeRef.ref.toLowerCase().trim();

      const tp = (state.loadedTPs || []).find(t => t.id.toLowerCase() === ref);
      if (tp) return await api.transform.mmToPx(state.activeLayer, tp.x_mm, tp.y_mm);

      const ctp = (state.loadedCTPs || []).find(c => c.id.toLowerCase() === ref || c.name.toLowerCase() === ref);
      if (ctp) return await api.transform.mmToPx(state.activeLayer, ctp.x_mm, ctp.y_mm);

      const comp = (state.loadedComponents || []).find(c => c.designator.toLowerCase() === ref);
      if (comp) return await api.transform.mmToPx(state.activeLayer, comp.x_mm, comp.y_mm);

      return null;
    };

    let posX, posY, negX, negY;
    try {
      const posPx = await findPx(tc.probe_positive);
      if (posPx) { posX = posPx.x_px; posY = posPx.y_px; }
    } catch (e) {}
    try {
      const negPx = await findPx(tc.probe_negative);
      if (negPx) { negX = negPx.x_px; negY = negPx.y_px; }
    } catch (e) {}

    if (posX == null && negX == null) return;

    const animStartTime = performance.now();

    this.engine.registerOverlay('planning-probes', (ctx, engine, timestamp) => {
      const probeConfig = state.settings?.probe || {};
      const highlightConfig = state.settings?.highlight || {};
      const elapsed = timestamp - animStartTime;
      const opacity = Math.min(1.0, elapsed / 200);

      if (posX != null) {
        const s = engine.canvasToScreen(posX, posY);
        drawGlobalHighlight(ctx, s.sx, s.sy, highlightConfig, timestamp);
        drawProbeAssembly(ctx, s.sx, s.sy, 'positive', probeConfig, ctx.canvas.width, opacity);
      }
      if (negX != null) {
        const s = engine.canvasToScreen(negX, negY);
        drawGlobalHighlight(ctx, s.sx, s.sy, highlightConfig, timestamp);
        drawProbeAssembly(ctx, s.sx, s.sy, 'negative', probeConfig, ctx.canvas.width, opacity);
      }
    });

    this._flyToBothProbes(posX, posY, negX, negY, state);
  }

  render(state) {
    this.container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `<span>Measurement Planning (TCD)</span>`;
    this.container.appendChild(header);

    const content = document.createElement('div');
    content.className = 'panel-content';

    const btnAdd = document.createElement('button');
    btnAdd.className = 'btn btn-primary';
    btnAdd.style.width = '100%';
    btnAdd.style.marginBottom = '16px';
    btnAdd.innerHTML = '➕ Add Test Case';
    btnAdd.addEventListener('click', () => this.openTestCaseModal());
    content.appendChild(btnAdd);

    const cases = state.loadedTCD?.test_cases || [];

    if (cases.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.style.textAlign = 'center';
      emptyDiv.style.color = 'var(--text-muted)';
      emptyDiv.style.marginTop = '30px';
      emptyDiv.textContent = 'No test cases in TCD. Click above to define your first test case.';
      content.appendChild(emptyDiv);
    } else {
      cases.forEach((tc, idx) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '8px';
        card.style.cursor = 'pointer';
        card.style.transition = 'border-color 0.15s';

        // Prefix ile gösterim değerlerini hesapla
        const minDisplay = formatWithPrefix(tc.expected_min, tc.prefix, tc.unit);
        const maxDisplay = formatWithPrefix(tc.expected_max, tc.prefix, tc.unit);

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: var(--accent-cyan); font-size: 14px;">${tc.id} — ${tc.name}</strong>
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-icon btn-edit" title="Edit">✏️</button>
              <button class="btn btn-icon btn-del" title="Delete" style="color: var(--accent-red);">🗑️</button>
            </div>
          </div>
          <div style="font-size: 12px; color: var(--text-secondary);">${tc.description || 'No description'}</div>
          <div style="font-size: 12px; background: rgba(255,255,255,0.04); padding: 6px 10px; border-radius: 6px;">
            Expected Range: <strong>${minDisplay} to ${maxDisplay}</strong>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
            <div style="color: var(--accent-red);">🔴 (+) ${tc.probe_positive.source}:${tc.probe_positive.ref}</div>
            <div style="color: #888;">⚫ (-) ${tc.probe_negative.source}:${tc.probe_negative.ref}</div>
          </div>
        `;

        // Test case'e tıklayınca probe'ları göster
        card.addEventListener('click', (e) => {
          if (e.target.closest('.btn-edit') || e.target.closest('.btn-del')) return;
          this.showProbesOnCanvas(tc, state);
        });

        card.querySelector('.btn-edit').addEventListener('click', () => this.openTestCaseModal(tc));
        card.querySelector('.btn-del').addEventListener('click', async () => {
          try {
            await api.tcd.deleteCase(tc.id);
            showToast(`Deleted ${tc.id}`, 'info');
            this.fetchTCD();
          } catch (err) {
            showToast(err.message || 'Failed to delete test case', 'error');
          }
        });

        content.appendChild(card);
      });
    }

    this.container.appendChild(content);
  }
}
