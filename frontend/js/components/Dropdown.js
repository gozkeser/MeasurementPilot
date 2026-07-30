export function Dropdown({ label, options = [], selected = '', onSelect }) {
  const group = document.createElement('div');
  group.className = 'input-group';

  if (label) {
    const lbl = document.createElement('label');
    lbl.className = 'input-label';
    lbl.textContent = label;
    group.appendChild(lbl);
  }

  const select = document.createElement('select');
  select.className = 'input-field';

  options.forEach(opt => {
    const val = typeof opt === 'object' ? opt.value : opt;
    const txt = typeof opt === 'object' ? opt.label : opt;
    const optionEl = document.createElement('option');
    optionEl.value = val;
    optionEl.textContent = txt;
    if (val === selected) optionEl.selected = true;
    select.appendChild(optionEl);
  });

  if (onSelect) {
    select.addEventListener('change', (e) => onSelect(e.target.value));
  }

  group.appendChild(select);
  return group;
}
