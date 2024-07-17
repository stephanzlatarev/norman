import Job from "../job.js";
import Order from "../order.js";
import Battle from "../battle/battle.js";

export default class Fight extends Job {

  constructor(battle, warrior) {
    super(warrior);

    this.battle = battle;
    this.priority = battle.priority;
    this.zone = battle.zone;
    this.details = this.summary + " " + battle.zone.name;
    this.isCommitted = false;
    this.isDeployed = false;

    if (battle) {
      battle.fighters.push(this);
    }
  }

  direct(position) {
    this.position = position;
    this.target = position ? position.target : null;
    this.isDeployed = false;
  }

  execute() {
    const warrior = this.assignee;
    const mode = this.battle.mode;

    // Keep target in sync with position target
    if (this.position && (this.target !== this.position.target)) {
      this.target = this.position.target;
    }

    if (!warrior.isAlive) {
      console.log("Warrior", warrior.type.name, warrior.nick, "died in", this.details);
      this.assignee = null;
      this.isDeployed = false;
    } else if (!this.position) {
      // The warrior is just hired but the fight is not yet directed to a position
      console.log("Warrior", warrior.type.name, warrior.nick, "is idle in", this.details);
    } else if (this.target && (mode === Battle.MODE_FIGHT) && this.battle.frontline.zones.has(warrior.zone)) {

      if (warrior.weapon.cooldown) {
        if (this.target.type.rangeGround > warrior.type.rangeGround) {
          // When target has larger range step towards it
          orderMove(warrior, this.target.body);
        } else {
          // Otherwise, step back
          orderMove(warrior, this.position);
        }
      } else if (this.target.lastSeen < warrior.lastSeen) {
        if (isClose(warrior.body, this.target.body)) {
          // Cannot hit this target. Either it's hidden and we don't have detection, or it's gone
          this.target.zone.threats.delete(this.target);
        } else {
          // Move closer to see the target so that warrior can attack it
          orderMove(warrior, this.target.body);
        }
      } else {
        orderAttack(warrior, this.target);
      }

      this.isDeployed = true;
    } else if (this.battle.frontline.isInThreatsRange(warrior)) {
      // Protect warrior by moving to closest frontline position
      const position = findClosestPosition(warrior, this.battle.frontline);

      if (position && (position !== this.position)) {
        this.direct(position);
      }

      orderMove(warrior, this.position);

      this.isDeployed = true;
    } else if (this.isDeployed || (warrior.zone === this.position.zone)) {
      orderMove(warrior, this.position);

      if (!this.isDeployed && isSamePosition(warrior.body, this.position)) {
        this.isDeployed = true;
      }
    } else if (this.position.entrance && this.position.entrance.length) {
      // Rally to fight position by moving along the entrance path
      const path = this.position.entrance;

      for (let i = 0; i < path.length; i++) {
        const point = path[i];
        const isCloseToPoint = isClose(warrior.body, point);
        const isInPointZone = point.isCorridor ? isCloseToPoint : (warrior.zone === point);

        if (isInPointZone || (i === path.length - 1)) {
          if ((point === this.checkpoint) || isCloseToPoint) {
            this.checkpoint = point;

            if (i > 0) {
              orderMove(warrior, path[i - 1]);
            } else {
              orderMove(warrior, this.position);
            }
          } else {
            // TODO: If moving to entrance root and warrior is in battle zone, it should first get out of the battle zone and then follow the local zone entrance path
            // TODO: If moving to entrance root and warrior on the other side of the battle zone, it should follow the local zone entrance path
            orderMove(warrior, point);
          }

          break;
        }
      }
    } else {
      orderMove(warrior, this.position);
    }
  }

  close(outcome) {
    orderStop(this.assignee);

    super.close(outcome);
  }

}

function orderAttack(warrior, enemy) {
  if (!warrior || !enemy) return;
  if (!warrior.type.damageGround && !warrior.type.damageAir) return;

  if ((warrior.order.abilityId !== 23) || (warrior.order.targetUnitTag !== enemy.tag)) {
    new Order(warrior, 23, enemy);
  }
}

function orderMove(warrior, pos) {
  if (!warrior || !warrior.order || !pos) return;
  if (isSamePosition(warrior.body, pos)) return; // Note that here it's OK if warrior has other orders as long as it's at the right position.

  if ((warrior.order.abilityId !== 16) || !warrior.order.targetWorldSpacePos || !isSamePosition(warrior.order.targetWorldSpacePos, pos)) {
    new Order(warrior, 16, pos);
  }
}

function orderStop(warrior) {
  if (!warrior) return;

  if (warrior.order.abilityId) {
    new Order(warrior, 3665).accept(true);
  }
}

function findClosestPosition(warrior, frontline) {
  const body = warrior.body;
  let closestPosition;
  let closestDistance = Infinity;

  if (warrior.type.attackGround) {
    for (const position of frontline.groundToGround) {
      const distance = Math.abs(position.x - body.x) + Math.abs(position.y - body.y);

      if (distance < closestDistance) {
        closestPosition = position;
        closestDistance = distance;
      }
    }
  }

  if (warrior.type.attackAir) {
    for (const position of frontline.groundToAir) {
      const distance = Math.abs(position.x - body.x) + Math.abs(position.y - body.y);

      if (distance < closestDistance) {
        closestPosition = position;
        closestDistance = distance;
      }
    }
  }

  return closestPosition;
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 1) && (Math.abs(a.y - b.y) < 1);
}

function isClose(a, b) {
  return (Math.abs(a.x - b.x) < 5) && (Math.abs(a.y - b.y) < 5);
}
