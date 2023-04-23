
const GOOD_LUCK = Array.from("Good luck!").map(c => c.charCodeAt(0));

export default class Brain {

  react(time) {
    if (time === 22) {
      return [0, ...GOOD_LUCK];
    }
  }

}
