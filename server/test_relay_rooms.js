/**
 * Automated Verification: Snake Arena Multi-Room & Token Protocol Test
 */

const { RoomManager } = require('./relay.js');

async function runUnitProtocolTests() {
  console.log('🧪 Iniciando pruebas unitarias de protocolo multi-sala y tokens...');

  const roomManager = new RoomManager();

  let passed = 0;
  let total = 0;

  function assert(condition, desc) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
    }
  }

  // TEST 1: Creación de salas dinámicas
  const roomA = roomManager.getOrCreateRoom('ARENA-100');
  const roomB = roomManager.getOrCreateRoom('ARENA-200');
  assert(roomA.roomId === 'ARENA-100', 'Sala A creada con ID ARENA-100');
  assert(roomB.roomId === 'ARENA-200', 'Sala B creada con ID ARENA-200');
  assert(roomA !== roomB, 'Las salas A y B son instancias independientes');

  // TEST 2: Asignación de token a jugador nuevo
  const mockSocket1 = {
    messages: [],
    write(buf) { this.messages.push(buf); },
    end() {}
  };
  roomA.registerPlayer(mockSocket1, 1, 'Jugador Alfa', null);
  const slot1 = roomA.slots[0];
  assert(slot1.connected === true, 'Jugador Alfa conectado en Slot 1 de Sala A');
  assert(slot1.name === 'Jugador Alfa', 'Nombre del slot asignado correctamente');
  assert(typeof slot1.token === 'string' && slot1.token.startsWith('tok_'), 'Token criptográfico generado: ' + slot1.token);

  // TEST 3: Reconexión con el mismo token
  const tokenAlfa = slot1.token;
  const mockSocket1Reconnect = {
    messages: [],
    write(buf) { this.messages.push(buf); },
    end() {}
  };
  roomA.registerPlayer(mockSocket1Reconnect, 1, 'Jugador Alfa', tokenAlfa);
  assert(slot1.connected === true, 'Reconexión exitosa a Slot 1');
  assert(slot1.token === tokenAlfa, 'Token preservado idéntico tras reconexión');

  // TEST 4: Aislamiento estricto entre salas
  assert(roomB.slots[0].connected === false, 'Slot 1 en Sala B permanece libre sin verse afectado por Sala A');
  assert(roomB.tokens.size === 0, 'Sala B no comparte mapa de tokens con Sala A');

  // TEST 5: Hasta 6 jugadores por sala
  for (let s = 2; s <= 6; s++) {
    const sMock = { write() {}, end() {} };
    roomA.registerPlayer(sMock, s, `Jugador #${s}`, null);
  }
  const allConnected = roomA.slots.every(slot => slot.connected === true);
  assert(allConnected, 'La sala A alcanzó exitosamente su capacidad máxima de 6 jugadores conectados');

  // TEST 6: Rechazo o desborde cuando la sala está llena
  let roomFullError = false;
  const overflowMock = {
    write(buf) {
      const text = buf.toString('utf8');
      if (text.includes('ROOM_FULL')) {
        roomFullError = true;
      }
    },
    end() {}
  };
  roomA.registerPlayer(overflowMock, 1, 'Invasor #7', null);
  assert(roomFullError, 'Jugador adicional rechazado correctamente con ROOM_FULL al superar el límite de 6');

  console.log(`\n🏁 Resultado de Pruebas de Protocolo: ${passed}/${total} APROBADAS`);
  process.exit(passed === total ? 0 : 1);
}

runUnitProtocolTests().catch(err => {
  console.error('Error en tests:', err);
  process.exit(1);
});
