
export default class ExpandBaseBrain {

  react(input) {
    const minerals = input[0];
    const countOfProbes = input[1];
    const countOfNexuses = input[2];

    if ((minerals >= 400) && (countOfProbes > countOfNexuses * 16)) {
      return [1, 880, 100, 100];
    }
  }

}
