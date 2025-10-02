import Memory from "../../code/memory.js";
import Game from "./game.js";
import Job from "./job.js";
import Battle from "./battle/battle.js";
import { ALERT_WHITE } from "./map/alert.js";
import Board from "./map/board.js";
import Zone from "./map/zone.js";

const SHOW_SITES = false;

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
    await this.client.joinGame({ race: 3, options: { raw: true, score: true } });

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
  const lines = [];
  const text = [];
  const shapes = [];
  const spheres = [];

  traceAlertLevels(shapes);
  traceBattles(lines, text);
  traceThreats(spheres);
  traceZones(shapes);
  traceMemory(text);
  traceJobs(text);

  for (let row = 0; row < text.length; row++) text[row] = { text: text[row], virtualPos: { x: 0, y: row } };
  for (const shape of shapes) text.push(shape);

  await client.debug({ debug: [{ draw: { lines, text, spheres } }] });
}

function traceAlertLevels(shapes) {
  for (const zone of Zone.list()) {
    if (zone.alertLevel === ALERT_WHITE) continue;
    if (!ALERT_COLOR[zone.alertLevel]) continue;

    const color = ALERT_COLOR[zone.alertLevel];
    shapes.push({ text: JSON.stringify({ shape: "polygon", points: getZoneShape(zone), color: `rgb(${color.r}, ${color.g}, ${color.b})` }) });
  }
}

function traceBattles(lines, texts) {
  const battles = Battle.list().sort((a, b) => (b.priority - a.priority));

  texts.push("Tier Zone Recruit/Rallied Mode  Frontline");

  for (const battle of battles) {
    const zone = battle.zone;
    const text = [threeletter(" ", zone.tier.level), threeletter(" ", zone.name)];

    text.push(balanceText(battle.recruitedBalance));
    text.push(balanceText(battle.deployedBalance));
    text.push(battle.mode);
    text.push(battle.lines.map(line => line.zone.name).join(" "));

    texts.push(text.join(" "));

    const zonep = { x: zone.x, y: zone.y };
    for (const one of battle.zones) {
      lines.push({ line: { p0: { x: one.x, y: one.y }, p1: zonep }, color: Color.Red });
    }
    for (const one of battle.front) {
      lines.push({ line: { p0: { x: one.x, y: one.y }, p1: zonep }, color: Color.Yellow });
    }
  }

  texts.push("");
}

function traceJobs(texts) {
  const jobs = [...Job.list()];
  const started = jobs.filter(job => !!job.assignee).sort(orderByPriorityAndSummary);
  const pending = jobs.filter(job => !job.assignee).sort(orderByPriorityAndSummary);

  texts.push("Job Prio Zone");
  displayJobList(texts, started);

  texts.push("--- ---- ----");
  displayJobList(texts, pending);

  texts.push("");
}


function orderByPriorityAndSummary(a, b) {
  if (b.priority !== a.priority) return b.priority - a.priority;
  if (a.zone && b.zone && (b.summary === a.summary)) return b.zone.name.localeCompare(a.zone.name);

  return b.summary.localeCompare(a.summary);
}

function displayJobList(texts, jobs) {
  let groupText;
  let groupCount;

  for (const job of jobs) {
    const text = threeletter(" ", job.priority) + (job.zone ? threeletter("  ", job.zone.name) : "     ") + "  " + job.summary;

    if (text !== groupText) {
      if (groupCount) {
        texts.push(threeletter("", groupCount) + groupText);
      }

      groupText = text;
      groupCount = 1;
    } else {
      groupCount++;
    }
  }

  if (groupCount) {
    texts.push(threeletter("", groupCount) + groupText);
  }
}

function traceMemory(texts) {
  if (Memory.FlagSupplyBlocked) texts.push("Flag Supply Blocked");

  if (Memory.MilestoneBasicEconomy) texts.push("Milestone Basic Economy");
  if (Memory.MilestoneBasicMilitary) texts.push("Milestone Basic Military");
  if (Memory.MilestoneMaxArmy) texts.push("Milestone Max Army");

  if (Memory.LimitBase) texts.push("Limit Base: " + Memory.LimitBase);

  if (Memory.FlagSiegeDefense) texts.push("Flag Siege Defense");
  if (Memory.DetectedEnemyExpansion) texts.push("Detected Enemy Expansion");
  if (Memory.DetectedEnemyDefensiveStance) texts.push("Detected Enemy Defensive Stance");
  if (Memory.DetectedEnemyHoard) texts.push("Detected Enemy Hoard");
  if (Memory.DetectedEnemyProxy) texts.push("Detected Enemy Proxy");
  if (Memory.LevelEnemyRush) texts.push("Level Enemy Rush: " + Memory.LevelEnemyRush);
  if (Memory.LevelEnemyArmySuperiority) texts.push("Level Enemy Army Superiority: " + Memory.LevelEnemyArmySuperiority);

  if (Memory.ModeCombatAttack) texts.push("Mode Combat Attack");
  if (Memory.ModeCombatCharge) texts.push("Mode Combat Charge");
  if (Memory.ModeCombatDefend) texts.push("Mode Combat Defend");

  texts.push("");
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

function traceZones(shapes) {
  const color = "black";
  const add = (shape) => shapes.push({ text: JSON.stringify(shape) });

  for (const zone of Zone.list()) {
    const rallyx = zone.isDepot ? zone.rally.x + 0.5 : zone.rally.x;
    const rallyy = zone.isDepot ? zone.rally.y + 0.5 : zone.rally.y;
    const radius = zone.isDepot ? 3.5 : 1.2;

    add({ shape: "circle", x: rallyx, y: rallyy, r: 1.2, color });

    for (const neighbor of zone.neighbors) {
      const neighborrallyx = neighbor.isDepot ? neighbor.rally.x + 0.5 : neighbor.rally.x;
      const neighborrallyy = neighbor.isDepot ? neighbor.rally.y + 0.5 : neighbor.rally.y;

      add({ shape: "line", x1: rallyx, y1: rallyy, x2: neighborrallyx, y2: neighborrallyy, color });
    }

    if (zone.isDepot) {
      add({ shape: "circle", x: Math.floor(zone.x) + 0.5, y: Math.floor(zone.y) + 0.5, r: radius, color });
      add({ shape: "circle", x: zone.harvestRally.x + 0.5, y: zone.harvestRally.y + 0.5, r: 0.5, color });
    }

    if (SHOW_SITES && zone.sites) {
      for (const site of zone.sites) {
        shapes.push({ shape: "circle", x: site.x, y: site.y, r: 0.2, color: "red" });

        for (const type of ["pylon", "battery", "small", "medium", "wall"]) {
          for (const plot of site[type]) {
            let x, y, r, color;

            if (type === "wall") {
              x = plot.x + 0.5;
              y = plot.y + 0.5;
              r = 0.4;
              color = "green";
            } else if (type === "medium") {
              x = plot.x + 0.5;
              y = plot.y + 0.5;
              r = 1.4;
              color = "purple";
            } else {
              x = plot.x;
              y = plot.y;
              r = 0.9;
              color = (type === "battery") ? "orange" : "blue";
            }

            shapes.push({ shape: "circle", x, y, r, color });
          }
        }
      }
    }
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
