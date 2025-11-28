
const knownThreats = new Map();

export default class Space {

  // Units
  workers = new Set();
  buildings = new Set();
  warriors = new Set();
  enemies = new Set();
  threats = new Set();

  // Effects
  effects = new Set();

  constructor(type) {
    this.type = type;
  }

  addEffect(effect) {
    this.effects.add(effect);
  }

  clearEffects() {
    this.effects.clear();
  }

  addUnit(unit) {
    const unitSpace = unit[this.type];

    if (unitSpace === this) return;
    if (unit.isEnemy && !unit.isVisible) return;

    if (unit.isHallucination) {
      // Ignore the unit
    } else if (unit.isEnemy) {
      const altUnit = knownThreats.get(unit.tag);
      const altUnitSpace = altUnit ? altUnit[this.type] : null;

      if (altUnitSpace && ((altUnitSpace !== this) || (altUnit !== unit))) {
        altUnitSpace.enemies.delete(altUnit);
        altUnitSpace.threats.delete(altUnit);
      }

      if (unitSpace) {
        unitSpace.enemies.delete(unit);
        unitSpace.threats.delete(unit);
      }

      this.enemies.add(unit);
      this.threats.add(unit);

      knownThreats.set(unit.tag, unit);
    } else if (unit.type.isWorker) {
      if (unitSpace) unitSpace.workers.delete(unit);

      this.workers.add(unit);
    } else if (unit.type.isWarrior) {
      if (unitSpace) unitSpace.warriors.delete(unit);

      this.warriors.add(unit);
    } else if (unit.type.isBuilding) {
      if (unitSpace) unitSpace.buildings.delete(unit);

      this.buildings.add(unit);
    }

    unit[this.type] = this;
  }

  removeUnit(unit) {
    if (unit[this.type] !== this) return;

    if (unit.isHallucination) {
      // Ignore the unit
    } else if (unit.isEnemy) {
      this.enemies.delete(unit);
    } else if (unit.type.isWorker) {
      this.workers.delete(unit);
    } else if (unit.type.isWarrior && !unit.type.isWorker) {
      this.warriors.delete(unit);
    } else if (unit.type.isBuilding) {
      this.buildings.delete(unit);
    }
  }

}
