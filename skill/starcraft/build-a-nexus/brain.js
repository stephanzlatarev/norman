
export default class BuildANexusBrain {

  react(input) {
    const builderX = input[0];
    const builderY = input[1];
    const directionX = input[2];
    const directionY = input[3];
    const location = input[4];

    if (builderX && builderY) {
      if (location) {
        // We have the builder and the exact location. Build the nexus!
        console.log("Ready to build nexus!");
        return [-1, -1, 1];
      } else if (directionX && directionY) {
        if (isClose(builderX, builderY, directionX, directionY)) {
          // We have the builder approaching the cluster. Select the exact location!
          console.log("Builder approaching cluster!");
          return [0, 1, 0];
        }

        // The builder is still away from the cluster. Move in the direction!
        console.log("Builder moving to cluster...");
        return [1, 0, 0];
      }
    }
  }

}

function isClose(x1, y1, x2, y2) {
  return (Math.abs(x1 - x2) < 5) && (Math.abs(y1 - y2) < 5);
}

// TODO:
// When there's a builder and a location and minerals are 100 less than needed, then move builder towards location
// When there's a builder and a location and minerals are enough, then command builder to build the nexus
