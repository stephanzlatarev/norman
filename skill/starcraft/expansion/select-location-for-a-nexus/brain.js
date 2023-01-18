
export default class Brain {

  react(input) {
    const x = input[0];
    const y = input[1];

    if (x && y) {
      return [1, x, y];
    }
  }

}
