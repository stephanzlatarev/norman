
export default class TrainProbeBrain {

  react(input) {
    const orders = input[0];
    const minerals = input[1];

    if ((orders === 0) && (minerals >= 50)) {
      return [1, minerals - 50];
    }
  }

}
