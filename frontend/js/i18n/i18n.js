let _lang = 'en';
let _dict = {};

export function setLang(lang, dict) {
  _lang = lang;
  _dict = dict;
  translateDOM();
}

export function t(key, vars = {}) {
  let str = _dict[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(`{${k}}`, v);
  }
  return str;
}

export function translateDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
}
