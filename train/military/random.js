
export default class RandomPlayer {

  constructor(name) {
    this.name = name;
  }

  start() {
  }

  deploy(military) {
    const deployment = [];
    let army = 0;

    for (let i = 0; i < military.length; i++) {
      if (military[i] >= 0.1) {
        army += military[i];
      }

      deployment.push(0);
    }

    for (let i = 0; i < army; i++) {
      const spot = Math.floor(100 * Math.random());
      deployment[spot]++;
    }

    return deployment;
  }

}
