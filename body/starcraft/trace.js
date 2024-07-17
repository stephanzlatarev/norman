import Job from "./job.js";
import Units from "./units.js";
import Types from "./types.js";
import Zone from "./map/zone.js";

const Color = {
  Blue: { r: 0, g: 150, b: 250 },
  Green: { r: 0, g: 200, b: 0 },
  White: { r: 200, g: 200, b: 200 },
  Yellow: { r: 200, g: 200, b: 0 },
  Red: { r: 200, g: 0, b: 0 },
  Purple: { r: 200, g: 0, b: 200 },
  Unknown: { r: 100, g: 100, b: 100 },

  Attack: { r: 255, g: 0, b: 0 },
  Move: { r: 0, g: 255, b: 0 },
  Cooldown: { r: 100, g: 100, b: 255 },

  Corridor: { r: 0, g: 200, b: 200 },
  Enemy: { r: 200, g: 0, b: 0 },
};

export default class Trace {

  async step(client) {
    const boxes = [];
    const lines = [];
    const spheres = [];
    const texts = [];

    traceZones(texts, lines);
    traceJobs(texts, lines);
    traceWarriorActions(texts, lines);
    traceThreats(texts, spheres);
    traceAlertLevels(texts);
    traceBattles(texts, boxes, lines);

    await client.debug({ debug: [{ draw: { boxes: boxes, lines: lines, spheres: spheres, text: texts } }] });
  }

}

function traceZones(texts, lines) {
  for (const zone of Zone.list()) {
    const point = { x: zone.x, y: zone.y, z: 15 };

    texts.push({ text: zone.name, worldPos: { ...point, z: point.z + 1 }, size: 40 });
    lines.push({ line: { p0: point, p1: { ...point, z: 0 } }, color: Color.Corridor });

    for (const corridor of zone.corridors) {
      lines.push({ line: { p0: point, p1: { x: corridor.x, y: corridor.y, z: 15 } }, color: Color.Corridor });
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

const ALERT_COLOR = [Color.Unknown, Color.Blue, Color.Green, Color.White, Color.Yellow, Color.Red];
let alertbox;
function traceAlertLevels(texts) {
  texts.push({ text: "Alert levels:", virtualPos: { x: 0.8, y: 0.05 }, size: 16 });

  if (!alertbox) {
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

    alertbox = { left, width, scaleX, bottom, height, scaleY };
  }

  for (const zone of Zone.list()) {
    if (zone.isCorridor) {
      const text = zone.name[2];
      const color = Color.Unknown;
      const x = 0.75 + ((zone.x - alertbox.left) / alertbox.width) * alertbox.scaleX * 0.2;
      const y = 0.07 + ((alertbox.bottom - zone.y) / alertbox.height) * alertbox.scaleY * 0.2;

      texts.push({ text: text, virtualPos: { x: x, y: y }, size: 16, color: color });
    }
  }

  for (const zone of Zone.list()) {
    if (!zone.isCorridor) {
      const text = zone.name[0] + zone.name[1];
      const color = ALERT_COLOR[zone.alertLevel] || Color.Unknown;
      const x = 0.75 + ((zone.x - alertbox.left) / alertbox.width) * alertbox.scaleX * 0.2;
      const y = 0.07 + ((alertbox.bottom - zone.y) / alertbox.height) * alertbox.scaleY * 0.2;

      texts.push({ text: text, virtualPos: { x: x, y: y }, size: 16, color: color });
    }
  }
}

function traceBattles(texts, boxes, lines) {
  let y = 0.32;

  texts.push({ text: "Battles:", virtualPos: { x: 0.8, y: 0.3 }, size: 16 });
  texts.push({ text: "Tier Zone Balance Mode", virtualPos: { x: 0.8, y: 0.31 }, size: 16 });

  for (const zone of Zone.list().filter(zone => !!zone.battle).sort((a, b) => (a.tier.level - b.tier.level))) {
    const text = [threeletter(" ", zone.tier.level), threeletter(" ", zone.name)];
    const battle = zone.battle;
    const balance = battle.balance;

    if (balance >= 1000) {
      text.push(" all in");
    } else if (balance >= 100) {
      text.push(balance.toFixed(3));
    } else if (balance >= 10) {
      text.push(balance.toFixed(4));
    } else if (balance <= 0) {
      text.push("   -   ");
    } else {
      text.push(balance.toFixed(5));
    }

    text.push(battle.mode);

    // TODO: Show position scores for the selected unit if any. Default to stalker
    let warrior = { type: Types.unit("Stalker") };

    for (const fighter of battle.fighters) {
      const target = fighter.target ? fighter.target.body : null;
      const rally = fighter.position;

      if (fighter.assignee && target && rally) {
        const body = fighter.assignee.body;
        const prally = { x: rally.x, y: rally.y, z: 15 };

        lines.push({ line: { p0: prally, p1: { x: body.x, y: body.y, z: body.z + body.r * 2 } }, color: Color.White });
        lines.push({ line: { p0: prally, p1: { x: target.x, y: target.y, z: target.z + target.r * 2 } }, color: Color.Red });

        rally.color = Color.Green;
      } else if (target && rally) {
        lines.push({ line: { p0: { x: rally.x, y: rally.y, z: 15 }, p1: { x: target.x, y: target.y, z: target.z + target.r * 2 } }, color: Color.Red });

        rally.color = Color.Blue;
      }
    }

    for (const position of [...battle.frontline.groundToGround, ...battle.frontline.groundToAir]) {
      const color = position.color || Color.White;

      let score = "";
      if (position.score) {
        const pscore = position.score(warrior);
        score = (pscore === Infinity) ? "MAX" : pscore.toFixed(2);
      }

      boxes.push({ min: { x: position.x - 0.4, y: position.y - 0.4, z: 0 }, max: { x: position.x + 0.4, y: position.y + 0.4, z: 15 }, color: color });
      texts.push({ text: score, worldPos: { x: position.x - 0.2, y: position.y, z: 15 }, size: 20 });

      if (position.entrance) {
        const z = 15 + Math.random() * 0.5;
        let last = position;

        for (const next of position.entrance) {
          lines.push({ line: { p0: { x: last.x, y: last.y, z: z }, p1: { x: next.x, y: next.y, z: z } }, color: Color.Purple });
          last = next;
        }
      }

      position.color = Color.White;
    }

    texts.push({ text: text.join(" "), virtualPos: { x: 0.8, y: y }, size: 16 });
    y += 0.01;
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
