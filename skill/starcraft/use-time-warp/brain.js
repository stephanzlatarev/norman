
export default class Brain {

  react(energy, mothershipX, mothershipY, enemies, enemyX, enemyY) {
    if ((enemies > 5) && enemyX && enemyY && (energy >= 100)) {
      const distanceToEnemy = distance(mothershipX, mothershipY, enemyX, enemyY);

      if (distanceToEnemy <= 100) {
        return [1, enemyX, enemyY];
      }
    }
  }

}

function distance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
