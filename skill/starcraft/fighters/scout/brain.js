
export default class Brain {

  react(input) {
    const location = input[0];
    const alternative = input[5] ? input[5] : input[1];
    const thisZealot = input[2];
    const partnerZealor = input[3];
    const enemyCount = input[4];

    if (enemyCount) {
      // There are enemies to be fought
      if (location === alternative) {
        return [-1];
      } else {
        return;
      }
    }

    if (partnerZealor && (partnerZealor !== thisZealot)) {
      // This location is already scouted
      return;
    }

    if (!alternative) {
      return [1];
    }
  }

}
