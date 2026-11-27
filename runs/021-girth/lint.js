// a comment put at the end of a line that still has code after it silently deletes that code.
// This has broken the build nine times. Check for it before every render.
const fs = require('fs');
let bad = 0;
for (const f of ['trees.js', 'sketch/page5.js', 'sketch/page7.js', 'sketch/page9.js', 'sketch/page11.js']) {
  fs.readFileSync('/home/user/synthetic-botany/' + f, 'utf8').split('\n').forEach((line, i) => {
    const m = line.indexOf('//'); if (m < 0) return;
    // a comment is fine at the start of a line, or at the end of a complete statement
    const before = line.slice(0, m).trim(); if (!before) return;
    // A comment must be the end of its line: code put after one is swallowed. This check has to come FIRST --
    // it used to sit after the early return below, so every accident where the comment followed a COMPLETE
    // statement and swallowed the next one went unseen. That is the shape of all nine of them.
    const after = line.slice(m + 2);
    const looksLikeCode = /\b(for|if|while|switch|catch)\s*\(/.test(after) ||
      /\b(const|let|var)\s+[A-Za-z_$][\w$]*\s*=/.test(after) ||
      /\bfunction\s*[A-Za-z_$]*\s*\(/.test(after) ||
      /\breturn\s+[\w[{(]/.test(after);
    if (looksLikeCode) {
      console.log(f + ':' + (i + 1) + ' code after a comment: ' + after.trim().slice(0, 70)); bad++; return; }
    if (/[;{},]$/.test(before)) return;
    console.log(f + ':' + (i + 1) + ' comment after unfinished code: ' + before.slice(-60)); bad++; });
}
process.exit(bad ? 1 : 0);
