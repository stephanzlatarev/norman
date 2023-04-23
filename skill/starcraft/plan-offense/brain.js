
const SCOUT = 1;
const FIGHT = 2;

export default class Brain {

  react(mode, warriors, enemyWarriorCount, enemyDummyCount) {
    const enemies = enemyWarriorCount + enemyDummyCount;

    if (!warriors && (enemies <= 1)) {
      return [0, 0, 0];
    } else if (!enemies) {
      // Scout
      if (mode !== SCOUT) console.log("Start scouting");
      return [1, 0, SCOUT];
    } else {
      // Fight
      if (mode !== FIGHT) console.log("Start fighting");
      return [0, 1, FIGHT];
    }
  }

}
