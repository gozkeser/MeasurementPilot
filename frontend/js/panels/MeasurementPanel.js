import { getState, setState, subscribe } from '../state/store.js';
import { api } from '../api/client.js';
import { drawProbeAssembly } from '../canvas/probe/ProbeAssembly.js';
import { drawReticle } from '../canvas/markers/Reticle.js';
import { showToast } from '../components/Toast.js';

export class MeasurementPanel {
  constructor(containerEl, canvasEngine) {
    this.container = containerEl;
    this.engine = canvasEngine;
    this.operatorName = 'Lab Operator';

    subscribe((state) => {
      if (state.mode === 'measure') {
        this.render(state);
        this.updateCanvasProbes(state);
      } else {
        this.engine.unregisterOverlay('measurement-probes');
      }
    });
  }

  async startSession() {
    try {
      const sess = await api.measurement.startSession(this.operatorName);
      const tcd = await api.tcd.getResolved(getState().activeLayer);
      setState({ activeSession: sess, loadedTCD: tcd, activeTestCaseIndex: 0 });
      showToast(`Measurement session ${sess.session_id} started`, 'success');
    } catch (e) {
      showToast(e.message || 'Failed to start session', 'error');
    }
  }

  async recordMeasurement(testCaseId, valStr, notes = '') {
    const state = getState();
    const sess = state.activeSession;
    if (!sess) return;

    const val = parseFloat(valStr);
    if (isNaN(val)) {
      showToast('Please enter a valid numeric measured value', 'error');
      return;
    }

    try {
      const rec = await api.measurement.record(sess.session_id, {
        test_case_id: testCaseId,
        measured_value: val,
        notes
      });

      const updatedSess = await api.measurement.get(sess.session_id);
      showToast(`Recorded: ${rec.in_range ? 'In Range ✅' : 'Out of Range ⚠️'}`, rec.in_range ? 'success' : 'warning');

      // Move to next testcase
      const total = state.loadedTCD?.test_cases?.length || 0;
      const nextIdx = Math.min(total - 1, state.activeTestCaseIndex + 1);
      setState({ activeSession: updatedSess, activeTestCaseIndex: nextIdx });
    } catch (err) {
      showToast(err.message || 'Failed to record measurement', 'error');
    }
  }

  async skipMeasurement(testCaseId, notes = '') {
    const state = getState();
    const sess = state.activeSession;
    if (!sess) return;

    try {
      await api.measurement.skip(sess.session_id, testCaseId, notes);
      const updatedSess = await api.measurement.get(sess.session_id);
      showToast(`Skipped ${testCaseId}`, 'info');

      const total = state.loadedTCD?.test_cases?.length || 0;
      const nextIdx = Math.min(total - 1, state.activeTestCaseIndex + 1);
      setState({ activeSession: updatedSess, activeTestCaseIndex: nextIdx });
    } catch (err) {
      showToast(err.message || 'Failed to skip test case', 'error');
    }
  }

