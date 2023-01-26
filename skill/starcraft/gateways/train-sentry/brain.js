
export default class Brain {

  react(input) {
    const isOperational = input[0];
    const orders = input[1];

    if (isOperational && (orders === 0)) {
      return [1, 1];
    }
  }

}
