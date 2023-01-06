
export default class BuildOnePylonBrain {

  react(input) {
    const pylonX = input[0];
    const pylonY = input[1];
    const locationX = input[2];
    const locationY = input[3];

    if ((Math.abs(locationX - pylonX) < 1) && (Math.abs(locationY - pylonY) < 1)) {
      // The pylon is built
      return [-1, 0];
    }

    return [0, 1];
  }

}
