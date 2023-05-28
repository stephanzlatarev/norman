
const GRID = 10;

const PREFIX_LEFT = 0;
const PREFIX_LEFT_TOP = 1;
const PREFIX_TOP = 2;
const PREFIX_TOP_RIGHT = 3;
const PREFIX_RIGHT = 4;
const PREFIX_BOTTOM_RIGHT = 5;
const PREFIX_BOTTOM = 6;
const PREFIX_LEFT_BOTTOM = 7;

export default function(past, future) {
  const result = [...past];

  for (const flow of flows(past, future)) {
    result[flow.source] = round(result[flow.source] - flow.volume);
    result[flow.target] = round(result[flow.target] + flow.volume);
  }

  return result;
}

function flows(past, future) {
  const table = [];
  for (let i = 0; i < past.length; i++) table[i] = { volume: past[i], delta: past[i] - future[i], prefix: [] };

  // Deltas total to zero
  trimDeltas(table);

  // Calculate pressure gradients based on delta.
  for (let y = 0; y < GRID; y++) {
    let prefix = 0;
    let cell = table[y * GRID];
    cell.prefix[PREFIX_LEFT] = 0;
    for (let x = 1; x < GRID; x++) {
      prefix += cell.delta;
      cell = table[x + y * GRID];
      cell.prefix[PREFIX_LEFT] = prefix;
    }

    prefix = 0;
    cell = table[GRID - 1 + y * GRID];
    cell.prefix[PREFIX_RIGHT] = 0;
    for (let x = GRID - 2; x >= 0; x--) {
      prefix += cell.delta;
      cell = table[x + y * GRID];
      cell.prefix[PREFIX_RIGHT] = prefix;
    }
  }

  for (let x = 0; x < GRID; x++) {
    let prefix = 0;
    let cell = table[x];
    cell.prefix[PREFIX_TOP] = 0;
    for (let y = 1; y < GRID; y++) {
      prefix += cell.delta;
      cell = table[x + y * GRID];
      cell.prefix[PREFIX_TOP] = prefix;
    }

    prefix = 0;
    cell = table[x + (GRID - 1) * GRID];
    cell.prefix[PREFIX_BOTTOM] = 0;
    for (let y = GRID - 2; y >= 0; y--) {
      prefix += cell.delta;
      cell = table[x + y * GRID];
      cell.prefix[PREFIX_BOTTOM] = prefix;
    }
  }

  for (let x = 0; x < GRID; x++) {
    const cell = table[x];
    cell.prefix[PREFIX_LEFT_TOP] = 0;
    cell.prefix[PREFIX_TOP_RIGHT] = 0;
  } 
  for (let y = 1; y < GRID; y++) {
    let prefix = 0;
    let cell = table[y * GRID];
    cell.prefix[PREFIX_LEFT_TOP] = 0;
    for (let x = 1; x < GRID; x++) {
      prefix += cell.prefix[PREFIX_TOP];
      cell = table[x + y * GRID];
      cell.prefix[PREFIX_LEFT_TOP] = prefix;
    }

    prefix = 0;
    cell = table[(GRID - 1) + y * GRID];
    cell.prefix[PREFIX_TOP_RIGHT] = 0;
    for (let x = GRID - 2; x >= 0; x--) {
      prefix += cell.prefix[PREFIX_TOP];
      cell = table[x + y * GRID];
      cell.prefix[PREFIX_TOP_RIGHT] = prefix;
    }
  }

  for (let x = 0; x < GRID; x++) {
    const cell = table[x + (GRID - 1) * GRID];
    cell.prefix[PREFIX_LEFT_BOTTOM] = 0;
    cell.prefix[PREFIX_BOTTOM_RIGHT] = 0;
  } 
  for (let y = GRID - 2; y >= 0; y--) {
    let prefix = 0;
    let cell = table[y * GRID];
    cell.prefix[PREFIX_LEFT_BOTTOM] = 0;
    for (let x = 1; x < GRID; x++) {
      prefix += cell.prefix[PREFIX_BOTTOM];
      cell = table[x + y * GRID];
      cell.prefix[PREFIX_LEFT_BOTTOM] = prefix;
    }

    prefix = 0;
    cell = table[(GRID - 1) + y * GRID];
    cell.prefix[PREFIX_BOTTOM_RIGHT] = 0;
    for (let x = GRID - 2; x >= 0; x--) {
      prefix += cell.prefix[PREFIX_BOTTOM];
      cell = table[x + y * GRID];
      cell.prefix[PREFIX_BOTTOM_RIGHT] = prefix;
    }
  }

  // Balance pressure directions.
  for (let spot = 0; spot < GRID * GRID; spot++) {
    const cell = table[spot];
    let correction = 0;

    for (let i = 0; i < cell.prefix.length; i++) {
      if (cell.prefix[i] > 0) {
        correction += balance(cell.prefix, i);
      }
    }

    if ((cell.delta > 0) && (correction > 0) && (cell.volume > cell.delta)) {
      correction = Math.min(cell.volume - cell.delta, correction);
      for (let i = 0; i < cell.prefix.length; i++) {
        if (cell.prefix[i] < 0) {
          cell.prefix[i] -= correction;
          // TODO: Distribute the correction among all pressure directions
          break;
        }
      }
      cell.delta += correction;
    }
  }

  // Create movement for each pressure direction
  const flows = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const source = x + y * GRID;
      const cell = table[source];

      if (cell.delta > 0) {
        let pressure = 0;
        for (const pressureInDirection of cell.prefix) if (pressureInDirection < 0) pressure -= pressureInDirection;

        for (let direction = 0; direction < cell.prefix.length; direction++) {
          const pressureInDirection = cell.prefix[direction];

          if (pressureInDirection < 0) {
            const volume = round(-pressureInDirection * cell.delta / pressure);

            if (volume >= 0.1) {
              const target = getTarget(x, y, direction);
              flows.push({ source: source, target: target, volume: volume });
            }
          }
        }
      }
    }
  }

  return flows;
}

