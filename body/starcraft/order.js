import Memory from "../../code/memory.js";

const orders = [];

export default class Order extends Memory {

  // The unit to execute this order
  unit;

  // The ability to use to execute this order
  ability;

  // Either unit or position
  target;

  status = 0;
  isConfirmed = false;
  isFailed = false;

  constructor(unit, ability, target) {
    super();

    this.unit = unit;
    this.ability = ability;
    this.target = target;

    orders.push(this);
  }

  command() {
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
    this.result(0);
  }

  result(status) {
    this.status = status;
    this.isFailed = (status !== 1);

    if (this.isFailed) {
      this.isConfirmed = false;
      this.remove();

      console.log("ERROR:", this.toString(), ">>", status);
    } else if ((this.ability !== 16) && (this.ability !== 3674)) {
      console.log("OK:", this.toString());
    }
  }

  // Verify if the order is taken and if taken then remove it.
  confirm() {
    if (this.unit && !this.unit.isAlive) {
      // The unit meanwhile died
      this.result(0);
    } else {
      // TODO: Check if expected result is seen in current observation
      this.isConfirmed = true;

      this.remove();
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
