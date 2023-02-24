
let mode;

export default class Brain {

  react(input) {
    const warriors = input[0];
    const enemies = input[1] + input[2];

    if (!warriors) {
      return [-1, -1];
    } else if (!enemies) {
      // Scout
      if (mode !== "scout") console.log("Start scouting");
      mode = "scout";
      return [1, -1];
    } else {
      // Fight
      if (mode !== "fight") console.log("Start fighting");
      mode = "fight";
      return [-1, 1];
    }
  }

}
