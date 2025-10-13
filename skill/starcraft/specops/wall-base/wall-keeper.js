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

    if (this.wall && areEnemiesApproaching()) {
      Order.hold(warrior, { x: this.wall.x + 0.5, y: this.wall.y + 0.5 });
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
  if (Depot.home.enemies.size) return true;

  for (const zone of Depot.home.range.fire) {
    if (zone.enemies.size) return true;
  }
}

function orderMove(warrior, pos, force) {
  if (!warrior || !warrior.order || !warrior.body || !pos) return;
  if (!force && !warrior.order.abilityId && isNearPosition(warrior.body, pos)) return;

  if ((warrior.order.abilityId !== 16) || !warrior.order.targetWorldSpacePos || !isSamePosition(warrior.order.targetWorldSpacePos, pos)) {
    new Order(warrior, 16, pos);
  }
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) <= 3) && (Math.abs(a.y - b.y) <= 3);
}

function isNearPosition(a, b) {
  return (Math.abs(a.x - b.x) <= 6) && (Math.abs(a.y - b.y) <= 6);
}
