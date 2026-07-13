import { Job, Score, Units, info } from "./imports.js";
import Battle from "./battle.js";

const INTERVAL = 224;
let loop = 0;

export default function() {
  if (loop-- > 0) return;

  const battles = new Set();
  const orphans = new Set();

  for (const battle of Battle.list(true)) {
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

  trace.push(battle.mode);
  trace.push(battle.rally.name, ">", battle.front.name);

  if (battle.isFocusBattle) trace.push("focus");
  if (battle.isOnlyBattle) trace.push("only");
  if (battle.isAmbushBattle) trace.push("ambush");
  if (battle.isSmallBattle) trace.push("small");
  if (battle.isAirBattle) trace.push("air");

  if (event) trace.push(event);

  trace.push("priority:", Math.floor(battle.priority));
  trace.push("perimeter:", battle.front.perimeterLevel.toFixed(2));
  trace.push("sectors:", [...battle.sectors].map(sector => sector.name).join());
  trace.push("balance:", battle.deployedBalance.toFixed(2), "/", battle.recruitedBalance.toFixed(2));

  trace.push("|");
  trace.push("detector:");
  traceDetector(trace, battle.detector);

  trace.push("fighters:");
  traceFighters(trace, battle);

  trace.push("|");
  trace.push("threats:");
  traceThreats(trace, battle.sectors);
  trace.push("contacts:");
  traceContacts(trace, battle.sectors);

  info("battles", trace.join(" "));
}

function traceDetector(trace, detector) {
  if (!detector || !detector.assignee) return;

  trace.push(detector.assignee.sector.name);
}

function traceFighters(trace, battle) {
  const types = new Set();

  for (const fighter of battle.fighters) {
    types.add(fighter.agent.type.name);
  }

  for (const type of types) {
    traceFighterType(trace, battle, type);
  }
}

function traceFighterType(trace, battle, type) {
  const count = new Map();
  const hire = new Map();
  const deploy = new Set();
  const rally = new Set();

  for (const fighter of battle.fighters) {
    if (fighter.agent.type.name !== type) continue;

    if (fighter.assignee) {
      increment(count, fighter.assignee.sector.name);

      if (battle.sectors.has(fighter.assignee.sector)) {
        deploy.add(fighter.assignee.sector.name);
      } else {
        rally.add(fighter.assignee.sector.name);
      }
    } else {
      increment(hire, fighter.zone.cell.sector.name);
    }
  }

  trace.push(type);

  if (deploy.size) {
    trace.push("deployed:");

    for (const sector of deploy) {
      trace.push(sector, count.get(sector));
    }
  }

  if (rally.size) {
    trace.push("rallying:");

    for (const sector of rally) {
      trace.push(sector, count.get(sector));
    }
  }

  if (hire.size) {
    trace.push("hire:");

    for (const [sector, amount] of hire) {
      trace.push(sector, amount);
    }
  }

  trace.push("·");
}

function traceContacts(trace, sectors) {
  const types = new Set();

  for (const sector of sectors) {
    for (const enemy of sector.contacts) {
      types.add(enemy.type.name);
    }
  }

  trace.push([...types].sort().join(" "));
}

function traceThreats(trace, sectors) {
  const types = new Set();

  for (const sector of sectors) {
    for (const enemy of sector.threats) {
      types.add(enemy.type.name);
    }
  }

  for (const type of types) {
    traceThreatType(trace, sectors, type);
  }
}

function traceThreatType(trace, sectors, type) {
  const count = new Map();

  for (const sector of sectors) {
    for (const enemy of sector.threats) {
      if (enemy.type.name !== type) continue;

      increment(count, enemy.sector.name);
    }
  }

  trace.push(type);

  for (const [sector, amount] of count) {
    trace.push(sector, amount);
  }

  trace.push("·");
}

function increment(map, key) {
  const value = map.get(key);

  map.set(key, value ? value + 1 : 1);
}

function traceArmyScore() {
  info(
    "strategy",
    "Army value:", Score.currentValueArmy,
    "Killed:", Score.killedValueArmy,
    "Lost:", Score.lostValueArmy,
  );
}

function traceWarriorAssignments() {
  info("battles", "Warrior assignments:");
  for (const warrior of Units.warriors().values()) {
    if (!warrior.isAlive) continue;
    if (!warrior.type.movementSpeed) continue;

    info("battles", "-", warrior.type.name, warrior.nick,
      "sector:", warrior.sector ? warrior.sector.name : "-",
      "zone:", warrior.zone ? warrior.zone.name : "-",
      "job:", warrior.job ? warrior.job.details : "-",
      "priority:", warrior.job ? warrior.job.priority : "-",
      "deployed:", isWarriorDeployed(warrior),
      "target:", getWarriorTarget(warrior),
      "order:", warrior.order ? JSON.stringify(warrior.order) : "-",
    );
  }
}

function isWarriorDeployed(warrior) {
  const sector = warrior.sector;
  const fight = warrior.job;

  if (!sector) return "?";
  if (!fight) return "-";
  if (!fight.battle) return "no battle";
  if (!fight.battle.sectors) return "no battle sectors";

  return fight.battle.sectors.has(sector) ? "yes" : "no";
}

function getWarriorTarget(warrior) {
  const fight = warrior.job;

  if (!fight) return "-";
  if (!fight.target) return "none";
  if (!fight.target.type) return "unknown";

  return fight.target.type.name + " " + fight.target.nick;
}
