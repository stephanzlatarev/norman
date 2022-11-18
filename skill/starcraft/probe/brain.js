
export default class ProbeBrain {

  react(input) {
    const mode = input[0];
    const idleProbe = input[1];

    if (mode === "defend") {
      return [idleProbe];
    }
  }

}
