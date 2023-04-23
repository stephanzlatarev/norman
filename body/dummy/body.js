
export default class Dummy {

  constructor(model) {
    this.model = model;
  }

  async attach() {
    this.world = this.model.add("World");

    const corner = this.model.add("Corner");
    this.model.add("corner-1").set("type", corner).set("x", 1).set("y", 1);
    this.model.add("corner-2").set("type", corner).set("x", 100).set("y", 1);
    this.model.add("corner-3").set("type", corner).set("x", 1).set("y", 100);
    this.model.add("corner-4").set("type", corner).set("x", 100).set("y", 100);

    const ball = this.model.add("Ball");
    this.balls = [];
    for (let i = 1; i <= 3; i++) {
      const dx = Math.random() * 20 - 10;
      const dy = Math.random() * 20 - 10;
      this.balls.push(this.model.add("ball-" + i).set("type", ball).set("x", 50).set("dx", dx).set("y", 50).set("dy", dy));
    }

    this.timer = setInterval(this.run.bind(this), 1000);
  }

  run() {
    this.world.set("time", new Date().getTime()).set("random", Math.floor(Math.random() * 10000) / 100);

    for (const ball of this.balls) {
      const x = ball.get("x") + ball.get("dx");
      const y = ball.get("y") + ball.get("dy");

      if (x <= 0) {
        ball.set("x", 0);
        ball.set("dx", Math.random() * 10);
      } else if (x >= 100) {
        ball.set("x", 100);
        ball.set("dx", - Math.random() * 10);
      } else {
        ball.set("x", x);
      }

      if (y <= 0) {
        ball.set("y", 0);
        ball.set("dy", Math.random() * 10);
      } else if (y >= 100) {
        ball.set("y", 100);
        ball.set("dy", - Math.random() * 10);
      } else {
        ball.set("y", y);
      }
    }
  }

  async detach() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

}
