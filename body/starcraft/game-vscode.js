import Game from "./game.js";
import Battle from "./battle/battle.js";
import { ALERT_WHITE } from "./map/alert.js";
import Board from "./map/board.js";
import Zone from "./map/zone.js";

export default class VscodeGame extends Game {

  async connect() {
    console.log("Connecting to StarCraft II game...");

    for (let i = 0; i < 12; i++) {
      try {
        await this.client.connect({ host: "127.0.0.1", port: 5000 });
        break;
      } catch (_) {
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    console.log("Joining game...");
    await this.client.joinGame({ race: 3, options: { raw: true } });

    console.log("Playing...");
  }

  async step() {
    await trace(this.client);
    await super.step();
  }

}

const Color = {
  Blue: { r: 100, g: 100, b: 200 },
  Green: { r: 0, g: 200, b: 0 },
  White: { r: 200, g: 200, b: 200 },
  Yellow: { r: 200, g: 200, b: 0 },
  Orange: { r: 200, g: 100, b: 0 },
  Pink: { r: 200, g: 100, b: 100 },
  Red: { r: 200, g: 0, b: 0 },
  Purple: { r: 200, g: 0, b: 200 },
  Unknown: { r: 100, g: 100, b: 100 },
};
const ALERT_COLOR = [Color.Unknown, Color.Blue, Color.Green, Color.White, Color.Yellow, Color.Orange, Color.Pink, Color.Red];
const zoneShapes = new Map();

async function trace(client) {
  const texts = [];
  const spheres = [];

  traceAlertLevels(texts);
  traceBattles(texts);
  traceThreats(spheres);
  traceZones(texts);

  await client.debug({ debug: [{ draw: { text: texts, spheres: spheres } }] });
}

function traceAlertLevels(texts) {
  for (const zone of Zone.list()) {
    if (zone.alertLevel === ALERT_WHITE) continue;
    if (!ALERT_COLOR[zone.alertLevel]) continue;

    const color = ALERT_COLOR[zone.alertLevel];
    texts.push({ text: JSON.stringify({ shape: "polygon", points: getZoneShape(zone), color: `rgb(${color.r}, ${color.g}, ${color.b})` }) });
  }
}

function traceBattles(texts) {
  const battles = Battle.list().sort((a, b) => (b.priority - a.priority));
  let y = 1;

  texts.push({ text: "Tier Zone Recruit/Rallied Mode  Frontline", virtualPos: { x: 0, y: 0 } });

  for (const battle of battles) {
    const zone = battle.zone;
    const text = [threeletter(" ", zone.tier.level), threeletter(" ", zone.name)];

    text.push(balanceText(battle.recruitedBalance));
    text.push(balanceText(battle.deployedBalance));
    text.push(battle.mode);
    text.push(battle.lines.map(line => line.zone.name).join(" "));

    texts.push({ text: text.join(" "), virtualPos: { x: 0, y: y++ } });
  }
}

function traceThreats(spheres) {
  for (const zone of Zone.list()) {
    for (const threat of zone.threats) {
      if (!zone.enemies.has(threat)) {
        spheres.push({ p: { x: threat.body.x, y: threat.body.y, z: 0 }, r: threat.body.r + 0.3, color: Color.Red });
      }
    }
  }
}

function traceZones(texts) {
  const shapes = [];
  const color = "black";

  for (const zone of Zone.list()) {
    const centerx = Math.floor(zone.x) + 0.5;
    const centery = Math.floor(zone.y) + 0.5;
    const radius = zone.isDepot ? 3.5 : 1.5;

    shapes.push({ shape: "circle", x: centerx, y: centery, r: radius, color });

    for (const neighbor of zone.neighbors) {
      const neighborx = Math.floor(neighbor.x) + 0.5;
      const neighbory = Math.floor(neighbor.y) + 0.5;

      shapes.push({ shape: "line", x1: centerx, y1: centery, x2: neighborx, y2: neighbory, color });
    }

    if (zone.isDepot) {
      shapes.push({ shape: "circle", x: zone.harvestRally.x + 0.5, y: zone.harvestRally.y + 0.5, r: 0.5, color });
      shapes.push({ shape: "circle", x: zone.exitRally.x + 0.5, y: zone.exitRally.y + 0.5, r: 0.5, color });
    }
  }

  for (const shape of shapes) {
    texts.push({ text: JSON.stringify(shape) });
  }
}

function threeletter(tab, text) {
  if (!text) return tab + "  -";

  if (text >= 0) {
    if (text > 999) return tab + "999";
    if (text > 99) return tab + text;
    if (text > 9) return tab + " " + text;
    return tab + "  " + text;
  } else if (text.length > 0) {
    if (text.length > 3) return tab + text.slice(0, 3);
    if (text.length === 3) return tab + text;
    if (text.length === 2) return tab + " " + text;
    return tab + "  " + text;
  }

  return tab + " X ";
}

function balanceText(balance) {
  if (balance >= 1000) {
    return " all in";
  } else if (balance >= 100) {
    return balance.toFixed(3);
  } else if (balance >= 10) {
    return balance.toFixed(4);
  } else if (balance <= 0) {
    return "   -   ";
  }

  return balance.toFixed(5);
}

function getZoneShape(zone) {
  let shape = zoneShapes.get(zone);

  if (!shape) {
    shape = createZoneShape(zone);
    zoneShapes.set(zone, shape);
  }

  return shape;
}

function createZoneShape(zone) {
  const shape = [];

  let start = zone.cell;
  let next = start;
  let ahead;
  let left;
  let direction = { x: 0, y: 1 };
  let leftside = { x: -1, y: 0 };

  // Find starting edge cell
  while (next && (next.zone === zone)) {
    start = next;
    next = cell(next.x + direction.x, next.y + direction.y);
  }

  // Orient around the starting edge cell
  next = start;
  ahead = cell(start.x + direction.x, start.y + direction.y);
  left = cell(start.x + leftside.x, start.y + leftside.y);
  while ((left && (left.zone === zone)) || !ahead || (ahead.zone !== zone)) {
    turn(direction, +1);
    turn(leftside, +1);

    ahead = cell(start.x + direction.x, start.y + direction.y);
    left = cell(start.x + leftside.x, start.y + leftside.y);
  }

  // Follow left edge of zone
  do {
    ahead = cell(next.x + direction.x, next.y + direction.y);

    if (ahead && (ahead.zone === zone)) {
      // The cell ahead is still in the zone so it's part of the contour
      next = ahead;
      left = cell(next.x + leftside.x, next.y + leftside.y);

      if (left && (left.zone === zone)) {
        // Left of new next cell is in the zone so let's turn left
        turn(direction, -1);
        turn(leftside, -1);
      }

      shape.push(next.x, next.y);
    } else {
      // The cell ahead is outside the zone so let's not step ahead but turn right
      turn(direction, +1);
      turn(leftside, +1);
    }
  } while (next !== start);

  return shape;
}

function cell(x, y) {
  const row = Board.cells[y];

  return row ? row[x] : null;
}

function turn(direction, angle) {
  const x = direction.x;
  const y = direction.y;

  direction.x = y ? y * +angle : 0;
  direction.y = x ? x * -angle : 0;
}
