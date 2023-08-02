import { AttackJob } from "./job.js";

const DEFENDERS_PER_ENEMY = 3;
const THREAT_SQUARE_DISTANCE = 100;
const TRACK_SQUARE_DISTANCE = 36;

export default class Enemy {

  constructor(unit) {
    this.tag = unit.tag;
    this.pos = unit.pos;
    this.isActive = true;

    this.depot = null;
    this.attackers = [];
  }

  sync(depots, units) {
    const unit = units.get(this.tag);

    if (unit) {
      this.lastpos = this.pos;
      this.pos = unit.pos;

      if (this.depot) {
        if (!this.depot.isActive || !isEnemyCloseToDepot(this, this.depot)) {
          this.depot = null;
          this.attackers.length = 0;
        }
      } else if (!this.trackpos || (squareDistance(this.pos, this.trackpos) > TRACK_SQUARE_DISTANCE)) {
        this.trackpos = this.pos;

        for (const depot of depots) {
          if (depot.isActive && isEnemyCloseToDepot(this, depot)) {
            this.depot = depot;
            break;
          }
        }
      }

      for (let i = this.attackers.length - 1; i >= 0; i--) {
        if (!this.attackers[i].isActive) {
          this.attackers.splice(i, 1);
        }
      }

      return true;
    } else {
      this.isActive = false;
      return false;
    }
  }

  isThreat() {
    return this.isActive && !!this.depot;
  }

  shouldBeAttacked() {
    return this.isThreat() && (this.attackers.length < DEFENDERS_PER_ENEMY);
  }

  attack(worker) {
    worker.startJob(worker.depot, AttackJob, this);
    this.attackers.push(worker);
  }

}

function isEnemyCloseToDepot(enemy, depot) {
  return (squareDistance(enemy.pos, depot.pos) <= THREAT_SQUARE_DISTANCE);
}

function squareDistance(a, b) {
  return ((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}
