import Resources from "./memo/resources.js";

const orders = new Map();

const STATUS_DEAD = -1;
const STATUS_EMPTY = -2;
const STATUS_ABORT = -3;

const RETRY_AFTER = 3;

let ids = 1;

export default class Order {

  // The unit to execute this order
  unit;

  // The ability to use to execute this order
  ability;

  // Either unit or position
  target;

  // The expected resulting product of the order, if any
  output;

  // The order is compound when the expected resulting product depends on additional steps and the required resources must be blocked for those steps
  isCompound = false;

  // A follow-up order
  next;

  // The status of this order reflects the result of the command issued to the unit
  status = 0;

  // The game loop at which a command was issued to the unit
  timeIssued;

  isIssued = false;
  isAccepted = false;
  isRejected = false;

  constructor(subject, ability, target) {
    this.id = ids++;

    if (subject instanceof Order) {
      subject.next = this;
      this.unit = subject.unit;
    } else {
      if (subject.todo) {
        // Abort the previous order for this unit
        subject.todo.abort();
      }

      subject.todo = this;
      this.unit = subject;

      addOrder(this);
    }

    this.ability = ability;
    this.target = target;
  }

  expect(output) {
    this.output = output;

    return this;
  }

  replace(ability, target) {
    this.ability = ability;
    this.target = target;

    this.output = null;
    this.isCompound = false;

    this.next = null;

    this.checkIsAccepted = null;

    this.status = 0;
    this.timeIssued = null;

    this.isIssued = false;
    this.isAccepted = false;
    this.isRejected = false;

    addOrder(this);

    return this;
  }

  queue(ability, target) {
    return new Order(this, ability, target);
  }

  accept(check) {
    this.checkIsAccepted = (check === true) ? (() => true) : check;

    return this;
  }

  command() {
    if (this.isIssued) {
      if (!this.isAccepted && !this.isRejected && (Resources.loop > this.timeIssued + RETRY_AFTER)) {
        // Commands get lost in the arena. Retry them...
        log("INFO: Retrying command for", this.toString());
      } else {
        // Don't repeat commands
        return;
      }
    }

    if (this.unit && this.unit.isAlive && this.ability) {
      if (!this.unit.tag) {
        log("ERROR: Unit", this.unit.type ? this.unit.type.name : "-", this.unit.nick, "has no tag");
      } else if (this.target) {
        if (this.target.tag) {
          return { unitTags: [this.unit.tag], abilityId: this.ability, targetUnitTag: this.target.tag };
        } else if (this.target.x && this.target.y) {
          return { unitTags: [this.unit.tag], abilityId: this.ability, targetWorldSpacePos: { x: this.target.x, y: this.target.y } };
        }
      } else {
        return { unitTags: [this.unit.tag], abilityId: this.ability };
      }
    }

    // Close the order when no command is issued
    this.result(STATUS_EMPTY);
  }

  abort() {
    if (this.isIssued && !this.isAccepted && !this.isRejected) {
      this.isAccepted = (this.checkIsAccepted && this.checkIsAccepted(this)) || checkIsAccepted(this);

      if (!this.isAccepted) {
        log("INFO: Abort", this.toString());
      }
    }

    this.status = STATUS_ABORT;
    this.isAccepted = false;
    this.isRejected = true;

    this.remove();
  }

  result(status) {
    this.timeIssued = Resources.loop;
    this.status = status;
    this.isIssued = (status > 0);
    this.isRejected = (status !== 1);

    if (this.isRejected) {
      this.isAccepted = false;
      this.remove();

      if (this.unit && this.unit.isAlive && this.ability) log("ERROR:", this.toString(), ">>", status);
    }
  }

