export function Button({ label, variant = 'secondary', icon = '', onClick }) {
  const btn = document.createElement('button');
  btn.className = `btn btn-${variant}`;
  if (icon) {
    btn.innerHTML = `<span>${icon}</span><span>${label}</span>`;
  } else {
    btn.textContent = label;
  }
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}
