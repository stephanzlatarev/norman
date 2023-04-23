
export default class Brain {

  react(energy, sentryX, sentryY, enemies, enemyX, enemyY, guardianDistance) {
    if ((enemies > 2) && enemyX && enemyY && (energy >= 75)) {
      const distanceToEnemy = distance(sentryX, sentryY, enemyX, enemyY);

      if (distanceToEnemy <= 100) {
        if (!guardianDistance || (distanceToEnemy < guardianDistance)) {
          return [1, distanceToEnemy];
        }
      }
    }
  }

}

function distance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
