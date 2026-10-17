/**
 * Antigravity Lifecycle Hook: PreToolUse Validator
 * Protocol: Antigravity Hooks (JSON on stdin -> JSON on stdout)
 * 
 * Enforces:
 * - Least Privilege / Default-Ask (Fail-Closed)
 * - Canonical Cwd validation
 * - view_file path protection
 * - Chained command splitting and per-segment validation
 * - Neutralization of Windows / PowerShell evasions (-EncodedCommand, DOS 8.3, wildcards, inline execution)
 */

const path = require('path');

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
    if (process.stdin.isTTY) {
      resolve('');
    }
  });
}

function decodePath(p) {
  try {
    return decodeURIComponent(p);
  } catch {
    return p;
  }
}

function cleanPath(p) {
  if (!p || typeof p !== 'string') return '';
  let cleaned = p.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return decodePath(cleaned);
}

// 1. Personal Folders and protected names (including wildcards and DOS 8.3 short names)
const PERSONAL_FOLDER_PATTERNS = [
  /fotos\s*familia/i,
  /videos\s*grandes(?:\s*de\s*mi\s*celu)?/i,
  // DOS 8.3 short names targeting personal folders
  /\b[a-z0-9_]*(?:fotos|famili|video|celu)[a-z0-9_]*~\d+\b/i,
  /\b(?:fotosf|fotos|videog|videos|celu)~\d+\b/i,
  // Wildcards targeting personal folders
  /\b[a-z0-9_]*fotos[a-z0-9_]*[\*\?]/i,
  /[\*\?][a-z0-9_]*fotos[a-z0-9_]*\b/i,
  /\b[a-z0-9_]*familia[a-z0-9_]*[\*\?]/i,
  /[\*\?][a-z0-9_]*familia[a-z0-9_]*\b/i,
  /\b[a-z0-9_]*celu[a-z0-9_]*[\*\?]/i,
  /[\*\?][a-z0-9_]*celu[a-z0-9_]*\b/i,
  /\bvideos?_?grandes?[\*\?]/i
];

// 2. Sensitive OS / User directories and credential stores
const SENSITIVE_SYSTEM_PATHS = [
  /[c-z]:[\\\/]windows\b/i,
  /[\\\/]windows[\\\/]system32\b/i,
  /%(?:windir|systemroot)%/i,
  /\$env:(?:windir|systemroot)/i,
  /(?:^|[\\\/])\.ssh(?:[\\\/]|$)/i,
  /(?:^|[\\\/])\.aws(?:[\\\/]|$)/i,
  /(?:^|[\\\/])\.gemini(?:[\\\/]|$)/i
];

// 3. Potentially destructive commands
const FORBIDDEN_COMMANDS = [
  /(?:^|[\s;&|`])format(?:\.exe)?(?:\s+|$)/i,
  /(?:^|[\s;&|`])diskpart(?:\.exe)?(?:\s+|$)/i,
  /(?:^|[\s;&|`])bcdedit(?:\.exe)?(?:\s+|$)/i,
  /(?:^|[\s;&|`])takeown(?:\.exe)?(?:\s+|$)/i,
  /(?:^|[\s;&|`])icacls(?:\.exe)?(?:\s+|$)/i,
  /(?:^|[\s;&|`])reg(?:\.exe)?\s+(?:add|delete|restore|import)\b/i,
  /\b(?:rmdir|rd)\b.*?(?:\/s|-s)\b/i,
  /\b(?:del|erase)\b.*?(?:\/s|\/f)\b/i,
  /\brm\s+-[a-z]*r[a-z]*f\s+[\/\\]/i,
  /\bnc(?:at)?(?:\.exe)?\s+.*?-e\b/i,
  /\bset-executionpolicy\b.*?\bunrestricted\b/i
];

