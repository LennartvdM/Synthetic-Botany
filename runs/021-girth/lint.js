// a comment put at the end of a line that still has code after it silently deletes that code.
// This has broken the build five times. Check for it before every render.
const fs = require('fs');
let bad = 0;
for (const f of ['trees.js', 'sketch/page5.js', 'sketch/page7.js', 'sketch/page9.js', 'sketch/page11.js']) {
  fs.readFileSync('/home/user/synthetic-botany/' + f, 'utf8').split('\n').forEach((line, i) => {
    const m = line.indexOf('//'); if (m < 0) return;
    // a comment is fine at the start of a line, or at the end of a complete statement
    const before = line.slice(0, m).trim(); if (!before) return;
    if (/[;{},]$/.test(before)) return;
    // and a comment must be the end of the line: code put AFTER one is swallowed just the same
    const after = line.slice(m + 2); if (/[{}()[];]/.test(after)) { console.log(f + ':' + (i + 1) + ' code after a comment: ' + after.slice(-40)); bad++; }
    console.log(f + ':' + (i + 1) + ' comment after unfinished code: ' + before.slice(-60)); bad++; });
}
process.exit(bad ? 1 : 0);
