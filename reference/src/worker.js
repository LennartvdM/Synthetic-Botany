import { build } from './world.js';
self.onmessage = (e) => {
  const { id, job } = e.data;
  if (job === 'ping') { self.postMessage({ id, pong: true }); return; }
  try {
    const r = build(job, (msg) => self.postMessage({ id, progress: msg }));
    self.postMessage({ id, result: r }, [r.pos.buffer, r.nrm.buffer, r.ao.buffer, r.idx.buffer]);
  } catch (err) {
    self.postMessage({ id, error: String((err && err.stack) || err) });
  }
};