// 4. Evasion patterns: PowerShell encoded commands & arbitrary inline execution
const EVASION_PATTERNS = [
  // PowerShell -EncodedCommand variations (-enc, -encoded, -e, etc.)
  {
    regex: /\b(?:powershell|pwsh)(?:\.exe)?\s+.*?(?:-|\/)(?:enc(?:oded(?:command)?)?|e)\b/i,
    reason: 'Uso de comandos codificados de PowerShell (-EncodedCommand / -enc) no permitido.'
  },
  {
    regex: /(?:^|\s)(?:-|\/)(?:enc(?:oded(?:command)?)?)\b/i,
    reason: 'Flag de comando codificado (-enc / -encodedcommand) detectado.'
  },
  // Inline code execution (node -e, python -c, perl -e, ruby -e)
  {
    regex: /\bnode(?:\.exe)?\s+.*?(?:-[ep]|--eval|--print)\b/i,
    reason: 'Ejecución inline arbitraria (node -e / --eval) no permitida.'
  },
  {
    regex: /\b(?:python|python3|py)(?:\.exe)?\s+.*?-c\b/i,
    reason: 'Ejecución inline arbitraria (python -c) no permitida.'
  },
  {
    regex: /\b(?:perl|ruby)(?:\.exe)?\s+.*?-e\b/i,
    reason: 'Ejecución inline arbitraria no permitida.'
  }
];

// 5. Safe development commands whitelist
const SAFE_DEV_PATTERNS = [
  /^npm\s+(?:run|test|build|install|ci|audit|list|exec)\b/i,
  /^pnpm\s+(?:run|test|build|install|add|remove|list|exec)\b/i,
  /^yarn\s+(?:test|build|install|add|run)\b/i,
  /^node\s+(?!-(?:e|p|-eval|-print)\b)[\w\.\/\\-]+(?:\s+.*)?$/i,
  /^npx\s+[\w\.\/\\-]+/i,
  /^python\s+(?:-m\s+(?:venv|pytest|unittest|py_compile)|[\w\.\/\\-]+\.py\b)/i,
  /^pytest\b/i,
  /^pip\s+install\s+-r\b/i,
  /^cargo\s+(?:build|test|check|run|clippy)\b/i,
  /^git\s+(?:status|diff|log|branch|checkout|add|commit|stash|fetch|pull)\b/i,
  /^(?:dir|ls|get-childitem|type|cat|get-content|echo|pwd|ipconfig|hostname|get-netipaddress)\b/i,
  /^(?:grep|findstr|head|tail|sort|uniq|wc)\b/i
];

// 6. Network patterns for detailed prompt reason
const NETWORK_PATTERNS = [
  /\bcurl\b/i,
  /\bwget\b/i,
  /\binvoke-webrequest\b/i,
  /\binvoke-restmethod\b/i
];

function isForbiddenPath(pathOrStr) {
  if (!pathOrStr) return false;
  for (const pattern of PERSONAL_FOLDER_PATTERNS) {
    if (pattern.test(pathOrStr)) return true;
  }
  for (const pattern of SENSITIVE_SYSTEM_PATHS) {
    if (pattern.test(pathOrStr)) return true;
  }
  return false;
}

function validateCwd(cwd) {
  if (!cwd) return { safe: true };
  const cleaned = cleanPath(cwd);
  const resolved = path.resolve(cleaned);

  if (isForbiddenPath(cleaned) || isForbiddenPath(resolved)) {
    return {
      safe: false,
      reason: `[Arnés de Seguridad] Cwd bloqueado: apunta a carpeta personal o ruta protegida (${cwd})`
    };
  }

  return { safe: true };
}