  async updateCanvasProbes(state) {
    this.engine.unregisterOverlay('measurement-probes');

    const cases = state.loadedTCD?.test_cases || [];
    const activeCase = cases[state.activeTestCaseIndex];

    if (!activeCase || state.mode !== 'measure') return;

    let posX = activeCase.resolved_positive?.x_px;
    let posY = activeCase.resolved_positive?.y_px;
    let negX = activeCase.resolved_negative?.x_px;
    let negY = activeCase.resolved_negative?.y_px;

    const findPointPx = async (probeObj) => {
      if (!probeObj || !probeObj.ref) return null;
      const ref = probeObj.ref.toLowerCase().trim();

      const tp = (state.loadedTPs || []).find(t => t.id.toLowerCase() === ref);
      if (tp) return await api.transform.mmToPx(state.activeLayer, tp.x_mm, tp.y_mm);

      const ctp = (state.loadedCTPs || []).find(c => c.id.toLowerCase() === ref || c.name.toLowerCase() === ref);
      if (ctp) return await api.transform.mmToPx(state.activeLayer, ctp.x_mm, ctp.y_mm);

      const comp = (state.loadedComponents || []).find(c => c.designator.toLowerCase() === ref);
      if (comp) return await api.transform.mmToPx(state.activeLayer, comp.x_mm, comp.y_mm);

      return null;
    };

    if (posX === undefined || posY === undefined) {
      try {
        const pPx = await findPointPx(activeCase.probe_positive);
        if (pPx) { posX = pPx.x_px; posY = pPx.y_px; }
      } catch (e) {}
    }

    if (negX === undefined || negY === undefined) {
      try {
        const nPx = await findPointPx(activeCase.probe_negative);
        if (nPx) { negX = nPx.x_px; negY = nPx.y_px; }
      } catch (e) {}
    }

    if (posX !== undefined && posX !== null && (negX === undefined || negX === null)) {
      negX = posX - 120;
      negY = posY + 60;
    }

    if (negX !== undefined && negX !== null && (posX === undefined || posX === null)) {
      posX = negX + 120;
      posY = negY - 60;
    }

    if ((posX === undefined || posX === null) && (negX === undefined || negX === null)) {
      const imgW = this.engine.image?.width || 800;
      const imgH = this.engine.image?.height || 600;
      posX = imgW / 2 + 50;
      posY = imgH / 2;
      negX = imgW / 2 - 50;
      negY = imgH / 2;
    }

    this.engine.registerOverlay('measurement-probes', (ctx, engine, timestamp) => {
      // 1. Render Negative Probe (Left Side - Green)
      if (negX !== undefined && negX !== null) {
        const sNeg = engine.canvasToScreen(negX, negY);
        drawReticle(ctx, sNeg.sx, sNeg.sy, { color: '#2ed573', size: 28 }, timestamp);
        drawProbeAssembly(ctx, sNeg.sx, sNeg.sy, 'negative', state.settings.probe);
      }

      // 2. Render Positive Probe (Right Side - Red)
      if (posX !== undefined && posX !== null) {
        const sPos = engine.canvasToScreen(posX, posY);
        drawReticle(ctx, sPos.sx, sPos.sy, { color: '#ff4757', size: 28 }, timestamp);
        drawProbeAssembly(ctx, sPos.sx, sPos.sy, 'positive', state.settings.probe);
      }
    });

    if (posX !== undefined && negX !== undefined) {
      const midX = (posX + negX) / 2;
      const midY = (posY + negY) / 2;
      this.engine.flyTo(midX, midY, state.settings.flyto.target_zoom, state.settings.flyto.duration_ms);
    }
  }

