
export default class KnowHowToSelectMineralFieldForHarvestBrain {

  react(input) {
    const mineralX = input[0];
    const mineralY = input[1];
    const mineralNexusIsOperational = input[2];
    const mineralNexusX = input[3];
    const mineralNexusY = input[4];
    const harvesterX = input[5];
    const harvesterY = input[6];
    const probe1 = input[7];
    const probe2 = input[8];

    const previousSelection = input[9];
    const previousMineralX = input[10];
    const previousMineralY = input[11];
    const previousNexusIsOperational = input[12];
    const previousNexusX = input[13];
    const previousNexusY = input[14];

    if (!probe1 || !probe2 || (probe1 === probe2)) {
      if (!previousSelection) {
        // This is our first choice
        return [1, mineralX, mineralY, mineralNexusIsOperational, mineralNexusX, mineralNexusY];
      }

      if (!previousNexusIsOperational && mineralNexusIsOperational) {
        // We prefer operational nexuses
        return [1, mineralX, mineralY, mineralNexusIsOperational, mineralNexusX, mineralNexusY];
      }
      if (previousNexusIsOperational && !mineralNexusIsOperational) {
        // We prefer operational nexuses
        return;
      }

      const mineralNexusDistance = distance(harvesterX, harvesterY, mineralNexusX, mineralNexusY);
      const previousNexusDistance = distance(harvesterX, harvesterY, previousNexusX, previousNexusY);

      if (mineralNexusDistance < previousNexusDistance) {
        // We prefer mineral fields which are closer to the harvester
        return [1, mineralX, mineralY, mineralNexusIsOperational, mineralNexusX, mineralNexusY];
      }

      const mineralFieldDistance = distance(mineralX, mineralY, mineralNexusX, mineralNexusY);
      const previousFieldDistance = distance(previousMineralX, previousMineralY, previousNexusX, previousNexusY);

      if (mineralFieldDistance < previousFieldDistance) {
        // We prefer mineral fields which are closer to the nexus
        return [1, mineralX, mineralY, mineralNexusIsOperational, mineralNexusX, mineralNexusY];
      }

    }
  }

}

function distance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