function splitCommand(commandLine) {
  const segments = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escapeNext = false;

  for (let i = 0; i < commandLine.length; i++) {
    const char = commandLine[i];
    const nextChar = commandLine[i + 1] || '';

    if (escapeNext) {
      current += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\' && !inSingleQuote) {
      if (nextChar === '"' || nextChar === "'") {
        escapeNext = true;
        current += char;
        continue;
      }
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote) {
      // 2-character operators: &&, ||
      if ((char === '&' && nextChar === '&') || (char === '|' && nextChar === '|')) {
        if (current.trim()) {
          segments.push(current.trim());
        }
        current = '';
        i++;
        continue;
      }
      // 1-character operators: ;, &, |, \n, \r
      if (char === ';' || char === '&' || char === '|' || char === '\n' || char === '\r') {
        if (current.trim()) {
          segments.push(current.trim());
        }
        current = '';
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) {
    segments.push(current.trim());
  }

  return segments;
}

function validateRunCommand(toolArgs) {
  const commandLine = toolArgs?.CommandLine || '';
  const cwd = toolArgs?.Cwd || '';

  // 1. Canonical Cwd validation
  const cwdCheck = validateCwd(cwd);
  if (!cwdCheck.safe) {
    return {
      decision: 'deny',
      reason: cwdCheck.reason
    };
  }

  if (!commandLine.trim()) {
    return {
      decision: 'ask',
      reason: '[Arnés de Seguridad] Línea de comando vacía o no especificada.'
    };
  }

  // 2. Chained command splitting
  const segments = splitCommand(commandLine);
  if (segments.length === 0) {
    return { decision: 'allow' };
  }

  // 3. Validate EVERY segment against forbidden rules (Fail-Closed / Immediate Deny)
  for (const segment of segments) {
    // 3.1 Check forbidden paths / personal folders / DOS 8.3 / wildcards
    if (isForbiddenPath(segment)) {
      return {
        decision: 'deny',
        reason: `[Arnés de Seguridad] Acceso bloqueado a ruta protegida o carpeta personal en: "${segment}"`
      };
    }

    // 3.2 Check evasion techniques (-EncodedCommand, inline code)
    for (const evasion of EVASION_PATTERNS) {
      if (evasion.regex.test(segment)) {
        return {
          decision: 'deny',
          reason: `[Arnés de Seguridad] Intento de evasión detectado (${evasion.reason}) en: "${segment}"`
        };
      }
    }

    // 3.3 Check destructive commands
    for (const cmdRegex of FORBIDDEN_COMMANDS) {
      if (cmdRegex.test(segment)) {
        return {
          decision: 'deny',
          reason: `[Arnés de Seguridad] Comando destructivo del sistema detectado: "${segment}"`
        };
      }
    }
  }

  // 4. Validate segments against Safe Dev Whitelist (Principle of Least Privilege / Default-Ask)
  for (const segment of segments) {
    let isSafe = false;
    for (const safeRegex of SAFE_DEV_PATTERNS) {
      if (safeRegex.test(segment)) {
        isSafe = true;
        break;
      }
    }

    if (!isSafe) {
      // Check if it matches network patterns for informative reason
      const isNetwork = NETWORK_PATTERNS.some(p => p.test(segment));
      return {
        decision: 'ask',
        reason: isNetwork
          ? `[Arnés de Seguridad] El comando involucra red o descargas no verificadas: "${segment}". ¿Deseas autorizarlo?`
          : `[Arnés de Seguridad] El comando no pertenece a la lista blanca de desarrollo seguro (default-ask): "${segment}". ¿Deseas autorizarlo?`
      };
    }
  }

  // All segments passed all checks and are in safe whitelist
  return { decision: 'allow' };
}

function validateViewFile(toolArgs) {
  const filePath = toolArgs?.AbsolutePath || toolArgs?.TargetFile || '';
  if (!filePath.trim()) {
    return {
      decision: 'ask',
      reason: '[Arnés de Seguridad] Ruta de archivo vacía en view_file.'
    };
  }

  const cleaned = cleanPath(filePath);
  const resolved = path.resolve(cleaned);

  if (isForbiddenPath(cleaned) || isForbiddenPath(resolved)) {
    return {
      decision: 'deny',
      reason: `[Arnés de Seguridad] Lectura bloqueada: intento de acceso a ruta protegida o carpeta personal (${filePath})`
    };
  }

  // Legitimate file read within project or safe paths
  return { decision: 'allow' };
}

async function main() {
  const rawInput = await readStdin();
  if (!rawInput.trim()) {
    process.stdout.write(JSON.stringify({ decision: 'allow' }) + '\n');
    return;
  }

  let payload;
  try {
    payload = JSON.parse(rawInput);
  } catch (err) {
    process.stdout.write(JSON.stringify({
      decision: 'ask',
      reason: 'No se pudo decodificar el payload JSON de la herramienta; se requiere confirmación manual.'
    }) + '\n');
    return;
  }

  const toolName = payload.toolCall?.name || '';
  const toolArgs = payload.toolCall?.args || {};

  let result;
  if (toolName === 'run_command') {
    result = validateRunCommand(toolArgs);
  } else if (toolName === 'view_file') {
    result = validateViewFile(toolArgs);
  } else {
    // Other tools not gated by this hook
    result = { decision: 'allow' };
  }

  process.stdout.write(JSON.stringify(result) + '\n');
}

if (require.main === module) {
  main().catch((err) => {
    process.stdout.write(JSON.stringify({
      decision: 'ask',
      reason: `Error interno en el validador del arnés: ${err.message}`
    }) + '\n');
  });
}

module.exports = {
  splitCommand,
  isForbiddenPath,
  validateCwd,
  validateRunCommand,
  validateViewFile
};
