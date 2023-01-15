
export default class KnowHowToSelectMineralFieldForHarvestBrain {

  react(input) {
    const mineralX = input[0];
    const mineralY = input[1];
    const mineralNexusIsOperational = input[2];
    const harvesterX = input[3];
    const harvesterY = input[4];
    const probe1 = input[5];
    const probe2 = input[6];

    const previousSelection = input[7];
    const previousMineralX = input[8];
    const previousMineralY = input[9];
    const previousNexusIsOperational = input[10];

    if (!probe1 || !probe2 || (probe1 === probe2)) {
      if (!previousSelection) {
        // This is our first choice
        return [1, mineralX, mineralY, mineralNexusIsOperational];
      }

      if (!previousNexusIsOperational && mineralNexusIsOperational) {
        // We prefer operational nexuses
        return [1, mineralX, mineralY, mineralNexusIsOperational];
      }
      if (previousNexusIsOperational && !mineralNexusIsOperational) {
        // We prefer operational nexuses
        return;
      }

      const mineralDistance = distance(harvesterX, harvesterY, mineralX, mineralY);
      const previousDistance = distance(harvesterX, harvesterY, previousMineralX, previousMineralY);
      if (mineralDistance < previousDistance) {
        // We prefer mineral fields which are closer to the harvester
        return [1, mineralX, mineralY, mineralNexusIsOperational];
      }

    }
  }

}

function distance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
