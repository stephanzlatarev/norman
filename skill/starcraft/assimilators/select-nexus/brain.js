
export default class Brain {

  react(input) {
    const nexus = input[0];
    const nexusAssimilators = input[1];
    const alternative = input[5] ? input[5] : input[2];
    const alternativeAssimilators = input[5] ? input[6] : input[3];

    if (nexusAssimilators === 2) {
      // This nexus already has two assimilators
      return;
    }

    if (!alternative || (nexusAssimilators < alternativeAssimilators)) {
      return [1, nexus, nexusAssimilators];
    }
  }

}
