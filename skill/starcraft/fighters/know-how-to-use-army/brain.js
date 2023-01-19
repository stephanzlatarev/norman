
export default class Brain {

  react(input) {
    const warriors = input[0];
    const enemies = input[1];

    if (!warriors) {
      return [-1, -1];
    } else if (!enemies) {
      // Scout
      return [1, -1];
    } else {
      // Fight
      return [-1, 1];
    }
  }

}
