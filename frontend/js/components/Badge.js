export function Badge({ text, variant = 'pending' }) {
  const span = document.createElement('span');
  span.className = `badge badge-${variant.toLowerCase()}`;
  span.textContent = text;
  return span;
}
