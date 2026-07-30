import { Button } from './Button.js';

export function showModal({ title, bodyEl, actions = [], onClose }) {
  const container = document.getElementById('modal-container');
  if (!container) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const box = document.createElement('div');
  box.className = 'modal-box';

  const header = document.createElement('div');
  header.className = 'modal-header';
  header.innerHTML = `<span>${title}</span>`;

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '✕';
  closeBtn.style.fontSize = '16px';
  closeBtn.style.color = 'var(--text-muted)';
  closeBtn.addEventListener('click', close);
  header.appendChild(closeBtn);

  box.appendChild(header);

  if (bodyEl) {
    box.appendChild(bodyEl);
  }

  if (actions.length > 0) {
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    actions.forEach(act => {
      const btn = Button({
        label: act.label,
        variant: act.variant || 'secondary',
        onClick: () => {
          if (act.onClick) act.onClick();
          close();
        }
      });
      footer.appendChild(btn);
    });
    box.appendChild(footer);
  }

  overlay.appendChild(box);
  container.appendChild(overlay);

  requestAnimationFrame(() => overlay.classList.add('active'));

  function close() {
    overlay.classList.remove('active');
    setTimeout(() => {
      overlay.remove();
      if (onClose) onClose();
    }, 200);
  }

  return { close };
}
