import Job from "./job.js";
import Units from "./units.js";
import Zone from "./map/zone.js";

const Color = {
  Attack: { r: 255, g: 0, b: 0 },
  Move: { r: 0, g: 255, b: 0 },
  Cooldown: { r: 100, g: 100, b: 255 },

  Corridor: { r: 0, g: 200, b: 200 },
  Enemy: { r: 200, g: 0, b: 0 },

  Perimeter: { r: 0, g: 200, b: 0 },
  Frontier: { r: 200, g: 200, b: 200 },
  Unknown: { r: 200, g: 200, b: 0 },
  Fight: { r: 200, g: 0, b: 0 },
  Threat: { r: 200, g: 0, b: 200 },
};

export default class Trace {

  static speed = 0;

  constructor(speed) {
    Trace.speed = speed;
  }

  async step(client) {
    const lines = [];
    const spheres = [];
    const texts = [];

    traceZones(texts, lines);
    traceJobs(texts, lines);
    traceWarriorActions(texts, lines);
    traceThreats(texts, spheres);
    traceDeployments(texts);

    await client.debug({ debug: [{ draw: { lines: lines, spheres: spheres, text: texts } }] });

    const selection = getSelectedUnit();
    if (selection || (Trace.speed >= 10)) {
      await new Promise(resolve => setTimeout(resolve, selection ? 1000 : Trace.speed));
      if (selection && selection.job && selection.job.fight) selection.job.fight.trace = true;
    }
  }

}

let selection = null;
function getSelectedUnit() {
  if (selection && selection.isSelected) return selection;

  for (const unit of Units.warriors().values()) {
    if (unit.isSelected) {
      selection = unit;
      return selection;
    }
  }

  if (selection) {
    if (selection.job && selection.job.fight) selection.job.fight.trace = false;
    selection = null;
  }
}

function traceZones(texts, lines) {
  for (const zone of Zone.list()) {
    for (const corridor of zone.corridors) {
      const point = { x: zone.x, y: zone.y, z: 15 };

      texts.push({ text: zone.name, worldPos: { ...point, z: point.z + 1 }, size: 40 });
      lines.push({ line: { p0: point, p1: { x: corridor.x, y: corridor.y, z: 15 } }, color: Color.Corridor });
      lines.push({ line: { p0: point, p1: { ...point, z: 0 } }, color: Color.Corridor });
    }
  }
}

function traceJobs(texts, lines) {
  const jobs = [...Job.list()];
  const started = jobs.filter(job => !!job.assignee).sort((a, b) => (b.priority - a.priority));
  const pending = jobs.filter(job => !job.assignee).sort((a, b) => (b.priority - a.priority));

  texts.push({ text: "    Prio Zone", virtualPos: { x: 0.05, y: 0.05 }, size: 16 });
  const divider = displayJobList(texts, started, 0.06);

  texts.push({ text: "--- ---- ----", virtualPos: { x: 0.05, y: divider }, size: 16 });
  displayJobList(texts, pending, divider + 0.01);

  for (const job of started) {
    const body = job.assignee.body;
    const center = { x: body.x, y: body.y, z: body.z };
    const tag = { x: body.x, y: body.y, z: body.z + Math.ceil(body.r) };

    lines.push({ line: { p0: center, p1: tag } });
    texts.push({ text: job.details, worldPos: tag, size: 16 });
  }
}

