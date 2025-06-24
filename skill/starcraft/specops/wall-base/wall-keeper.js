import { Depot, Job, Order } from "../imports.js";

export default class WallKeeper extends Job {

  constructor(keeperType, wallSite) {
    super(keeperType);

    this.zone = Depot.home;
    this.priority = 100;

    this.rally = wallSite;
    this.wall = wallSite.wall[0];
  }

  // Order 6=Cheer, 7=Dance
  execute() {
    const warrior = this.assignee;

    if (!warrior.isAlive) return this.close(false);

    if (areEnemiesApproaching()) {
      orderHold(warrior, this.wall);
      this.isHoldingPoisiton = true;
    } else {
      orderMove(warrior, this.rally, this.isHoldingPoisiton);
      this.isHoldingPoisiton = false;
    }
  }

  close(outcome) {
    const warrior = this.assignee;

    if (warrior && warrior.isAlive) {
      orderMove(warrior, this.rally, true);
    }

    super.close(outcome);
  }

}

function areEnemiesApproaching() {
  for (const zone of Depot.home.range.fire) {
    if (zone.enemies.size) return true;
  }
}

function orderHold(warrior, cell) {
  if (!warrior || !warrior.order || !warrior.body || !cell) return;

  const pos = { x: cell.x + 0.5, y: cell.y + 0.5 };
  if ((warrior.order.abilityId === 18) && isExactPosition(warrior.body, pos)) return;
  if ((warrior.order.abilityId === 23) && isSamePosition(warrior.body, pos)) return;

  if (!warrior.weapon.cooldown && isAttacked(warrior)) {
    new Order(warrior, 23, pos).accept(true);
  } else if ((warrior.order.abilityId !== 16) || !warrior.order.targetWorldSpacePos || !isSamePosition(warrior.order.targetWorldSpacePos, pos)) {
    new Order(warrior, 16, pos).queue(18);
  }
}

function orderMove(warrior, pos, force) {
  if (!warrior || !warrior.order || !warrior.body || !pos) return;
  if (!force && !warrior.order.abilityId && isNearPosition(warrior.body, pos)) return;

  if ((warrior.order.abilityId !== 16) || !warrior.order.targetWorldSpacePos || !isSamePosition(warrior.order.targetWorldSpacePos, pos)) {
    new Order(warrior, 16, pos);
  }
}

function isAttacked(warrior) {
  for (const enemy of Depot.home.enemies) {
    if (isSamePosition(warrior.body, enemy.body)) return true;
  }
}

function isExactPosition(a, b) {
  return (Math.abs(a.x - b.x) <= 0.1) && (Math.abs(a.y - b.y) <= 0.1);
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) <= 3) && (Math.abs(a.y - b.y) <= 3);
}

function isNearPosition(a, b) {
  return (Math.abs(a.x - b.x) <= 6) && (Math.abs(a.y - b.y) <= 6);
}
