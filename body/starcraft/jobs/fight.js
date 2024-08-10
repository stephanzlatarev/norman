import Job from "../job.js";
import Order from "../order.js";
import Battle from "../battle/battle.js";
import { getHopZone } from "../map/route.js";

export default class Fight extends Job {

  constructor(battle, warrior, rally) {
    super(warrior);

    this.zone = rally;
    this.battle = battle;
    this.priority = battle.priority;
    this.summary += " " + battle.zone.name;
    this.details = this.summary;
    this.isCommitted = false;

    battle.fighters.push(this);
  }

  direct(target, station) {
    this.target = target;
    this.station = station;
  }

  execute() {
    const warrior = this.assignee;
    const mode = this.battle.mode;
    const isAttacking = warrior.isAlive && this.target && ((mode === Battle.MODE_FIGHT) || (mode === Battle.MODE_SMASH)) && this.battle.zones.has(warrior.zone);

    if (!warrior.isAlive) {
      console.log("Warrior", warrior.type.name, warrior.nick, "died in", this.details);
      this.assignee = null;
    } else if (isAttacking) {

      if (warrior.weapon.cooldown) {
        // TODO: Do for ground or air range depending on the type of the target
        if (this.target.type.rangeGround > warrior.type.rangeGround) {
          // When target has larger range step towards it
          orderMove(warrior, this.target.body);
        } else if (this.station) {
          // Otherwise, step back to the assigned station
          orderMove(warrior, this.station, 3);
        } else {
          // Default to stepping back to the rally point
          orderMove(warrior, getRallyPoint(this.zone));
        }
      } else if (this.target.lastSeen < warrior.lastSeen) {
        if (isClose(warrior.body, this.target.body, 5)) {
          // Cannot hit this target. Either it's hidden and we don't have detection, or it's gone
          this.target.zone.threats.delete(this.target);
        } else {
          // Move closer to see the target so that warrior can attack it
          orderMove(warrior, this.target.body);
        }
      } else {
        orderAttack(warrior, this.target);
      }

    } else if (!this.battle.zones.has(warrior.zone)) {
      // Rally to rally point by moving along the route hops
      const hop = getHopZone(warrior.cell, this.zone.cell);

      orderMove(warrior, hop ? hop : getRallyPoint(this.zone), 3);
    } else {
      orderMove(warrior, getRallyPoint(this.zone), 3);
    }

    this.isCommitted = isAttacking;
  }

  close(outcome) {
    orderStop(this.assignee);

    const index = this.battle.fighters.indexOf(this);
    if (index >= 0) {
      this.battle.fighters.splice(index, 1);
    }

    super.close(outcome);
  }

}

function getRallyPoint(zone) {
  return zone.isDepot ? zone.exitRally : zone;
}

function orderAttack(warrior, enemy) {
  if (!warrior || !enemy) return;
  if (!warrior.type.damageGround && !warrior.type.damageAir) return;

  if ((warrior.order.abilityId !== 23) || (warrior.order.targetUnitTag !== enemy.tag)) {
    new Order(warrior, 23, enemy);
  }
}

function orderMove(warrior, pos, span) {
  if (!warrior || !warrior.order || !pos) return;
  if (isClose(warrior.body, pos, span || 1)) return; // Note that here it's OK if warrior has other orders as long as it's at the right position.

  if ((warrior.order.abilityId !== 16) || !warrior.order.targetWorldSpacePos || !isClose(warrior.order.targetWorldSpacePos, pos, 1)) {
    new Order(warrior, 16, pos);
  }
}

function orderStop(warrior) {
  if (!warrior) return;

  if (warrior.order.abilityId) {
    new Order(warrior, 3665).accept(true);
  }
}

function isClose(a, b, distance) {
  return (Math.abs(a.x - b.x) <= distance) && (Math.abs(a.y - b.y) <= distance);
}
