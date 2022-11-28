
export default class UseChronoBoostBrain {

  react(input) {
    const nexus = input[0];
    const countOfProbes = input[1];
    const gateway = input[2];

    if (countOfProbes >= 16) {
      return [nexus, 3755, gateway];
    }
  }

}
