
export default class Brain {

  react(input) {
    const locationX = input[0];
    const locationY = input[1];
    const nexusX = input[2];
    const nexusY = input[3];

    if ((Math.abs(locationX - nexusX) < 5) && (Math.abs(locationY - nexusY) < 5)) {
      return [-1];
    }
  }

}
