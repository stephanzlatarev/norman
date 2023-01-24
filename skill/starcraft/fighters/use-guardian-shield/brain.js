
export default class Brain {

  react(input) {
    const energy = input[0];
    const sentryX = input[1];
    const sentryY = input[2];
    const enemyX = input[3];
    const enemyY = input[4];

    const guardian = input[5];
    const guardianX = input[6];
    const guardianY = input[7];

    if (enemyX && enemyY && (energy >= 75)) {
      const distanceToEnemy = distance(sentryX, sentryY, enemyX, enemyY);

      if (distanceToEnemy <= 100) {
        if (!guardian || (distanceToEnemy < distance(sentryX, sentryY, guardianX, guardianY))) {
          return [1, sentryX, sentryY];
        }
      }
    }
  }

}

function distance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
