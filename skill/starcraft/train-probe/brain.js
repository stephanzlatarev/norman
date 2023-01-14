
export default class Brain {

  react(input) {
    const isOperational = input[0];
    const orders = input[1];
    const minerals = input[2];

    if (isOperational && (orders === 0) && (minerals >= 50)) {
      return [1, minerals - 50];
    }
  }

}
