
export default class Brain {

  react(input) {
    const vespene = input[0];
    const alternative = input[1];

    if (!alternative && vespene) {
      return [1, vespene];
    }
  }

}
