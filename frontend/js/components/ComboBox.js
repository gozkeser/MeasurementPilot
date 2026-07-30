export function ComboBox({ label, value = '', options = [], placeholder = 'Select point...', onSelect }) {
  const container = document.createElement('div');
  container.className = 'input-group';
  container.style.position = 'relative';

  if (label) {
    const lbl = document.createElement('label');
    lbl.className = 'input-label';
    lbl.textContent = label;
    container.appendChild(lbl);
  }

  const wrapper = document.createElement('div');
  wrapper.style.position = 'relative';
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'input-field';
  input.placeholder = placeholder;
  input.value = value;
  input.style.width = '100%';
  input.style.paddingRight = '30px';

  const arrow = document.createElement('span');
  arrow.textContent = '▼';
  arrow.style.position = 'absolute';
  arrow.style.right = '10px';
  arrow.style.fontSize = '10px';
  arrow.style.color = 'var(--text-muted)';
  arrow.style.cursor = 'pointer';

  wrapper.appendChild(input);
  wrapper.appendChild(arrow);
  container.appendChild(wrapper);

  const dropdown = document.createElement('div');
  dropdown.style.position = 'absolute';
  dropdown.style.top = '100%';
  dropdown.style.left = '0';
  dropdown.style.right = '0';
  dropdown.style.maxHeight = '160px';
  dropdown.style.overflowY = 'auto';
  dropdown.style.background = 'var(--bg-secondary)';
  dropdown.style.border = '1px solid var(--border-color)';
  dropdown.style.borderRadius = 'var(--radius-sm)';
  dropdown.style.boxShadow = 'var(--shadow-glass)';
  dropdown.style.zIndex = '1000';
  dropdown.style.display = 'none';
  dropdown.style.marginTop = '4px';

  container.appendChild(dropdown);

  const renderDropdown = (query = '') => {
    dropdown.innerHTML = '';
    const q = query.toLowerCase().trim();
    const filtered = options.filter(opt => {
      const txt = typeof opt === 'string' ? opt : `${opt.label} ${opt.sub || ''} ${opt.id || ''}`;
      return !q || txt.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.style.padding = '8px 12px';
      empty.style.fontSize = '12px';
      empty.style.color = 'var(--text-muted)';
      empty.textContent = 'No matching options';
      dropdown.appendChild(empty);
    } else {
      filtered.forEach(opt => {
        const item = document.createElement('div');
        item.style.padding = '6px 12px';
        item.style.fontSize = '12px';
        item.style.cursor = 'pointer';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.borderBottom = '1px solid var(--border-color)';

        const labelText = typeof opt === 'string' ? opt : opt.label;
        const subText = typeof opt === 'string' ? '' : (opt.sub || '');
        const valText = typeof opt === 'string' ? opt : (opt.id || opt.value);

        item.innerHTML = `
          <span><strong>${labelText}</strong></span>
          <span style="color: var(--text-muted); font-size: 11px;">${subText}</span>
        `;

        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          input.value = valText;
          dropdown.style.display = 'none';
          if (onSelect) onSelect(opt);
        });

        dropdown.appendChild(item);
      });
    }
    dropdown.style.display = 'block';
  };

  input.addEventListener('focus', () => renderDropdown(input.value));
  input.addEventListener('input', () => {
    if (onSelect) onSelect({ source: 'TPR', id: input.value, value: input.value });
    renderDropdown(input.value);
  });
  arrow.addEventListener('click', () => {
    if (dropdown.style.display === 'block') {
      dropdown.style.display = 'none';
    } else {
      renderDropdown(input.value);
    }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => { dropdown.style.display = 'none'; }, 200);
  });

  return container;
}
