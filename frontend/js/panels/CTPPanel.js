import { getState, setState, subscribe } from '../state/store.js';
import { api } from '../api/client.js';
import { showModal } from '../components/Modal.js';
import { TextInput } from '../components/TextInput.js';
import { showToast } from '../components/Toast.js';

export class CTPPanel {
  constructor(containerEl, canvasEngine) {
    this.container = containerEl;
    this.engine = canvasEngine;
    this.placementMode = false;

    subscribe((state) => {
      if (state.mode === 'ctp') {
        this.render(state);
      } else {
        if (this.placementMode) {
          this.placementMode = false;
          this.engine.setCustomCursor(null);
        }
      }
    });

    this.engine.onClickCallback = (cx, cy, e) => {
      const state = getState();
      if (state.mode === 'ctp' && this.placementMode) {
        this.handleCanvasClick(cx, cy);
      }
    };
  }

  async handleCanvasClick(cx, cy) {
    const state = getState();
    try {
      const mmCoords = await api.transform.pxToMm(state.activeLayer, cx, cy);
      this.openCTPModal(mmCoords.x_mm, mmCoords.y_mm);
    } catch (e) {
      showToast(e.message || 'Error converting coordinates', 'error');
    }
  }

  openCTPModal(x_mm, y_mm, existing = null) {
    const state = getState();
    const form = document.createElement('form');

    let nameVal = existing ? existing.name : '';
    let netVal = existing ? existing.net : '';
    let notesVal = existing ? existing.notes : '';

    form.appendChild(TextInput({
      label: 'CTP Name',
      value: nameVal,
      placeholder: 'e.g. CTP-VDD-01',
      onChange: (v) => nameVal = v
    }));

    form.appendChild(TextInput({
      label: 'Net Name',
      value: netVal,
      placeholder: 'e.g. VCC_3V3',
      onChange: (v) => netVal = v
    }));

    form.appendChild(TextInput({
      label: 'Notes',
      value: notesVal,
      placeholder: 'Optional notes',
      onChange: (v) => notesVal = v
    }));

    const coordLabel = document.createElement('div');
    coordLabel.style.fontSize = '12px';
    coordLabel.style.color = 'var(--text-muted)';
    coordLabel.style.marginTop = '8px';
    coordLabel.textContent = `Coordinates: X=${x_mm.toFixed(3)} mm | Y=${y_mm.toFixed(3)} mm (${state.activeLayer})`;
    form.appendChild(coordLabel);

    showModal({
      title: existing ? 'Edit CTP' : 'Create Custom Test Point (CTP)',
      bodyEl: form,
      actions: [
        { label: 'Cancel', variant: 'secondary' },
        {
          label: 'Save CTP',
          variant: 'primary',
          onClick: async () => {
            try {
              if (existing) {
                await api.ctps.update(existing.id, { name: nameVal, net: netVal, notes: notesVal, x_mm, y_mm, side: state.activeLayer });
                showToast(`Updated ${existing.id}`, 'success');
              } else {
                await api.ctps.create({ name: nameVal, net: netVal, notes: notesVal, x_mm, y_mm, side: state.activeLayer });
                showToast('CTP created successfully', 'success');
              }
              this.placementMode = false;
              this.engine.setCustomCursor(null);
              this.refreshCTPs();
            } catch (err) {
              showToast(err.message || 'Failed to save CTP', 'error');
            }
          }
        }
      ]
    });
  }

  async refreshCTPs() {
    try {
      const ctps = await api.ctps.list();
      setState({ loadedCTPs: ctps });
    } catch (e) {}
  }

  render(state) {
    this.container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `<span>CTP Management</span>`;
    this.container.appendChild(header);

    const content = document.createElement('div');
    content.className = 'panel-content';

    const btnAdd = document.createElement('button');
    btnAdd.className = `btn ${this.placementMode ? 'btn-danger' : 'btn-primary'}`;
    btnAdd.style.width = '100%';
    btnAdd.style.marginBottom = '16px';
    btnAdd.innerHTML = this.placementMode ? '❌ Cancel Placement' : '➕ Click Canvas to Add CTP';

    btnAdd.addEventListener('click', () => {
      this.placementMode = !this.placementMode;
      if (this.placementMode) {
        this.engine.setCustomCursor('crosshair');
        showToast('Click anywhere on the PCB canvas to place a CTP', 'info');
      } else {
        this.engine.setCustomCursor(null);
      }
      this.render(getState());
    });

    content.appendChild(btnAdd);

    const titleList = document.createElement('div');
    titleList.style.fontSize = '13px';
    titleList.style.fontWeight = '600';
    titleList.style.marginBottom = '8px';
    titleList.textContent = `Defined CTPs (${(state.loadedCTPs || []).length})`;
    content.appendChild(titleList);

    (state.loadedCTPs || []).forEach(ctp => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.display = 'flex';
      card.style.justifyContent = 'space-between';
      card.style.alignItems = 'center';

      card.innerHTML = `
        <div>
          <strong style="color: var(--accent-orange); font-size: 14px;">${ctp.name}</strong>
          <div style="font-size: 11px; color: var(--text-muted);">${ctp.net || 'No Net'} | ${ctp.side}</div>
          <div style="font-size: 11px; color: var(--text-secondary);">X: ${ctp.x_mm.toFixed(2)} | Y: ${ctp.y_mm.toFixed(2)}</div>
        </div>
        <div style="display: flex; gap: 4px;">
          <button class="btn btn-icon btn-edit" title="Edit">✏️</button>
          <button class="btn btn-icon btn-del" title="Delete" style="color: var(--accent-red);">🗑️</button>
        </div>
      `;

      card.querySelector('.btn-edit').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openCTPModal(ctp.x_mm, ctp.y_mm, ctp);
      });

      card.querySelector('.btn-del').addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await api.ctps.del(ctp.id);
          showToast(`Deleted ${ctp.name}`, 'info');
          this.refreshCTPs();
        } catch (err) {
          showToast(err.message || 'Failed to delete CTP', 'error');
        }
      });

      content.appendChild(card);
    });

    this.container.appendChild(content);
  }
}
