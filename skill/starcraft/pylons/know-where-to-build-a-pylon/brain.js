
export default class KnowWhereToBuildAPylonBrain {

  react(input) {
    const x = input[0];
    const y = input[1];
    const pylonCount = input[2];

    switch (pylonCount) {
      case 0: return [1, x + 3.5, y - 1.5];
      case 1: return [1, x - 3.5, y + 1.5];
      case 2: return [1, x + 1.5, y + 3.5];
      case 3: return [1, x - 1.5, y - 3.5];
      case 4: return [1, x + 3.5, y + 1.5];
      case 5: return [1, x - 3.5, y - 1.5];
      case 6: return [1, x - 1.5, y + 3.5];
      case 7: return [1, x + 1.5, y - 3.5];
    }
  }

}
