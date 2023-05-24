
const DAMAGE = 0.2;
const SPAWN = 0.1;

export default class Game {

  constructor(player1, player2) {
    this.time = 0;
    this.player1 = player1;
    this.player2 = player2;
  }

  start() {
    this.player1.military = field();
    this.player1.economy = field();
    this.player1.economy[coordinates(1, 1)] = 1;
    this.player1.economy[coordinates(1, 3)] = 1;
    this.player1.economy[coordinates(1, 5)] = 1;
    this.player1.economy[coordinates(3, 1)] = 1;
    this.player1.economy[coordinates(3, 3)] = 1;
    this.player1.economy[coordinates(5, 1)] = 1;

    this.player2.military = field();
    this.player2.economy = field();
    this.player2.economy[coordinates(8, 8)] = 1;
    this.player2.economy[coordinates(8, 6)] = 1;
    this.player2.economy[coordinates(8, 4)] = 1;
    this.player2.economy[coordinates(6, 8)] = 1;
    this.player2.economy[coordinates(6, 6)] = 1;
    this.player2.economy[coordinates(4, 8)] = 1;
  }

  step() {
    for (let spot = 0; spot < 100; spot++) {
      fight(this.player1, this.player2, spot);
    }

    this.time++;

    if (this.time % 10 === 0) {
      for (let spot = 0; spot < 100; spot++) {
        if (this.player1.economy[spot]) {
          this.player1.military[spot] += Math.floor(this.player1.economy[spot]);
          this.player1.economy[spot] += this.player1.economy[spot] * SPAWN;
        }
        if (this.player2.economy[spot]) {
          this.player2.military[spot] += Math.floor(this.player2.economy[spot]);
          this.player2.economy[spot] += this.player2.economy[spot] * SPAWN;
        }
      }
    }

    const deployment1 = this.player1.deploy(this.player1.military, this.player1.economy, this.player2.military, this.player2.economy);
    const deployment2 = this.player2.deploy(this.player2.military, this.player2.economy, this.player1.military, this.player1.economy);

    this.player1.military = move(this.player1.military, deployment1);
    this.player2.military = move(this.player2.military, deployment2);
  }

  winner() {
    let player1 = 0;
    let player2 = 0;
    for (const one of this.player1.economy) {
      if (one > 0) player1 += one;
    }
    for (const one of this.player2.economy) {
      if (one > 0) player2 += one;
    }
    if (!player1) return 2;
    if (!player2) return 1;
  }
}

function field() {
  const field = [];

  for (let i = 0; i < 100; i++) {
    field.push(0);
  }

  return field;
}

function coordinates(x, y) {
  return x + y * 10;
}

function fight(player1, player2, spot) {
  const military1 = player1.military[spot];
  const economy1 = player1.economy[spot];
  const military2 = player2.military[spot];
  const economy2 = player2.economy[spot];

  if (military1 && military2) {
    // Fight between warriors
    const damage = Math.max(military1, military2) * DAMAGE;

    player1.military[spot] = Math.max(military1 - damage, 0);
    if (player1.military[spot] < 0.1) player1.military[spot] = 0;

    player2.military[spot] = Math.max(military2 - damage, 0);
    if (player2.military[spot] < 0.1) player2.military[spot] = 0;
  } else if (military1 && economy2) {
    const damage = military1 * DAMAGE;

    if (damage > economy2) {
      player2.economy[spot] = 0;
    } else {
      player2.economy[spot] -= damage;
    }
  } else if (military2 && economy1) {
    const damage = military2 * DAMAGE;

    if (damage > economy1) {
      player1.economy[spot] = 0;
    } else {
      player1.economy[spot] -= damage;
    }
  }
}

const PREFIX_LEFT = 0;
const PREFIX_LEFT_TOP = 1;
const PREFIX_TOP = 2;
const PREFIX_TOP_RIGHT = 3;
const PREFIX_RIGHT = 4;
const PREFIX_BOTTOM_RIGHT = 5;
const PREFIX_BOTTOM = 6;
const PREFIX_LEFT_BOTTOM = 7;

function move(military, deployment) {
  const result = [...military];

  for (const flow of flows(military, deployment)) {
    result[flow.source] -= flow.volume;
    result[flow.target] += flow.volume;

    if (result[flow.source] < 0.1) result[flow.source] = 0;
  }

  return result;
}

