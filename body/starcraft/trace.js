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
  Patrol: { r: 200, g: 200, b: 0 },
  Unknown: { r: 200, g: 200, b: 200 },
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
    traceWarriorActions(texts);
    traceThreats(texts, spheres);
    traceDeployments(texts);

    await client.debug({ debug: [{ draw: { lines: lines, spheres: spheres, text: texts } }] });

    const selection = getSelectedUnit();
    if (selection || (Trace.speed >= 10)) {
      await new Promise(resolve => setTimeout(resolve, selection ? 1000 : Trace.speed));
      if (selection.job && selection.job.fight) selection.job.fight.trace = true;
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

function traceWarriorActions(texts) {
  for (const warrior of Units.warriors().values()) {
    const body = warrior.body;
    const tag = { x: body.x, y: body.y, z: body.z + Math.ceil(body.r) - 0.2 };

    texts.push({ text: "Zone: " + warrior.zone.name + " " + warrior.zone.traceName + " Order: " + warrior.order.abilityId, worldPos: tag, size: 16 });
  }
}

function traceThreats(texts, spheres) {
  for (const zone of Zone.list()) {
    for (const enemy of zone.threats) {
      const body = enemy.body;

      texts.push({ text: enemy.type.name + " " + enemy.tag, worldPos: { x: body.x, y: body.y, z: body.z + body.r }, size: 16 });
      texts.push({ text: "Zone: " + enemy.zone.name + " " + enemy.zone.traceName, worldPos: { x: body.x, y: body.y, z: body.z + body.r - 0.2 }, size: 16 });
      spheres.push({ p: { x: body.x, y: body.y, z: body.z }, r: body.r, color: Color.Enemy });
    }
  } 
}

function traceDeployments(texts) {
  const fights = [];
  const codeA = "A".charCodeAt(0);
  const code0 = "0".charCodeAt(0);

  texts.push({ text: "Troop deployment:", virtualPos: { x: 0.8, y: 0.05 }, size: 16 });

  for (const zone of Zone.list()) {
    if (zone.isCorridor) {
      const corridor = zone;

      if (corridor.deployment === 4) {
        const neighbora = corridor.zones[0];
        const neighborb = corridor.zones[1];

        zone.traceName = (neighbora.tier.level < neighborb.tier.level) ? neighbora.name + "->" + neighborb.name : neighborb.name + "->" + neighbora.name;
        fights.push(zone);
      }
    } else {
      const x = 0.8 + (zone.name.charCodeAt(0) - codeA) * 0.01;
      const y = 0.05 + (10 - zone.name.charCodeAt(1) + code0) * 0.01;
  
      let color = Color.Unknown;
      if (zone.deployment === 1) {
        color = Color.Perimeter;
      } else if (zone.deployment === 2) {
        color = Color.Patrol;
      } else if (zone.deployment === 4) {
        color = Color.Fight;

        zone.traceName = "  " + zone.name + "  ";
        fights.push(zone);
      } else if (zone.deployment === 5) {
        color = Color.Threat;
      }
  
      texts.push({ text: zone.name, virtualPos: { x: x, y: y }, size: 16, color: color });
    }
  }

  if (fights.length) {
    let y = 0.17;
    fights.sort((a, b) => (a.tier.level - b.tier.level));

    texts.push({ text: "Fights:", virtualPos: { x: 0.8, y: y }, size: 16 });
    for (const zone of fights) {
      const text = [zone.name, zone.traceName];

      if (zone.fight && zone.fight.balance) {
        text.push("balance:", zone.fight.balance.toFixed(2));
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
