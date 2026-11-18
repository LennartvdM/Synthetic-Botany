import { build } from '../src/world.js';
for (const kind of ['halls', 'sponge', 'geode']) {
  const m = build({ mode: 'cavern', kind, seed: 3, count: 30 }, (s) => {});
  console.log(kind, JSON.stringify(m.stats), 'stands', m.stands.length, 'open', m.views.map((v) => v.open).join(','));
}
