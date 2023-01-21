
export default class Brain {

  react(input) {
    const isEngaged = input[0];

    if (!isEngaged) {
      // Assign the probe and complete the goal
      return [1, -1];
    }
  }

}
