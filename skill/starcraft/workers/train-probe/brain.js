
const PROBE_LIMIT = 64;

export default class Brain {

  react(input) {
    const isOperational = input[0];
    const orders = input[1];
    const minerals = input[2];
    const foodUsed = input[3];
    const foodCap = input[4];
    const probes = input[5];

    if (isOperational && (probes < PROBE_LIMIT) && (orders === 0) && (minerals >= 50) && (foodUsed < foodCap)) {
      return [1];
    }
  }

}
