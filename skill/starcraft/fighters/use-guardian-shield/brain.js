
export default class Brain {

  react(input) {
    const energy = input[0];
    const alreadySelectedSentry = input[1];

    if (!alreadySelectedSentry && (energy >= 75)) {
      return [1, 1];
    }
  }

}