  // Check if the order is accepted and if so then remove it.
  check() {
    if (this.unit && !this.unit.isAlive) this.result(STATUS_DEAD);
    if (!this.isIssued) return;
    if (this.isAccepted) return;

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
    } else if (Resources.loop > this.timeIssued + 1) {
      // It's normal in a multi-player game that the order is picked up in the second game loop after it's issued. Anything beyond that will mean the the order may need to be retried
      log("INFO: Waiting for unit to accept", this.toString(), "while busy with", JSON.stringify(this.unit.order));
    }
  }

  remove() {
    orders.delete(this.unit.tag);

    if (this.unit.todo === this) {
      this.unit.todo = null;
    }
  }

  toString() {
    if (!this.unit) return "Order to no unit";
    if (!this.unit.tag) return "Order to unit without tag";
    if (!this.ability) return "Order without command";

    return [
      "Order #" + this.id,
      this.unit.type.name, this.unit.nick,
      "status:", this.status, this.isIssued ? "issued" : "", this.isAccepted ? "accepted" : "", this.isRejected ? "rejected" : "",
      "ability:", this.ability,
      "target:", targetToString(this.target),
    ].join(" ");
  }

  static list() {
    return orders.values();
  }

  static attack(unit, target) {
    if (!unit) return;

    // If the unit cannot attack then stop it so that it doesn't carry previous orders
    if (!target) return Order.stop(unit);
    if (!unit.type.damageGround && !unit.type.damageAir) return Order.stop(unit);

    // If there's the order is already pending then don't issue a new one
    if (unit.todo && (unit.todo.ability === 23) && (unit.todo.target === target)) return unit.todo;

    if (unit.order.abilityId === 23) {
      if (target.tag) {
        if (unit.order.targetUnitTag && (unit.order.targetUnitTag === target.tag)) return;
      } else if (target.x && target.y) {
        if (unit.order.targetUnitTag) return; // On a-move the unit targets the nearest enemy
        if (unit.order.targetWorldSpacePos && isSamePosition(unit.order.targetWorldSpacePos, target)) return;
      }
    }

    return new Order(unit, 23, target);
  }

  static MOVE_CLOSE_TO = 0b0001;
  static MOVE_NEAR_BY  = 0b0010;

  static move(unit, target, options) {
    if (!unit || !unit.order) return;

    // If the unit cannot attack then stop it so that it doesn't carry previous orders
    if (!target) return Order.stop(unit);

    const pos = target.body ? target.body : target;

    if (unit.todo && (unit.todo.ability === 16) && isSamePosition(unit.todo.target, pos)) return unit.todo;

    let distance = 1;
    if (options & Order.MOVE_CLOSE_TO) {
      distance = 3;
    } else if (options & Order.MOVE_NEAR_BY) {
      distance = 8;
    }
    if (!unit.order.abilityId && isClose(unit.body, pos, distance)) return;

    if ((unit.order.abilityId !== 16) || !unit.order.targetWorldSpacePos || !isSamePosition(unit.order.targetWorldSpacePos, pos)) {
      return new Order(unit, 16, { x: pos.x, y: pos.y });
    }
  }

  static hold(unit, target) {
    if (!unit || !unit.order || !unit.body) return;
    if (!target) return;

    if (isExactPosition(unit.body, target)) {
      if (unit.order.abilityId === 23) return;
      if (unit.weapon && !unit.weapon.cooldown) {
        const target = getWeakestTargetInFireRange(unit);

        if (target) {
          return Order.attack(unit, target);
        }
      }

      if (unit.order.abilityId === 18) return;
      return new Order(unit, 18);
    } else if ((unit.order.abilityId !== 16) || !unit.order.targetWorldSpacePos || !isExactPosition(unit.order.targetWorldSpacePos, target)) {
      return Order.move(unit, target);
    }
  }

  static stop(unit) {
    if (!unit) return;
    if (!unit.isAlive) return;
    if (unit.todo && (unit.todo.ability === 3665)) return unit.todo;

    if (unit.order.abilityId) {
      return new Order(unit, 3665).accept(true);
    }
  }

}

function addOrder(order) {
  const previous = orders.get(order.unit.tag);

  if (previous) {
    log("INFO: Overwrite", previous.toString());
    previous.abort();
  }

  orders.set(order.unit.tag, order);
}

function log(...line) {
  console.log(...line);
}

function checkIsAccepted(order) {
  const actual = order.unit.order;

  // Move command will be complete when the unit reaches the target position
  if (!actual.abilityId && (order.ability === 16) && isSamePosition(order.unit.body, order.target)) return true;

  // In all other cases we expect the actual order to be for the requested ability
  if (actual.abilityId !== order.ability) return false;

  // Basic attack command which doesn't aim at an enemy unit will aim at the nearest enemy regardless of the target location
  if ((order.ability === 23) && !order.target.tag && actual.targetUnitTag) return true;

  if (actual.targetUnitTag && (actual.targetUnitTag !== order.target.tag)) return false;
  if (actual.targetWorldSpacePos && !isSamePosition(actual.targetWorldSpacePos, order.target)) return false;

  return true;
}

function isExactPosition(a, b) {
  return (Math.abs(a.x - b.x) <= 0.1) && (Math.abs(a.y - b.y) <= 0.1);
}

function isSamePosition(a, b) {
  const bx = b.body ? b.body.x : b.x;
  const by = b.body ? b.body.y : b.y;

  return (Math.abs(a.x - bx) < 1) && (Math.abs(a.y - by) < 1);
}

function isClose(a, b, span) {
  return (Math.abs(a.x - b.x) <= span) && (Math.abs(a.y - b.y) <= span);
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}

function getWeakestTargetInFireRange(warrior) {
  if (!warrior || !warrior.zone) return false;

  let weakestTarget = null;

  for (const enemy of warrior.zone.enemies) {
    if (!isInFireRange(warrior, enemy)) continue;

    if (!weakestTarget || (enemy.armor.total < weakestTarget.armor.total)) {
      weakestTarget = enemy;
    }
  }

  return weakestTarget;
}

function isInFireRange(warrior, target, bufferRange = 0) {
  if (target.body.isGround && warrior.type.rangeGround) {
    return isInRange(warrior, target, warrior.type.rangeGround + bufferRange);
  } else if (target.body.isFlying && warrior.type.rangeAir) {
    return isInRange(warrior, target, warrior.type.rangeAir + bufferRange);
  }
}

function isInRange(warrior, target, range) {
  const squareDistance = calculateSquareDistance(warrior.body, target.body);
  const totalRange = warrior.body.r + range + target.body.r;
  const squareRange = totalRange * totalRange;

  return (squareDistance <= squareRange);
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
