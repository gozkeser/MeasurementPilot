import { getState, setState, subscribe } from '../state/store.js';
import { api } from '../api/client.js';
import { drawProbeAssembly } from '../canvas/probe/ProbeAssembly.js';
import { drawGlobalHighlight } from '../canvas/markers/GlobalHighlight.js';
import { showToast } from '../components/Toast.js';
import { formatWithPrefix } from '../utils/units.js';

export class MeasurementPanel {
  constructor(containerEl, canvasEngine) {
    this.container = containerEl;
    this.engine = canvasEngine;
    this.operatorName = 'Lab Operator';

    subscribe((state) => {
      if (state.mode === 'measure') {
        this.render(state);
        // Session yoksa probe gösterme
        if (state.activeSession) {
          this.updateCanvasProbes(state);
        } else {
          this.engine.unregisterOverlay('measurement-probes');
        }
      } else {
        this.engine.unregisterOverlay('measurement-probes');
      }
    });
  }

  async startSession() {
    try {
      const sess = await api.measurement.startSession(this.operatorName);
      const tcd  = await api.tcd.getResolved(getState().activeLayer);
      setState({ activeSession: sess, loadedTCD: tcd, activeTestCaseIndex: 0 });
      showToast(`Test session ${sess.session_id} started`, 'success');
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

    // Auto Layer Switch if test case probe point is on a different layer
    const targetLayer = activeCase.probe_positive?.layer || activeCase.resolved_positive?.side || activeCase.probe_negative?.layer || activeCase.resolved_negative?.side;
    if (targetLayer && targetLayer !== state.activeLayer && (targetLayer === 'TOP' || targetLayer === 'BOT')) {
      try {
        await api.project.setActiveLayer(targetLayer);
        const [comps, tps, ctps] = await Promise.all([
          api.components.list({ layer: targetLayer }),
          api.testpoints.list({ side: targetLayer }),
          api.ctps.list()
        ]);
        setState({ activeLayer: targetLayer, loadedComponents: comps, loadedTPs: tps, loadedCTPs: ctps });
        state = getState();
        this.engine.initImage(api.project.image(targetLayer));
      } catch (e) {
        console.warn('Auto layer switch failed:', e);
      }
    }

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

    if (posX === undefined || posX === null) {
      try {
        const pPx = await findPointPx(activeCase.probe_positive);
        if (pPx) { posX = pPx.x_px; posY = pPx.y_px; }
      } catch (e) {}
    }

    if (negX === undefined || negX === null) {
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

    const animStartTime = performance.now();

    this.engine.registerOverlay('measurement-probes', (ctx, engine, timestamp) => {
      const probeConfig = state.settings?.probe || {};
      const highlightConfig = state.settings?.highlight || {};
      const elapsed = timestamp - animStartTime;
      const opacity = Math.min(1.0, elapsed / 200);

      // Negatif Probe + Global Highlight
      if (negX !== undefined && negX !== null) {
        const sNeg = engine.canvasToScreen(negX, negY);
        drawGlobalHighlight(ctx, sNeg.sx, sNeg.sy, highlightConfig, timestamp);
        drawProbeAssembly(ctx, sNeg.sx, sNeg.sy, 'negative', probeConfig, ctx.canvas.width, opacity);
      }
      // Pozitif Probe + Global Highlight
      if (posX !== undefined && posX !== null) {
        const sPos = engine.canvasToScreen(posX, posY);
        drawGlobalHighlight(ctx, sPos.sx, sPos.sy, highlightConfig, timestamp);
        drawProbeAssembly(ctx, sPos.sx, sPos.sy, 'positive', probeConfig, ctx.canvas.width, opacity);
      }
    });

    // Her iki probu gösterecek zoom
    if (posX !== undefined && negX !== undefined) {
      const validPoints = [[posX, posY], [negX, negY]].filter(([x]) => x != null && !isNaN(x));
      if (validPoints.length > 0) {
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
    }
  }

  renderTestList(state, content) {
    const sess  = state.activeSession;
    const cases = state.loadedTCD?.test_cases || [];
    const recsMap = {};
    (sess?.records || []).forEach(r => recsMap[r.test_case_id] = r);

    const listHeader = document.createElement('div');
    listHeader.style.cssText = 'font-size: 11px; font-weight: 700; color: var(--text-muted); margin: 16px 0 6px; text-transform: uppercase; letter-spacing: 0.5px;';
    listHeader.textContent = 'All Test Cases';
    content.appendChild(listHeader);

    const listEl = document.createElement('div');
    listEl.id = 'tc-drag-list';
    listEl.style.cssText = 'display:flex; flex-direction:column; gap:3px; max-height:280px; overflow-y:auto;';

    let dragSrcIdx = null;

    cases.forEach((tc, idx) => {
      const rec = recsMap[tc.id];
      const isActive = idx === state.activeTestCaseIndex;
      let statusLabel = 'PENDING';
      let statusColor = 'var(--text-muted)';

      if (rec) {
        if (rec.status === 'measured') {
          statusLabel = rec.in_range ? 'IN RANGE ✅' : 'OUT OF RANGE ⚠️';
          statusColor = rec.in_range ? 'var(--accent-green)' : 'var(--accent-red)';
        } else {
          statusLabel = 'SKIPPED';
          statusColor = '#f59e0b';
        }

      }

      const row = document.createElement('div');
      row.draggable = true;
      row.dataset.tcId  = tc.id;
      row.dataset.idx   = String(idx);
      row.style.cssText = `
        display:flex; align-items:center; gap:8px; padding:6px 10px;
        border-radius:var(--radius-sm); cursor:pointer; font-size:12px;
        background: ${isActive ? 'rgba(0,212,255,0.10)' : 'var(--bg-tertiary)'};
        border: 1px solid ${isActive ? 'var(--accent-cyan)' : 'transparent'};
        transition: background 0.12s, border-color 0.12s;
        user-select: none;
      `;
      row.innerHTML = `
        <span style="color:var(--text-muted);cursor:grab;font-size:14px;flex-shrink:0;">⠇</span>
        <span style="color:var(--accent-cyan);font-weight:700;min-width:52px;flex-shrink:0;">${tc.id}</span>
        <span style="flex:1;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${tc.name}</span>
        <span style="color:${statusColor};font-size:10px;font-weight:700;white-space:nowrap;flex-shrink:0;">${statusLabel}</span>
      `;

      row.addEventListener('click', () => setState({ activeTestCaseIndex: idx }));

      row.addEventListener('dragstart', (e) => {
        dragSrcIdx = idx;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => { row.style.opacity = '0.4'; }, 0);
      });
      row.addEventListener('dragend', () => {
        row.style.opacity = '1';
        dragSrcIdx = null;
      });
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        row.style.background = 'rgba(0,212,255,0.08)';
        row.style.borderColor = 'rgba(0,212,255,0.4)';
      });
      row.addEventListener('dragleave', () => {
        row.style.background = isActive ? 'rgba(0,212,255,0.10)' : 'var(--bg-tertiary)';
        row.style.borderColor = isActive ? 'var(--accent-cyan)' : 'transparent';
      });
      row.addEventListener('drop', async (e) => {
        e.preventDefault();
        row.style.background = isActive ? 'rgba(0,212,255,0.10)' : 'var(--bg-tertiary)';
        row.style.borderColor = isActive ? 'var(--accent-cyan)' : 'transparent';
        if (dragSrcIdx === null || dragSrcIdx === idx) return;

        const newOrder = [...cases.map(c => c.id)];
        const [moved] = newOrder.splice(dragSrcIdx, 1);
        newOrder.splice(idx, 0, moved);

        try {
          await api.tcd.reorder(newOrder);
          const tcd = await api.tcd.getResolved(state.activeLayer);
          setState({ loadedTCD: tcd });
          showToast('Test order updated', 'success');
        } catch (err) {
          showToast('Reorder failed', 'error');
        }
        dragSrcIdx = null;
      });

      listEl.appendChild(row);
    });

    content.appendChild(listEl);
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
          <button class="btn btn-primary" style="width: 100%; margin-top: 10px;" id="btn-start-sess">🚀 Start New Test Session</button>
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
      doneDiv.textContent = 'All test cases processed! Switch to Report tab to generate HTML test record.';
      content.appendChild(doneDiv);
      this.container.appendChild(content);
      return;
    }

