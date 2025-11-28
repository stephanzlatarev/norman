import Job from "../job.js";
import Units from "../units.js";
import Battle from "./battle.js";
import Score from "../memo/score.js";

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

  traceArmyScore();
  traceWarriorAssignments();

  loop = INTERVAL;
}

export function traceBattle(battle, event) {
  const trace = [];

  trace.push("[battle]", battle.front.name);

  if (event) trace.push(event);

  trace.push("perimeter:", battle.front.perimeterLevel);
  trace.push("rally:", battle.rally.name);
  trace.push("sectors:", [...battle.sectors].map(sector => sector.name).join());
  trace.push("balance:", battle.deployedBalance.toFixed(2), "/", battle.recruitedBalance.toFixed(2));
  trace.push("mode:", battle.mode);

  trace.push("detector:");
  traceDetector(trace, battle.detector);

  trace.push("fighters:");
  traceFighters(trace, battle);

  trace.push("threats:");
  traceThreats(trace, battle);

  console.log(trace.join(" "));
}

function traceDetector(trace, detector) {
  if (!detector || !detector.assignee) return;

  trace.push(detector.assignee.zone.name);
}

function traceFighters(trace, battle) {
  const types = new Set();
  const count = new Map();
  const hire = new Map();
  const deploy = new Set();
  const rally = new Set();

  for (const fighter of battle.fighters) {
    types.add(fighter.agent.type.name);

    if (fighter.assignee) {
      increment(count, fighter.assignee.zone.name);

      if (battle.sectors.has(fighter.assignee.sector)) {
        deploy.add(fighter.assignee.zone.name);
      } else {
        rally.add(fighter.assignee.zone.name);
      }
    } else {
      increment(hire, fighter.zone.name);
    }
  }

  for (const type of types) {
    trace.push(type);
  }

  if (deploy.size) {
    trace.push("|");

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

  for (const one of battle.sectors) {
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

function traceArmyScore() {
  console.log(
    "Army value:", Score.currentValueArmy,
    "Killed:", Score.killedValueArmy,
    "Lost:", Score.lostValueArmy,
  );
}

function traceWarriorAssignments() {
  console.log("Warrior assignments:");
  for (const warrior of Units.warriors().values()) {
    console.log("-", warrior.type.name, warrior.nick,
      "zone:", warrior.zone ? warrior.zone.name : "-",
      "job:", warrior.job ? warrior.job.details : "-",
      "priority:", warrior.job ? warrior.job.priority : "-",
      "deployed:", isWarriorDeployed(warrior.zone, warrior.job),
      "target:", getWarriorTarget(warrior.job),
      "order:", warrior.order ? JSON.stringify(warrior.order) : "-",
    );
  }
}

function isWarriorDeployed(sector, fight) {
  if (!sector) return "?";
  if (!fight) return "-";
  if (!fight.battle) return "no battle";
  if (!fight.battle.sectors) return "no battle sectors";

  return fight.battle.sectors.has(sector) ? "yes" : "no";
}

function getWarriorTarget(fight) {
  if (!fight) return "-";
  if (!fight.target) return "none";
  if (!fight.target.type) return "unknown";

  return fight.target.type.name + " " + fight.target.nick;
}
