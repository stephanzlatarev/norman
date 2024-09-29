import Job from "../job.js";
import Mission from "../mission.js";
import Battle from "../battle/battle.js";
import traceBattle from "../battle/trace.js";

const INTERVAL = 224;
let loop = 0;

export default class BattleTraceMission extends Mission {

  run() {
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

}
