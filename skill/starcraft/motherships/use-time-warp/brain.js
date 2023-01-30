
export default class Brain {

  react(input) {
    const energy = input[0];
    const mothershipX = input[1];
    const mothershipY = input[2];
    const enemyX = input[3];
    const enemyY = input[4];

    if (enemyX && enemyY && (energy >= 100)) {
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
