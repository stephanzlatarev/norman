
export default class Brain {

  react(input) {
    const x = input[0];
    const y = input[1];
    const sector = input[2];
    const side = input[3];
    const gateways = input[4];

    const slot = (sector + gateways * side) % 8;

    switch (slot) {
      case 0: return [1, x + 2, y + 6];
      case 1: return [1, x + 6, y + 2];
      case 2: return [1, x + 6, y - 2];
      case 3: return [1, x + 2, y - 6];
      case 4: return [1, x - 2, y - 6];
      case 5: return [1, x - 6, y - 2];
      case 6: return [1, x - 6, y + 2];
      case 7: return [1, x - 2, y + 6];
    }
  }

}
