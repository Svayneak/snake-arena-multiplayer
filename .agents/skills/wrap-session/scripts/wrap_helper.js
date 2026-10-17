/**
 * Helper script for /wrap-session skill
 * Ensures 'performance and systems' directory exists and returns the next session index [n] for today,
 * including paths for prompt-log, day-results, error-log, decisionlog, and project changelog.
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const PERF_DIR = path.join(WORKSPACE_ROOT, 'performance and systems');

function getNextSessionNumber(dateStr) {
  if (!fs.existsSync(PERF_DIR)) {
    fs.mkdirSync(PERF_DIR, { recursive: true });
    return 1;
  }
  const files = fs.readdirSync(PERF_DIR);
  let maxN = 0;
  const escapedDate = dateStr.replace(/[-]/g, '\\-');
  const regex = new RegExp(`(?:prompt-log|day-results|error-log|decisionlog)\\[?${escapedDate}\\]?[-_\\[]?(\\d+)\\]?\\.md$`, 'i');

  for (const f of files) {
    const match = f.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxN) {
        maxN = num;
      }
    }
  }
  return maxN + 1;
}

if (require.main === module) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateStr = process.argv[2] || `${yyyy}-${mm}-${dd}`;
  const projectDir = process.argv[3] || 'snake-next';
  const nextN = getNextSessionNumber(dateStr);

  console.log(JSON.stringify({
    workspaceRoot: WORKSPACE_ROOT,
    performanceDir: PERF_DIR,
    date: dateStr,
    sessionNumber: nextN,
    files: {
      promptLog: path.join(PERF_DIR, `prompt-log[${dateStr}][${nextN}].md`),
      dayResults: path.join(PERF_DIR, `day-results[${dateStr}][${nextN}].md`),
      errorLog: path.join(PERF_DIR, `error-log[${dateStr}][${nextN}].md`),
      decisionLogSession: path.join(PERF_DIR, `decisionlog[${dateStr}][${nextN}].md`),
      decisionLogGlobal: path.join(PERF_DIR, 'decisionlog.md'),
      projectDecisionLog: path.join(WORKSPACE_ROOT, projectDir, 'decisionlog.md'),
      projectDocsDecisionLog: path.join(WORKSPACE_ROOT, projectDir, 'docs', 'decisionlog.md'),
      projectChangelog: path.join(WORKSPACE_ROOT, projectDir, 'changelog.md'),
      projectDocsChangelog: path.join(WORKSPACE_ROOT, projectDir, 'docs', 'changelog.md')
    }
  }, null, 2));
}

module.exports = { getNextSessionNumber, PERF_DIR };
