export function TextInput({ label, value = '', placeholder = '', type = 'text', suffix = '', onChange }) {
  const group = document.createElement('div');
  group.className = 'input-group';

  if (label) {
    const lbl = document.createElement('label');
    lbl.className = 'input-label';
    lbl.textContent = label;
    group.appendChild(lbl);
  }

  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = '8px';

  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  input.placeholder = placeholder;
  input.className = 'input-field';
  input.style.flex = '1';

  if (onChange) {
    input.addEventListener('input', (e) => onChange(e.target.value));
  }

  wrapper.appendChild(input);

  if (suffix) {
    const suf = document.createElement('span');
    suf.style.fontSize = '12px';
    suf.style.color = 'var(--text-muted)';
    suf.textContent = suffix;
    wrapper.appendChild(suf);
  }

  group.appendChild(wrapper);
  return group;
}
