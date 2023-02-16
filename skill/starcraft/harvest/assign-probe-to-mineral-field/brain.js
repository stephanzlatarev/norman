
export default class Brain {

  react(input) {
    const probe = input[0];
    const alternative = input[4];

    if (!alternative) {
      // Assign the probe and complete the goal
      return [1, 1, -1, probe];
    }
  }

}
