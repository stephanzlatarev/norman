
export default class UseChronoBoostBrain {

  react(input) {
    const nexusEnergy = input[0];

    // Add input[1]=<count of probes>. Use chronoboost on nexus only if count of probes < 16

    if (nexusEnergy >= 50) {
      return [1, nexusEnergy - 50];
    }
  }

}
