
export default class Brain {

  react(input) {
    const energy = input[0];
    const sentryX = input[1];
    const sentryY = input[2];
    const enemies = input[3];
    const enemyX = input[4];
    const enemyY = input[5];

    const guardian = input[6];
    const guardianX = input[7];
    const guardianY = input[8];

    if ((enemies > 2) && enemyX && enemyY && (energy >= 75)) {
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