  render(state) {
    this.container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `<span>Measurement Execution</span>`;
    this.container.appendChild(header);

    const content = document.createElement('div');
    content.className = 'panel-content';

    const sess = state.activeSession;
    if (!sess) {
      content.innerHTML = `
        <div class="card">
          <div style="font-size: 14px; font-weight: 600; margin-bottom: 10px;">Start Measurement Session</div>
          <div class="input-group">
            <label class="input-label">Operator Name</label>
            <input type="text" class="input-field" id="op-name" value="${this.operatorName}" />
          </div>
          <button class="btn btn-primary" style="width: 100%; margin-top: 10px;" id="btn-start-sess">🚀 Start New Flight Session</button>
        </div>
      `;
      this.container.appendChild(content);

      setTimeout(() => {
        const input = content.querySelector('#op-name');
        if (input) input.addEventListener('input', (e) => this.operatorName = e.target.value);
        const btn = content.querySelector('#btn-start-sess');
        if (btn) btn.addEventListener('click', () => this.startSession());
      }, 0);
      return;
    }

    const cases = state.loadedTCD?.test_cases || [];
    const activeCase = cases[state.activeTestCaseIndex];
    const recsMap = {};
    (sess.records || []).forEach(r => recsMap[r.test_case_id] = r);

    // Session Progress Bar
    const measuredCount = Object.keys(recsMap).length;
    const totalCount = cases.length;
    const pct = totalCount > 0 ? Math.round((measuredCount / totalCount) * 100) : 0;

    const progressCard = document.createElement('div');
    progressCard.className = 'card';
    progressCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; margin-bottom: 6px;">
        <span>Session: ${sess.session_id}</span>
        <span>${measuredCount} / ${totalCount} (${pct}%)</span>
      </div>
      <div style="height: 6px; background: var(--bg-tertiary); border-radius: 3px; overflow: hidden;">
        <div style="height: 100%; width: ${pct}%; background: linear-gradient(90deg, var(--accent-cyan), var(--accent-green)); transition: width 300ms ease;"></div>
      </div>
    `;
    content.appendChild(progressCard);

    if (!activeCase) {
      const doneDiv = document.createElement('div');
      doneDiv.style.textAlign = 'center';
      doneDiv.style.color = 'var(--text-muted)';
      doneDiv.style.marginTop = '20px';
      doneDiv.textContent = 'All test cases processed! Switch to Report tab to generate HTML flight record.';
      content.appendChild(doneDiv);
      this.container.appendChild(content);
      return;
    }

    // Active Test Case Card
    const caseCard = document.createElement('div');
    caseCard.className = 'card';
    caseCard.style.border = '1px solid var(--accent-cyan)';

    const existingRec = recsMap[activeCase.id];

    caseCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span class="badge badge-tpr">Step ${state.activeTestCaseIndex + 1} of ${totalCount}</span>
        ${existingRec ? `<span class="badge badge-${existingRec.status === 'measured' ? (existingRec.in_range ? 'measured' : 'skipped') : 'skipped'}">${existingRec.status.toUpperCase()}</span>` : ''}
      </div>

      <h3 style="font-size: 16px; margin: 0 0 4px 0; color: var(--text-primary);">${activeCase.name}</h3>
      <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">${activeCase.description || 'No description provided.'}</div>

      <div style="background: var(--bg-tertiary); padding: 10px; border-radius: var(--radius-sm); margin-bottom: 14px;">
        <div style="font-size: 11px; color: var(--text-muted);">EXPECTED RANGE</div>
        <div style="font-size: 15px; font-weight: 700; color: var(--accent-cyan);">
          ${activeCase.expected_min} to ${activeCase.expected_max} ${activeCase.prefix}${activeCase.unit}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; margin-bottom: 16px;">
        <div style="background: rgba(255, 71, 87, 0.1); padding: 8px; border-radius: 6px; color: #ff6b81;">
          🔴 POS (+): <strong>${activeCase.probe_positive.ref}</strong>
        </div>
        <div style="background: rgba(46, 213, 115, 0.1); padding: 8px; border-radius: 6px; color: #7bed9f;">
          🟢 NEG (-): <strong>${activeCase.probe_negative.ref}</strong>
        </div>
      </div>

      <div class="input-group">
        <label class="input-label">Measured Value (${activeCase.unit})</label>
        <input type="number" step="any" class="input-field" id="val-input" placeholder="Enter measured number" value="${existingRec?.measured_value ?? ''}" style="font-size: 16px; font-weight: 700; color: var(--accent-cyan);" />
      </div>

      <div class="input-group">
        <label class="input-label">Notes (Optional)</label>
        <input type="text" class="input-field" id="notes-input" placeholder="Remarks..." value="${existingRec?.notes ?? ''}" />
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px;">
        <button class="btn btn-secondary" id="btn-skip">⏭️ Skip</button>
        <button class="btn btn-primary" id="btn-submit">✅ Record</button>
      </div>

      <div style="display: flex; justify-content: space-between; margin-top: 14px; padding-top: 10px; border-top: 1px solid var(--border-color);">
        <button class="btn btn-secondary" id="btn-prev" ${state.activeTestCaseIndex === 0 ? 'disabled' : ''}>◀ Prev</button>
        <button class="btn btn-secondary" id="btn-next" ${state.activeTestCaseIndex === totalCount - 1 ? 'disabled' : ''}>Next ▶</button>
      </div>
    `;

    content.appendChild(caseCard);
    this.container.appendChild(content);

    setTimeout(() => {
      const valIn = caseCard.querySelector('#val-input');
      const notesIn = caseCard.querySelector('#notes-input');
      const submitBtn = caseCard.querySelector('#btn-submit');
      const skipBtn = caseCard.querySelector('#btn-skip');
      const prevBtn = caseCard.querySelector('#btn-prev');
      const nextBtn = caseCard.querySelector('#btn-next');

      if (submitBtn) submitBtn.addEventListener('click', () => this.recordMeasurement(activeCase.id, valIn.value, notesIn.value));
      if (skipBtn) skipBtn.addEventListener('click', () => this.skipMeasurement(activeCase.id, notesIn.value));

      if (prevBtn) prevBtn.addEventListener('click', () => setState({ activeTestCaseIndex: Math.max(0, state.activeTestCaseIndex - 1) }));
      if (nextBtn) nextBtn.addEventListener('click', () => setState({ activeTestCaseIndex: Math.min(totalCount - 1, state.activeTestCaseIndex + 1) }));
    }, 0);
  }
}
