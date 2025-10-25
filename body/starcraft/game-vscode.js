import Memory from "../../code/memory.js";
import Game from "./game.js";
import Job from "./job.js";
import Battle from "./battle/battle.js";
import Area from "./map/area.js";
import Base from "./map/base.js";
import Depot from "./map/depot.js";
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

async function trace(client) {
  const lines = [];
  const text = [];
  const shapes = [];
  const spheres = [];

  traceDepots(shapes);
  traceAreas(shapes);
  tracePins(shapes);
  traceThreats(spheres);
  traceBattles(text);
  traceMemory(text);
  traceJobs(text);

  for (let row = 0; row < text.length; row++) text[row] = { text: text[row], virtualPos: { x: 0, y: row } };
  for (const shape of shapes) text.push({ text: JSON.stringify(shape) });

  await client.debug({ debug: [{ draw: { lines, text, spheres } }] });
}

function traceBattles(texts) {
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

  if (Memory.DeploymentOutreach) texts.push("Deployment Outreach: " + Memory.DeploymentOutreach);
  if (Memory.LimitBase) texts.push("Limit Base: " + Memory.LimitBase);

  if (Memory.FlagSiegeDefense) texts.push("Flag Siege Defense");
  if (Memory.DetectedEnemyExpansion) texts.push("Detected Enemy Expansion");
  if (Memory.DetectedEnemyDefensiveStance) texts.push("Detected Enemy Defensive Stance");
  if (Memory.DetectedEnemyHoard) texts.push("Detected Enemy Hoard");
  if (Memory.DetectedEnemyProxy) texts.push("Detected Enemy Proxy");
  if (Memory.LevelEnemyRush) texts.push("Level Enemy Rush: " + Memory.LevelEnemyRush);
  if (Memory.LevelEnemyArmySuperiority) texts.push("Level Enemy Army Superiority: " + Memory.LevelEnemyArmySuperiority);

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

function traceDepots(shapes) {
  for (const depot of Depot.list()) {
    shapes.push({ shape: "circle", x: Math.floor(depot.x) + 0.5, y: Math.floor(depot.y) + 0.5, r: 3.5, color: "black" });
  }
}

function traceAreas(shapes) {
  for (const area of Area.list()) {
    shapes.push({ shape: "circle", x: area.x + 0.5, y: area.y + 0.5, r: area.r, color: areaColorName(area) });
  }
}

function tracePins(shapes) {
  if (Memory.PinNextExpansionX && Memory.PinNextExpansionY) {
    shapes.push({ shape: "circle", x: Memory.PinNextExpansionX, y: Memory.PinNextExpansionY, r: 3.5, color: "blue" });
  }
}

function areaColorName(area) {
  if (area.isBase) return "blue";
  if (area.isOutpost) return "green";
  if (area.isArmy) return "yellow";
  return "gray";
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
