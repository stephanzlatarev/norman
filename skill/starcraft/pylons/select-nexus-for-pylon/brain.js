
export default class Brain {

  react(input) {
    const nexus = input[0];
    const nexusPylons = input[1];
    const alternative = input[5] ? input[5] : input[2];
    const alternativePylons = input[5] ? input[6] : input[3];

    if (!alternative || (nexusPylons < alternativePylons)) {
      return [1, nexus, nexusPylons];
    }
  }

}