    const caseCard = document.createElement('div');
    caseCard.className = 'card';
    caseCard.style.border = '1px solid var(--accent-cyan)';

    const existingRec = recsMap[activeCase.id];
    const minDisplay = formatWithPrefix(activeCase.expected_min, activeCase.prefix, activeCase.unit);
    const maxDisplay = formatWithPrefix(activeCase.expected_max, activeCase.prefix, activeCase.unit);

    caseCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span class="badge badge-tpr">Step ${state.activeTestCaseIndex + 1} of ${totalCount}</span>
        ${existingRec ? `<span class="badge badge-${existingRec.status === 'measured' ? (existingRec.in_range ? 'measured' : 'skipped') : 'skipped'}">${existingRec.status.toUpperCase()}</span>` : ''}
      </div>

      <h3 style="font-size: 16px; margin: 0 0 2px 0; color: var(--text-primary);">${activeCase.id}</h3>
      <h4 style="font-size: 14px; margin: 0 0 4px 0; color: var(--text-primary); font-weight: 600;">${activeCase.name}</h4>
      <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">${activeCase.description || 'No description provided.'}</div>

      <div style="background: var(--bg-tertiary); padding: 10px; border-radius: var(--radius-sm); margin-bottom: 14px;">
        <div style="font-size: 11px; color: var(--text-muted);">EXPECTED RANGE</div>
        <div style="font-size: 15px; font-weight: 700; color: var(--accent-cyan);">
          ${minDisplay} to ${maxDisplay}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; margin-bottom: 16px;">
        <div style="background: rgba(255, 71, 87, 0.1); padding: 8px; border-radius: 6px; color: #ff6b81;">
          🔴 POS (+): <strong>${activeCase.probe_positive.ref}</strong>
        </div>
        <div style="background: rgba(40, 40, 40, 0.3); padding: 8px; border-radius: 6px; color: #aaa;">
          ⚫ NEG (-): <strong>${activeCase.probe_negative.ref}</strong>
        </div>
      </div>