function flows(military, deployment) {
  const table = [];
  for (let i = 0; i < military.length; i++) table[i] = { delta: military[i] - deployment[i], prefix: [] };

  for (let y = 0; y < 10; y++) {
    let prefix = 0;
    let cell = table[y * 10];
    cell.prefix[PREFIX_LEFT] = 0;
    for (let x = 1; x < 10; x++) {
      prefix += cell.delta;
      cell = table[x + y * 10];
      cell.prefix[PREFIX_LEFT] = prefix;
    }

    prefix = 0;
    cell = table[9 + y * 10];
    cell.prefix[PREFIX_RIGHT] = 0;
    for (let x = 8; x >= 0; x--) {
      prefix += cell.delta;
      cell = table[x + y * 10];
      cell.prefix[PREFIX_RIGHT] = prefix;
    }
  }

  for (let x = 0; x < 10; x++) {
    let prefix = 0;
    let cell = table[x];
    cell.prefix[PREFIX_TOP] = 0;
    for (let y = 1; y < 10; y++) {
      prefix += cell.delta;
      cell = table[x + y * 10];
      cell.prefix[PREFIX_TOP] = prefix;
    }

    prefix = 0;
    cell = table[x + 9 * 10];
    cell.prefix[PREFIX_BOTTOM] = 0;
    for (let y = 8; y >= 0; y--) {
      prefix += cell.delta;
      cell = table[x + y * 10];
      cell.prefix[PREFIX_BOTTOM] = prefix;
    }
  }

  for (let x = 0; x < 10; x++) {
    const cell = table[x];
    cell.prefix[PREFIX_LEFT_TOP] = 0;
    cell.prefix[PREFIX_TOP_RIGHT] = 0;
  } 
  for (let y = 1; y < 10; y++) {
    let prefix = 0;
    let cell = table[y * 10];
    cell.prefix[PREFIX_LEFT_TOP] = 0;
    for (let x = 1; x < 10; x++) {
      prefix += cell.delta + cell.prefix[PREFIX_TOP];
      cell = table[x + y * 10];
      cell.prefix[PREFIX_LEFT_TOP] = prefix;
    }

    prefix = 0;
    cell = table[9 + y * 10];
    cell.prefix[PREFIX_TOP_RIGHT] = 0;
    for (let x = 8; x >= 0; x--) {
      prefix += cell.delta + cell.prefix[PREFIX_TOP];
      cell = table[x + y * 10];
      cell.prefix[PREFIX_TOP_RIGHT] = prefix;
    }
  }

  for (let x = 0; x < 10; x++) {
    const cell = table[x + 9 * 10];
    cell.prefix[PREFIX_LEFT_BOTTOM] = 0;
    cell.prefix[PREFIX_BOTTOM_RIGHT] = 0;
  } 
  for (let y = 8; y >= 0; y--) {
    let prefix = 0;
    let cell = table[y * 10];
    cell.prefix[PREFIX_LEFT_BOTTOM] = 0;
    for (let x = 1; x < 10; x++) {
      prefix += cell.delta + cell.prefix[PREFIX_BOTTOM];
      cell = table[x + y * 10];
      cell.prefix[PREFIX_LEFT_BOTTOM] = prefix;
    }

    prefix = 0;
    cell = table[9 + y * 10];
    cell.prefix[PREFIX_BOTTOM_RIGHT] = 0;
    for (let x = 8; x >= 0; x--) {
      prefix += cell.delta + cell.prefix[PREFIX_BOTTOM];
      cell = table[x + y * 10];
      cell.prefix[PREFIX_BOTTOM_RIGHT] = prefix;
    }
  }

  // Create movement for each delta
  const flows = [];
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const source = x + y * 10;
      const cell = table[source];

      if (cell.delta > 0) {
        let pressure = 0;
        for (const pressureInDirection of cell.prefix) if (pressureInDirection < 0) pressure -= pressureInDirection;

        for (let direction = 0; direction < cell.prefix.length; direction++) {
          const pressureInDirection = cell.prefix[direction];

          if (pressureInDirection < 0) {
            const volume = -pressureInDirection * cell.delta / pressure;

            if (volume >= 0.1) {
              const target = getTarget(x, y, direction);
              flows.push({ source: source, target: target, volume: Math.floor(volume * 10) / 10 });
            }
          }
        }
      }
    }
  }

  // TODO: Add movement for spill volumes

  return flows;
}

function getTarget(x, y, direction) {
  switch (direction) {
    case PREFIX_LEFT: return (x - 1) + y * 10;
    case PREFIX_LEFT_TOP: return (x - 1) + (y - 1) * 10;
    case PREFIX_TOP: return x + (y - 1) * 10;
    case PREFIX_TOP_RIGHT: return (x + 1) + (y - 1) * 10;
    case PREFIX_RIGHT: return (x + 1) + y * 10;
    case PREFIX_BOTTOM_RIGHT: return (x + 1) + (y + 1) * 10;
    case PREFIX_BOTTOM: return x + (y + 1) * 10;
    case PREFIX_LEFT_BOTTOM: return (x - 1) + (y + 1) * 10;
  }
}
