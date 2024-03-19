import Memory from "../../code/memory.js";
import Units from "./units.js";

const orders = [];

const STATUS_DEAD = -1;
const STATUS_EMPTY = -2;
const STATUS_ABORT = -3;

export default class Order extends Memory {

  // The unit to execute this order
  unit;

  // The ability to use to execute this order
  ability;

  // Either unit or position
  target;

  status = 0;
  isIssued = false;
  isAccepted = false;
  isRejected = false;

  constructor(unit, ability, target, checkIsAccepted) {
    super();

    this.unit = unit;
    this.ability = ability;
    this.target = target;
    this.checkIsAccepted = checkIsAccepted;

    if (unit.todo) {
      // Abort the previous order for this unit
      unit.todo.abort();
    }
    unit.todo = this;

    orders.push(this);
  }

  command() {
    // Don't repeat commands
    if (this.isIssued) return;

    if (this.unit && this.unit.isAlive && this.ability) {
      if (this.target) {
        if (this.target.tag) {
          return { unitTags: [this.unit.tag], abilityId: this.ability, targetUnitTag: this.target.tag, queueCommand: false };
        } else if (this.target.x && this.target.y) {
          return { unitTags: [this.unit.tag], abilityId: this.ability, targetWorldSpacePos: this.target, queueCommand: false };
        }
      } else {
        return { unitTags: [this.unit.tag], abilityId: this.ability, queueCommand: false };
      }
    }

    // Close the order when no command is issued
    this.result(STATUS_EMPTY);
  }

  abort() {
    console.log("INFO: Abort order for", this.unit.type.name, this.unit.nick,
      "action", this.ability, "of status", this.status, this.isIssued ? "issued" : "", this.isAccepted ? "accepted" : "", this.isRejected ? "rejected" : "");

    this.status = STATUS_ABORT;
    this.isIssued = false;
    this.isAccepted = false;
    this.isRejected = true;

    this.remove();
  }

  result(status) {
    this.status = status;
    this.isIssued = (status > 0);
    this.isRejected = (status !== 1);

    if (this.isRejected) {
      this.isAccepted = false;
      this.remove();

      console.log("ERROR:", this.toString(), ">>", status);
    }
  }

  // Check if the order is accepted and if so then remove it.
  check() {
    if (!this.isIssued) return;
    if (this.isAccepted) return;

    if (this.unit && !this.unit.isAlive) {
      // The unit meanwhile died
      this.result(STATUS_DEAD);
    } else {
      if (this.checkIsAccepted) {
        this.isAccepted = this.checkIsAccepted(this);
      } else if (checkIsAccepted(this)) {
        this.isAccepted = true;
      }

      if (this.isAccepted) {
        // This order moves from the unit's todo list to its active order list
        if (this.unit.todo === this) {
          this.unit.todo = null;
        }

        // This order is removed from to-be-issued list in memory
        this.remove();
      } else {
        console.log("INFO: Waiting for", this.unit.type.name, this.unit.nick,
          "to accept order", this.ability, "of status", this.status, this.isIssued ? "issued" : "", this.isAccepted ? "accepted" : "", this.isRejected ? "rejected" : "",
          "while busy with action", this.unit.order.abilityId);
      }
    }
  }

  remove() {
    const index = orders.indexOf(this);

    if (index >= 0) {
      orders.splice(index, 1);
    }
  }

  toString() {
    if (this.unit && this.ability) {
      return "Order: " + this.unit.type.name + " " + this.unit.nick + " ability: " + this.ability + " target: " + targetToString(this.target);
    }

    return "Empty order";
  }

  static list() {
    return orders;
  }

}

function checkIsAccepted(order) {
  const actual = order.unit.order;

  if (actual.abilityId !== order.ability) return false;

  if ((order.ability === 23) && !order.target.tag && actual.targetUnitTag) {
    const enemy = Units.enemies().get(actual.targetUnitTag);

    if (enemy && isClosePosition(order.target, enemy.body)) return true;
  }

  if (actual.targetUnitTag && (actual.targetUnitTag !== order.target.tag)) return false;
  if (actual.targetWorldPos && !isSamePosition(actual.targetWorldPos.x, order.target)) return false;

  return true;
}

function isSamePosition(a, b) {
  const bx = b.body ? b.body.x : b.x;
  const by = b.body ? b.body.y : b.y;

  return (Math.abs(a.x - bx) < 1) && (Math.abs(a.y - by) < 1);
}

function isClosePosition(a, b) {
  const bx = b.body ? b.body.x : b.x;
  const by = b.body ? b.body.y : b.y;

  return (Math.abs(a.x - bx) < 10) && (Math.abs(a.y - by) < 10);
}

function targetToString(target) {
  if (target) {
    if (target.type && target.nick) {
      return target.type.name + " " + target.nick;
    }

    if (target.x && target.y) {
      return target.x.toFixed(1) + ":" + target.y.toFixed(1);
    }
  }

  return "none";
}
