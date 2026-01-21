
export default class Space {

  // Units
  workers = new Set();
  buildings = new Set();
  warriors = new Set();
  enemies = new Set();

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
    if (unit.isDecoy) return this.buildings.delete(unit);

    const unitSpace = unit[this.type];

    if (unitSpace === this) return;
    if (unit.isHallucination) return;
    if (unit.isEnemy && !unit.isVisible) return;

    if (unit.isEnemy) {
      if (unitSpace) unitSpace.enemies.delete(unit);

      this.enemies.add(unit);
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
    if (unit.isHallucination) return;
    if (unit[this.type] !== this) return;

    if (unit.isEnemy) {
      this.enemies.delete(unit);
    } else if (unit.type.isWorker) {
      this.workers.delete(unit);
    } else if (unit.type.isWarrior) {
      this.warriors.delete(unit);
    } else if (unit.type.isBuilding) {
      this.buildings.delete(unit);
    }
  }

}
