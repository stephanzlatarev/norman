import { Depot, Job, Memory, Order } from "../imports.js";

export default class WallKeeper extends Job {

  constructor(keeperType, wallSite) {
    super(keeperType);

    this.zone = Depot.home;
    this.priority = 100;

    this.rally = wallSite;
  }

  // Order 6=Cheer, 7=Dance
  execute() {
    const warrior = this.assignee;

    if (!warrior.isAlive) return this.close(false);

    if (this.rally && shouldBlockWall()) {
      const wy = (this.rally.dy > 0) ? this.rally.y + 1.5 : this.rally.y - 1.5;
      Order.hold(warrior, { x: this.rally.x, y: wy });
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

function shouldBlockWall() {
  // While siege defense is active, always block the wall. Our warriors need to stay behind the walls.
  // TODO: Check if some of our warriors are outside the wall and allow the wall to open for them to get back in.
  if (Memory.DeploymentOutreach === Memory.DeploymentOutreachSiegeDefense) return true;

  // If any enemy is already inside the base, block the wall so that other enemies can't get in
  if (Depot.home.enemies.size) return true;

  // If any enemy is in firing range, block the wall
  for (const sector of Depot.home.horizon) {
    if (sector.enemies.size) return true;
  }

  // If any warrior is attacking, block the wall gate so that it doesn't exit
  for (const warrior of Depot.home.warriors) {
    if ((warrior.order.abilityId === 23) && warrior.order.targetUnitTag) return true;
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
