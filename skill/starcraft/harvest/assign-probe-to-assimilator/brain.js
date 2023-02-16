
export default class Brain {

  react(input) {
    const probe = input[0];
    const probe1 = input[1];
    const probe2 = input[2];
    const probe3 = input[3];
    const alternative = input[8];

    if (probe1 && probe2 && probe3 && (probe1 !== probe2) && (probe1 !== probe3) && (probe2 !== probe3)) {
      // assimilator is already fully harvested
      return [0, 0, 0, -1];
    }

    if (!alternative) {
      // Assign the probe and complete the goals
      return [1, 1, 1, -1, probe];
    }
  }

}
