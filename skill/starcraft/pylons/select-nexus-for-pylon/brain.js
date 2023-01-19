
export default class Brain {

  react(input) {
    const nexus = input[0];
    const baseX = input[1];
    const baseY = input[2];
    const nexusPylons = input[3];
    const alternative = input[7] ? input[7] : input[4];
    const alternativePylons = input[7] ? input[8] : input[5];

    if (!baseX || !baseY) {
      // This nexus doesn't have space for structures
      return;
    }

    if (!alternative || (nexusPylons < alternativePylons)) {
      return [1, nexus, nexusPylons];
    }
  }

}
