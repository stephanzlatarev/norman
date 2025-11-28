
export default class Corridor {

  constructor(type, via) {
    this.via = via;

    this.isAir = (type === "air");
    this.isChoke = (type === "choke");
    this.isCliff = (type === "cliff");
    this.isGround = (type === "ground");
    this.isRamp = (type === "ramp");
  }

}