function displayJobList(texts, jobs, y) {
  let groupY = y;
  let groupText;
  let groupCount;

  for (const job of jobs) {
    const text = threeletter(" ", job.priority) + (job.zone ? threeletter("  ", job.zone.name) : "     ") + "  " + job.summary;

    if (text !== groupText) {
      if (groupCount) {
        texts.push({ text: threeletter("", groupCount) + groupText, virtualPos: { x: 0.05, y: groupY }, size: 16 });
      }

      groupY += 0.01;
      groupText = text;
      groupCount = 1;
    } else {
      groupCount++;
    }
  }

  if (groupCount) {
    texts.push({ text: threeletter("", groupCount) + groupText, virtualPos: { x: 0.05, y: groupY }, size: 16 });
    groupY += 0.01;
  }

  return groupY;
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

function traceWarriorActions(texts, lines) {
  for (const warrior of Units.warriors().values()) {
    const zoneName = warrior.zone ? warrior.zone.name : "-";
    const body = warrior.body;
    const mode = (warrior.job && warrior.job.modes && warrior.job.modes[warrior.job.mode]) ? warrior.job.modes[warrior.job.mode] + " " : "";
    const tag = { x: body.x, y: body.y, z: body.z + Math.ceil(body.r) };

    texts.push({ text: "Zone: " + zoneName + " " + Math.floor(warrior.body.x) + ":" + Math.floor(warrior.body.y), worldPos: { ...tag, z: tag.z - 0.22 }, size: 16 });
    texts.push({ text: mode + "Order: " + warrior.order.abilityId, worldPos: { ...tag, z: tag.z - 0.44 }, size: 16 });

    if ((warrior.order.abilityId === 23) && warrior.order.targetUnitTag) {
      const target = Units.enemies().get(warrior.order.targetUnitTag);

      if (target) {
        const color = warrior.weapon.cooldown ? Color.Cooldown : Color.Attack;
        const wx = warrior.body.x;
        const wy = warrior.body.y;
        const wz = warrior.body.z;

        lines.push({ line: { p0: { x: wx, y: wy, z: wz + 0.1}, p1: target.body }, color: color });
        lines.push({ line: { p0: { x: wx, y: wy, z: wz + 0.3}, p1: target.body }, color: color });
        lines.push({ line: { p0: { x: wx, y: wy, z: wz + 0.5}, p1: target.body }, color: color });
        lines.push({ line: { p0: { x: wx, y: wy, z: wz + 0.7}, p1: target.body }, color: color });
        lines.push({ line: { p0: { x: wx, y: wy, z: wz + 0.9}, p1: target.body }, color: color });
      }
    }
  }
}

function traceThreats(texts, spheres) {
  for (const zone of Zone.list()) {
    for (const enemy of zone.threats) {
      const zoneName = enemy.zone ? enemy.zone.name : "-";
      const body = enemy.body;
      const tag = { x: body.x, y: body.y, z: body.z + Math.ceil(body.r) };

      texts.push({ text: enemy.type.name + " " + enemy.tag, worldPos: tag, size: 16 });
      texts.push({ text: "Zone: " + zoneName + " " + Math.floor(enemy.body.x) + ":" + Math.floor(enemy.body.y), worldPos: { ...tag, z: tag.z - 0.22 }, size: 16 });
      spheres.push({ p: { x: body.x, y: body.y, z: body.z }, r: body.r, color: Color.Enemy });
    }
  } 
}

let deployments;
function traceDeployments(texts) {
  const fights = [];

  texts.push({ text: "Troop deployment:", virtualPos: { x: 0.8, y: 0.05 }, size: 16 });

  if (!deployments) {
    let left = Infinity;
    let right = 0;
    let top = Infinity;
    let bottom = 0;

    for (const zone of Zone.list()) {
      left = Math.min(left, zone.x);
      right = Math.max(right, zone.x);
      top = Math.min(top, zone.y);
      bottom = Math.max(bottom, zone.y);
    }

    const width = Math.max(right - left, 1);
    const height = Math.max(bottom - top, 1);
    const scaleX = (width >= height) ? 1 : width / height;
    const scaleY = (height >= width) ? 1 : height / width;

    deployments = { left, width, scaleX, bottom, height, scaleY };
  }

  for (const zone of Zone.list()) {
    const x = 0.75 + ((zone.x - deployments.left) / deployments.width) * deployments.scaleX * 0.2;
    const y = 0.07 + ((deployments.bottom - zone.y) / deployments.height) * deployments.scaleY * 0.2;

    let color = Color.Unknown;
    if (zone.deployment === 1) {
      color = Color.Perimeter;
    } else if (zone.deployment === 2) {
      color = Color.Frontier;
    } else if (zone.deployment === 4) {
      color = Color.Fight;

      fights.push(zone);
    } else if (zone.deployment === 5) {
      color = Color.Threat;
    }

    texts.push({ text: zone.isCorridor ? zone.name[2] : zone.name[0] + zone.name[1], virtualPos: { x: x, y: y }, size: 16, color: color });
  }

  if (fights.length) {
    let y = 0.1 + deployments.scaleY * 0.2;
    fights.sort((a, b) => (a.tier.level - b.tier.level));

    texts.push({ text: "Battles:", virtualPos: { x: 0.8, y: y }, size: 16 });
    for (const zone of fights) {
      const text = [zone.name];

      if (zone.fight) {
        if (zone.fight.modes && zone.fight.modes[zone.fight.mode]) text.push(zone.fight.modes[zone.fight.mode]);
        if (zone.fight.balance) text.push("balance:", zone.fight.balance.toFixed(2));
      }

      y += 0.01;
      texts.push({ text: text.join(" "), virtualPos: { x: 0.8, y: y }, size: 16 });
    }
  }
}

function trackSpeed(unit) {
  if (unit.isSelected && unit.job) {

    if (unit.last) {
      const x1 = unit.last.x;
      const y1 = unit.last.y;
      const x2 = unit.body.x;
      const y2 = unit.body.y;

      unit.body.s = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
      unit.body.a = (unit.last.s >= 0) ? unit.body.s - unit.last.s : 0;
    } else {
      unit.body.s = 0;
      unit.body.a = 0;
    }

    unit.last = {
      x: unit.body.x,
      y: unit.body.y,
      s: unit.body.s,
    }

    console.log(unit.job ? unit.job.details : "free",
      "\tdirection:", unit.direction.toFixed(1),
      "\tspeed:", unit.body.s.toFixed(2),
      "\tacceleration:", unit.body.a.toFixed(2),
      "\torder:", JSON.stringify(unit.order),
    );
  }

}

async function spawnObserver(client, me) {
  await client.debug({
    debug: [{
      createUnit: {
        unitType: 82,
        owner: me.id,
        pos: { x: me.x, y: me.y },
        quantity: 1,
      }
    }]
  });
}

let spawnLocation;
let spawnCooldown;
async function spawnZergling(client) {
  if (spawnCooldown-- > 0) return;
  if (!spawnLocation) {
    const field = [...Map.tiers[3].fore][0];
    spawnLocation = { x: field.x, y: field.y };
  }

  const warriors = Units.warriors().size;
  if (!warriors) return;
  
  const zealot = [...Units.warriors().values()].find(warrior => (warrior.type.name === "Zealot"));
  if (!zealot || (zealot.armor.shield < 50)) return;
  
  const enemies = Units.enemies().size;
  if (enemies >= warriors) return;

  await client.debug({
    debug: [{
      createUnit: {
        unitType: 105,
        owner: 2,
        pos: spawnLocation,
        quantity: warriors,
      }
    }]
  });

  spawnCooldown = 100;
}
