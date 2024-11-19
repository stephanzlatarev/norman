import Job from "../job.js";
import Battle from "./battle.js";

const INTERVAL = 224;
let loop = 0;

export default function() {
  if (loop-- > 0) return;

  const battles = new Set();
  const orphans = new Set();

  for (const battle of Battle.list()) {
    traceBattle(battle);
    battles.add(battle);
  }

  for (const job of Job.list()) {
    if (job.battle && !battles.has(job.battle)) {
      orphans.add(job.battle);
    }
  }

  for (const battle of orphans) {
    traceBattle(battle, "orphan");
  }

  loop = INTERVAL;
}

function traceBattle(battle, event) {
  const trace = [];

  trace.push("[battle]", battle.zone.name);

  if (event) trace.push(event);

  trace.push("tier:", battle.zone.tier.level);
  trace.push("zones:", [...battle.zones].map(zone => zone.name).join());
  trace.push("balance:", battle.deployedBalance.toFixed(2), "/", battle.recruitedBalance.toFixed(2));
  trace.push("mode:", battle.mode);
  trace.push("range:", battle.range);

  trace.push("lines:");
  traceLines(trace, battle);

  trace.push("detector:");
  traceDetector(trace, battle.detector);

  trace.push("fighters:");
  traceFighters(trace, battle);

  trace.push("threats:");
  traceThreats(trace, battle);

  console.log(trace.join(" "));
}

function traceLines(trace, battle) {
  const lines = new Set();

  for (const line of battle.lines) {
    let count = 0;

    for (const fighter of battle.fighters) {
      if (fighter.zone === line.zone) {
        count++;
      }
    }

    trace.push(line.zone.name, count, "/", line.fighters.length);
    lines.add(line.zone);
  }

  const inactive = new Map();

  for (const fighter of battle.fighters) {
    if (!lines.has(fighter.zone)) {
      increment(inactive, fighter.zone.name);
    }
  }

  if (inactive.size) {
    trace.push("|");

    for (const [zone, count] of inactive) {
      trace.push(zone, count);
    }
  }
}

function traceDetector(trace, detector) {
  if (!detector || !detector.assignee) return;

  trace.push(detector.assignee.zone.name);
}

function traceFighters(trace, battle) {
  const count = new Map();
  const hire = new Map();
  const deploy = new Set();
  const rally = new Set();

  for (const fighter of battle.fighters) {
    if (fighter.assignee) {
      increment(count, fighter.assignee.zone.name);

      if (battle.zones.has(fighter.assignee.zone)) {
        deploy.add(fighter.assignee.zone.name);
      } else {
        rally.add(fighter.assignee.zone.name);
      }
    } else {
      increment(hire, fighter.zone.name);
    }
  }

  if (deploy.size) {
    for (const zone of deploy) {
      trace.push(zone, count.get(zone));
    }

    trace.push("deployed");
  }

  if (rally.size) {
    trace.push("|");

    for (const zone of rally) {
      trace.push(zone, count.get(zone));
    }

    trace.push("rallying");
  }

  if (hire.size) {
    trace.push("| hire:");

    for (const [zone, count] of hire) {
      trace.push(zone, count);
    }
  }
}

function traceThreats(trace, battle) {
  const threats = new Map();

  for (const one of battle.zones) {
    for (const enemy of one.threats) {
      increment(threats, enemy.type.name);
    }
  }

  for (const [threat, count] of threats) {
    trace.push(threat, count);
  }
}

function increment(map, key) {
  const value = map.get(key);

  map.set(key, value ? value + 1 : 1);
}
