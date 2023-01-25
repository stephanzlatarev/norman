
export default class Brain {

  react(input) {
    const baseX = input[0];
    const baseY = input[1];
    const cybernetics = input[2];
    const nexus = input[3];
    const alternative = input[5];

    if (!alternative && baseX && baseY && !cybernetics) {
      return [1, nexus];
    }
  }

}
