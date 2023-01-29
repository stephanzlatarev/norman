
export default class Brain {

  react(input) {
    const homeX = input[0];
    const homeY = input[1];
    const warriors = input[2];
    const enemies = input[3];
    const enemyX = input[4];
    const enemyY = input[5];
    const nexuses = input[6];

    return ((nexuses === 1) && (enemies > 1) && !warriors && near(enemyX, enemyY, homeX, homeY, 10)) ? [1] : [-1];
  }

}

function near(x1, y1, x2, y2, distance) {
  return (Math.abs(x1 - x2) <= distance) && (Math.abs(y1 - y2) <= distance);

}
