
export default class Brain {

  react(input) {
    const baseX = input[0];
    const baseY = input[1];
    const nexus = input[2];
    const alternative = input[4];

    if (!alternative && baseX && baseY) {
      return [1, nexus];
    }
  }

}
