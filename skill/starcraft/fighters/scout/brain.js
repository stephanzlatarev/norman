
export default class Brain {

  react(input) {
    const alternative = input[3] ? input[3] : input[0];
    const thisZealot = input[1];
    const partnerZealor = input[2];

    if (partnerZealor && (partnerZealor !== thisZealot)) {
      // This location is already scouted
      return;
    }

    if (!alternative) {
      return [1];
    }
  }

}
