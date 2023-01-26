
export default class Brain {

  react(input) {
    const isOperational = input[0];
    const armorLevel = input[1];
    const weaponsLevel = input[2];
    const shieldsLevel = input[3];
    const orders = input[4];

    if (isOperational && (orders === 0)) {
      if (!weaponsLevel) return [-1, 1, -1];
      if (!armorLevel) return [1, -1, -1];
      if (!shieldsLevel) return [-1, -1, 1];
    }
  }

}
