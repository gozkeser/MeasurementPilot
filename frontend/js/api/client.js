const BASE = '/api/v1';

function toQS(params) {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      searchParams.append(k, v);
    }
  }
  const str = searchParams.toString();
  return str ? '?' + str : '';
}

async function req(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    let errData;
    try {
      errData = await res.json();
    } catch (e) {
      errData = { message: `HTTP Error ${res.status}: ${res.statusText}` };
    }
    throw errData;
  }
  return res.json();
}

export const api = {
  project: {
    load: (formData) => fetch(BASE + '/project/load', { method: 'POST', body: formData }).then(r => {
      if (!r.ok) return r.json().then(e => { throw e; });
      return r.json();
    }),
    info: () => req('GET', '/project/info'),
    image: (layer) => `${BASE}/project/image/${layer}`,
    setActiveLayer: (layer) => req('PUT', `/project/active-layer/${layer}`),
    exportUrl: () => `${BASE}/project/export`
  },
  components: {
    list: (params) => req('GET', '/components' + toQS(params))
  },
  testpoints: {
    list: (params) => req('GET', '/testpoints' + toQS(params))
  },
  transform: {
    mmToPx: (layer, x_mm, y_mm) => req('POST', '/transform/mm-to-px', { layer, x_mm, y_mm }),
    pxToMm: (layer, x_px, y_px) => req('POST', '/transform/px-to-mm', { layer, x_px, y_px }),
    batch: (layer, points) => req('POST', '/transform/batch', { layer, points })
  },
  ctps: {
    list: () => req('GET', '/ctps'),
    create: (data) => req('POST', '/ctps', data),
    update: (id, data) => req('PUT', `/ctps/${id}`, data),
    del: (id) => req('DELETE', `/ctps/${id}`)
  },
  tcd: {
    get: () => req('GET', '/tcd'),
    getResolved: (layer) => req('GET', '/tcd/resolved' + toQS({ layer })),
    addCase: (data) => req('POST', '/tcd/cases', data),
    updateCase: (id, data) => req('PUT', `/tcd/cases/${id}`, data),
    deleteCase: (id) => req('DELETE', `/tcd/cases/${id}`),
    reorder: (ids) => req('PUT', '/tcd/reorder', { order: ids })
  },
  measurement: {
    startSession: (operator) => req('POST', '/measurement/session', { operator }),
    record: (sid, data) => req('POST', `/measurement/${sid}/record`, data),
    skip: (sid, tcid, notes) => req('PUT', `/measurement/${sid}/skip/${tcid}`, { notes }),
    get: (sid) => req('GET', `/measurement/${sid}`),
    sessions: () => req('GET', '/measurement/sessions')
  },
  report: {
    generate: (sessionId, metadata) => req('POST', '/report/generate', { session_id: sessionId, metadata }),
    viewUrl: (filename) => `${BASE}/report/view/${filename}`,
    downloadUrl: (filename) => `${BASE}/report/download/${filename}`
  },
  settings: {
    get: () => req('GET', '/settings'),
    update: (patch) => req('PUT', '/settings', patch)
  }
};
