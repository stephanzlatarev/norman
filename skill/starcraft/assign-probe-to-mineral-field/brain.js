
export default class AssignProbeToMineralFieldBrain {

  react(input) {
    const probe1 = input[0];
    const probe2 = input[1];
    const oldMineralX = input[2];
    const oldMineralY = input[3];
    const oldNexusX = input[4];
    const oldNexusY = input[5];
    const newMineralX = input[6];
    const newMineralY = input[7];
    const newNexusX = input[8];
    const newNexusY = input[9];

    if (probe1 && probe2 && (probe1 !== probe2)) {
      // The mineral field is already assigned. Don't change assignment!
      return [0, 0];
    }

    if (!oldMineralX && !oldMineralY) {
      // The probe has no previous assignment. Assign to new mineral field!
      return [0, 1];
    }

    const oldMineralDistance = distance(oldNexusX, oldNexusY, oldMineralX, oldMineralY);
    const newMineralDistance = distance(newNexusX, newNexusY, newMineralX, newMineralY);

    if (newMineralDistance < oldMineralDistance) {
      // The probe has previous assignment but the new mineral field is closer to the nexus. Replace assignment to the new mineral field!
      return [-1, 1];
    }

    // Otherwise, don't change assignment!
    return [0, 0];
  }

}

// Calculate the square distance. This is good enough for comparisons
function distance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
