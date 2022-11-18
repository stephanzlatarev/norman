
export default class GreetBrain {

  react(input) {
    const time = input[0];
    const gameOver = input[1];

    if (time === 10) {
      return Array.from("Good luck!").map(c => c.charCodeAt(0));
    } else if (gameOver) {
      return Array.from("gg").map(c => c.charCodeAt(0));
    }
  }

}
