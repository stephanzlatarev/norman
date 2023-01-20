
export default class Brain {

  react(input) {
    let minerals = input[0];
    let vespene = input[1];
    let foodUsed = input[2];

    const nexuses = input[3] + input[4];
    const pylons = input[5] + input[6];
    const assimilators = input[7] + input[8];
    const gateways = input[9] + input[10];
    const cybernetics = input[11] + input[12];

    const progress = {
      nexuses: input[4],
      pylons: input[6],
      assimilators: input[8],
      gateways: input[10],
      cybernetics: input[12],
    };

    const order = {
      nexuses: -1,
      pylons: -1,
      assimilators: -1,
      gateways: -1,
      cybernetics: -1,
    };

    // First priority is pylons
    const foodThreshold = nexuses * 15 + pylons * 8 - 10;
    if (!progress.nexuses &&
      (minerals >= 100) && (foodUsed >= foodThreshold) && (pylons < nexuses * 6) &&
      ((pylons < 1) || ((nexuses >= 2) && (gateways >= 1))) // Don't build a second pylon before the second nexus and first gateway are started 
    ) {
      order.pylons = 1;
      minerals -= 300;
    }

    // Next priority is nexuses
    if (!progress.nexuses && (minerals >= 300) && (nexuses <= pylons)) {
      order.nexuses = 1;
      minerals -= 300;
    }

    // Next priority is gateways
    if (!progress.gateways && (nexuses > 1) && (minerals >= 150) && (gateways < nexuses * 2)) {
      order.gateways = 1;
      minerals -= 150;
    }

    // Next priority is assimilators
    if (!progress.assimilators && (minerals >= 75) && (nexuses > 1) && (assimilators < nexuses * 2)) {
      order.assimilators = 1;
      minerals -= 75;
    }

    // Next priority is cybernetic cores
    if (!cybernetics && !progress.cybernetics && (minerals >= 200) && gateways) {
      order.cybernetics = 1;
      minerals -= 200;
    }

    return [
      1, 1,
      order.nexuses, order.pylons, order.assimilators,
      order.gateways, order.cybernetics,
    ];
  }

}
