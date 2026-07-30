import { getState, setState, subscribe } from '../state/store.js';
import { api } from '../api/client.js';
import { showModal } from '../components/Modal.js';
import { TextInput } from '../components/TextInput.js';
import { Dropdown } from '../components/Dropdown.js';
import { ComboBox } from '../components/ComboBox.js';
import { getUnitSuggestions } from '../utils/units.js';
import { showToast } from '../components/Toast.js';

export class PlanningPanel {
  constructor(containerEl, canvasEngine) {
    this.container = containerEl;
    this.engine = canvasEngine;

    subscribe((state) => {
      if (state.mode === 'plan') {
        this.render(state);
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
    let minVal = existing ? existing.expected_min : 0.0;
    let maxVal = existing ? existing.expected_max : 5.0;
    let unitVal = existing ? existing.unit : 'V';
    let prefixVal = existing ? existing.prefix : '';

    let posSource = existing ? existing.probe_positive.source : 'TPR';
    let posRef = existing ? existing.probe_positive.ref : '';

    let negSource = existing ? existing.probe_negative.source : 'TPR';
    let negRef = existing ? existing.probe_negative.ref : '';

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
      { value: 'DC_VOLTAGE', label: 'DC Voltage (V)' },
      { value: 'AC_VOLTAGE', label: 'AC Voltage (V)' },
      { value: 'RESISTANCE', label: 'Resistance (Ω)' },
      { value: 'FREQUENCY', label: 'Frequency (Hz)' },
      { value: 'DIODE', label: 'Diode Test (V)' },
      { value: 'CONTINUITY', label: 'Continuity' }
    ];

    form.appendChild(Dropdown({
      label: 'Measurement Type',
      options: types,
      selected: mTypeVal,
      onSelect: (v) => {
        mTypeVal = v;
        const sugs = getUnitSuggestions(v);
        unitVal = sugs.defaultUnit;
        prefixVal = sugs.defaultPrefix;
      }
    }));

    const rangeRow = document.createElement('div');
    rangeRow.style.display = 'grid';
    rangeRow.style.gridTemplateColumns = '1fr 1fr';
    rangeRow.style.gap = '10px';

    rangeRow.appendChild(TextInput({
      label: 'Expected Min',
      value: minVal,
      type: 'number',
      onChange: (v) => minVal = parseFloat(v) || 0
    }));

    rangeRow.appendChild(TextInput({
      label: 'Expected Max',
      value: maxVal,
      type: 'number',
      onChange: (v) => maxVal = parseFloat(v) || 0
    }));

    form.appendChild(rangeRow);

    // reuse state declared above
    const allOptions = [];
    (state.loadedTPs || []).forEach(tp => allOptions.push({ source: 'TPR', id: tp.id, label: `[TPR] ${tp.id}`, sub: tp.net || '' }));
    (state.loadedCTPs || []).forEach(ctp => allOptions.push({ source: 'CTP', id: ctp.id, label: `[CTP] ${ctp.name}`, sub: ctp.net || '' }));
    (state.loadedComponents || []).forEach(c => allOptions.push({ source: 'PPL', id: c.designator, label: `[PPL] ${c.designator}`, sub: c.comment || '' }));

    form.appendChild(ComboBox({
      label: '🔴 Positive Probe Point (+)',
      value: posRef,
      options: allOptions,
      placeholder: 'Search point (e.g. TP1, CTP-1, FD1)...',
      onSelect: (opt) => {
        posSource = opt.source || 'TPR';
        posRef = opt.id || opt.value || '';
      }
    }));

    form.appendChild(ComboBox({
      label: '🟢 Negative Probe Point (-)',
      value: negRef,
      options: allOptions,
      placeholder: 'Search point (e.g. TP2, GND)...',
      onSelect: (opt) => {
        negSource = opt.source || 'TPR';
        negRef = opt.id || opt.value || '';
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
            const caseData = {
              id: existing ? existing.id : '',
              name: nameVal,
              description: descVal,
              measurement_type: mTypeVal,
              expected_min: minVal,
              expected_max: maxVal,
              unit: unitVal,
              prefix: prefixVal,
              probe_positive: { source: posSource, ref: posRef },
              probe_negative: { source: negSource, ref: negRef }
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

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: var(--accent-cyan); font-size: 14px;">#${idx + 1} — ${tc.name}</strong>
            <div style="display: flex; gap: 4px;">
              <button class="btn btn-icon btn-edit" title="Edit">✏️</button>
              <button class="btn btn-icon btn-del" title="Delete" style="color: var(--accent-red);">🗑️</button>
            </div>
          </div>
          <div style="font-size: 12px; color: var(--text-secondary);">${tc.description || 'No description'}</div>
          <div style="font-size: 12px; background: rgba(255,255,255,0.04); padding: 6px 10px; border-radius: 6px;">
            Expected Range: <strong>${tc.expected_min} to ${tc.expected_max} ${tc.prefix}${tc.unit}</strong>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
            <div style="color: var(--accent-red);">🔴 (+) ${tc.probe_positive.source}:${tc.probe_positive.ref}</div>
            <div style="color: var(--accent-green);">🟢 (-) ${tc.probe_negative.source}:${tc.probe_negative.ref}</div>
          </div>
        `;

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