      <div class="input-group">
        <label class="input-label">Measured Value (${activeCase.prefix}${activeCase.unit})</label>
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
        <button class="btn btn-secondary" id="btn-prev" ${state.activeTestCaseIndex === 0 ? 'disabled' : ''}>◄ Prev</button>
        <button class="btn btn-secondary" id="btn-next" ${state.activeTestCaseIndex === totalCount - 1 ? 'disabled' : ''}>Next ►</button>
      </div>
    `;

    content.appendChild(caseCard);

    this.renderTestList(state, content);

    this.container.appendChild(content);

    setTimeout(() => {
      const valIn    = caseCard.querySelector('#val-input');
      const notesIn  = caseCard.querySelector('#notes-input');
      const submitBtn = caseCard.querySelector('#btn-submit');
      const skipBtn  = caseCard.querySelector('#btn-skip');
      const prevBtn  = caseCard.querySelector('#btn-prev');
      const nextBtn  = caseCard.querySelector('#btn-next');

      if (submitBtn) submitBtn.addEventListener('click', () => this.recordMeasurement(activeCase.id, valIn.value, notesIn.value));
      if (skipBtn)   skipBtn.addEventListener('click',   () => this.skipMeasurement(activeCase.id, notesIn.value));
      if (prevBtn)   prevBtn.addEventListener('click',   () => setState({ activeTestCaseIndex: Math.max(0, state.activeTestCaseIndex - 1) }));
      if (nextBtn)   nextBtn.addEventListener('click',   () => setState({ activeTestCaseIndex: Math.min(totalCount - 1, state.activeTestCaseIndex + 1) }));
    }, 0);
  }
}
