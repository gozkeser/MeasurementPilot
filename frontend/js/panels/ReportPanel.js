import { getState, subscribe } from '../state/store.js';
import { api } from '../api/client.js';
import { TextInput } from '../components/TextInput.js';
import { Dropdown } from '../components/Dropdown.js';
import { showToast } from '../components/Toast.js';

export class ReportPanel {
  constructor(containerEl) {
    this.container = containerEl;
    this.sessionsList = [];

    subscribe((state) => {
      if (state.mode === 'report') {
        this.render(state);
      }
    });
  }

  async fetchSessions() {
    try {
      this.sessionsList = await api.measurement.sessions();
      this.render(getState());
    } catch (e) {
      console.error(e);
    }
  }

  render(state) {
    this.container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `<span>Report Generation</span>`;
    this.container.appendChild(header);

    const content = document.createElement('div');
    content.className = 'panel-content';

    if (this.sessionsList.length === 0) {
      this.fetchSessions();
    }

    const sessOptions = this.sessionsList.map(s => ({
      value: s.session_id,
      label: `${s.session_id} (${s.operator} - ${s.record_count} records)`
    }));

    let selectedSessionId = state.activeSession?.session_id || (sessOptions[0]?.value || '');
    let orgVal = 'Electronics QA Lab';
    let deptVal = 'Quality Control';
    let locVal = 'Bench #1';

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h3 style="margin: 0 0 12px 0; font-size: 15px; color: var(--accent-cyan);">Test Record Settings</h3>`;

    card.appendChild(Dropdown({
      label: 'Select Measurement Session',
      options: sessOptions.length > 0 ? sessOptions : [{ value: '', label: 'No sessions recorded yet' }],
      selected: selectedSessionId,
      onSelect: (v) => selectedSessionId = v
    }));

    card.appendChild(TextInput({
      label: 'Organization',
      value: orgVal,
      onChange: (v) => orgVal = v
    }));

    card.appendChild(TextInput({
      label: 'Department',
      value: deptVal,
      onChange: (v) => deptVal = v
    }));

    card.appendChild(TextInput({
      label: 'Location',
      value: locVal,
      onChange: (v) => locVal = v
    }));

    const btnGen = document.createElement('button');
    btnGen.className = 'btn btn-primary';
    btnGen.style.width = '100%';
    btnGen.style.marginTop = '16px';
    btnGen.innerHTML = '📄 Generate HTML Test Report';

    btnGen.addEventListener('click', async () => {
      if (!selectedSessionId) {
        showToast('Please select a measurement session first', 'error');
        return;
      }

      try {
        showToast('Generating HTML report...', 'info');
        const res = await api.report.generate(selectedSessionId, {
          organization: orgVal,
          department: deptVal,
          location: locVal
        });

        showToast('Report generated successfully!', 'success');

        const resultCard = document.createElement('div');
        resultCard.className = 'card';
        resultCard.style.border = '1px solid var(--accent-green)';
        resultCard.style.marginTop = '16px';
        resultCard.innerHTML = `
          <div style="color: var(--accent-green); font-weight: 600; margin-bottom: 8px;">✅ Test Record Ready</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">Filename: <code>${res.report_filename}</code></div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <a href="${api.report.viewUrl(res.report_filename)}" target="_blank" class="btn btn-primary" style="text-decoration: none; text-align: center; font-size: 12px;">👁️ View HTML Report (New Tab)</a>
            <a href="${api.report.downloadUrl(res.report_filename)}" download class="btn btn-secondary" style="text-decoration: none; text-align: center; font-size: 12px;">⬇️ Download Report File</a>
          </div>
        `;
        content.appendChild(resultCard);
      } catch (err) {
        showToast(err.message || 'Failed to generate report', 'error');
      }
    });

    card.appendChild(btnGen);
    content.appendChild(card);
    this.container.appendChild(content);
  }
}