function round(value) {
  return Math.max(Math.floor(value * 10) / 10, 0);
}

function trimDeltas(table) {
  let total = 0;

  for (const cell of table) {
    total += cell.delta;
  }

  if (total >= 0.1) {
    for (const cell of table) {
      if (cell.delta >= total) {
        cell.delta -= total;
        return;
      } else if (cell.delta >= 0.1) {
        total -= cell.delta;
        cell.delta = 0;
        if (total < 0.1) return;
      }
    }
  } else if (total <= -0.1) {
    for (const cell of table) {
      if (cell.delta <= total) {
        cell.delta -= total;
        return;
      } else if (cell.delta <= -0.1) {
        total -= cell.delta;
        cell.delta = 0;
        if (total > -0.1) return;
      }
    }
  }
}

const STEP = [1, 7, 2, 6, 3, 5, 4];
function balance(pressures, index) {
  let correction = 0;

  for (let step of STEP) {
    let i = (index + step) % pressures.length;

    if (pressures[i] < 0) {
      const volume = round(Math.min(pressures[index], -pressures[i]));

      if (volume) {
        pressures[index] = round(pressures[index] - volume);
        pressures[i] = -round(-pressures[i] - volume);

        if ((step >= 3) && (step <= 5)) correction += volume;
        if (!pressures[index]) break;
      }
    }
  }

  return correction;
}

function getTarget(x, y, direction) {
  switch (direction) {
    case PREFIX_LEFT: return (x - 1) + y * GRID;
    case PREFIX_LEFT_TOP: return (x - 1) + (y - 1) * GRID;
    case PREFIX_TOP: return x + (y - 1) * GRID;
    case PREFIX_TOP_RIGHT: return (x + 1) + (y - 1) * GRID;
    case PREFIX_RIGHT: return (x + 1) + y * GRID;
    case PREFIX_BOTTOM_RIGHT: return (x + 1) + (y + 1) * GRID;
    case PREFIX_BOTTOM: return x + (y + 1) * GRID;
    case PREFIX_LEFT_BOTTOM: return (x - 1) + (y + 1) * GRID;
  }
}
