
export default class Brain {

  react(input) {
    const probe = input[0];
    const isEngaged = input[1];
    const alternative = input[3];

    if (!isEngaged && !alternative) {
      // Assign the probe and complete the goal
      return [1, -1, probe];
    }
  }

}
