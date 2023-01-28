
export default class Brain {

  react(input) {
    let minerals = input[0];
    let vespene = input[1];
    let foodUsed = input[2];

    const baseWithoutPower = input[3];

    const complete = {
      nexuses: input[4],
      pylons: input[6],
      assimilators: input[8],
      gateways: input[10],
      forges: input[12],
      stargates: input[14],
      cybernetics: input[16],
      robotics: input[18],
      zealots: input[20],
      stalkers: input[22],
      sentries: input[24],
      phoenixes: input[26],
      observers: input[28],
      probes: input[30],
    };

    const progress = {
      nexuses: input[5],
      pylons: input[7],
      assimilators: input[9],
      gateways: input[11],
      forges: input[13],
      stargates: input[15],
      cybernetics: input[17],
      robotics: input[19],
      zealots: input[21],
      stalkers: input[23],
      sentries: input[25],
      phoenixes: input[27],
      observers: input[29],
      probes: input[31],
    };

    const order = {
      nexuses: -1,
      pylons: -1,
      assimilators: -1,
      gateways: -1,
      forges: -1,
      stargates: -1,
      cybernetics: -1,
      robotics: -1,
      zealots: -1,
      stalkers: -1,
      sentries: -1,
      phoenixes: -1,
      observers: -1,
      probes: -1,
      upgradeGroundUnits: - 1,
    };

    const nexuses = complete.nexuses + progress.nexuses;
    const pylons = complete.pylons + progress.pylons;
    const assimilators = complete.assimilators + progress.assimilators;
    const gateways = complete.gateways + progress.gateways;
    const forges = complete.forges + progress.forges;
    const stargates = complete.stargates + progress.stargates;
    const cybernetics = complete.cybernetics + progress.cybernetics;
    const robotics = complete.robotics + progress.robotics;
    const zealots = complete.zealots + progress.zealots;
    const stalkers = complete.stalkers + progress.stalkers;
    const sentries = complete.sentries + progress.sentries;
    const phoenixes = complete.phoenixes + progress.phoenixes;
    const observers = complete.observers + progress.observers;
    const probes = complete.probes + progress.probes;

    let foodFree = complete.nexuses * 15 + complete.pylons * 8 - foodUsed;

    // First priority is pylons
    const foodThreshold = complete.nexuses * 15 + pylons * 8 - 10;
    if (!progress.pylons &&
      (minerals >= 100) && (foodUsed >= foodThreshold) && (pylons < nexuses * 6) &&
      ((pylons < 1) || ((nexuses >= 2) && (gateways >= 1))) // Don't build a second pylon before the second nexus and first gateway are started 
    ) {
      // Build pylon to increase food for units
      order.pylons = 1;
      minerals -= 100;
    } else if ((nexuses >= 3) && baseWithoutPower) {
      // Build pylon to open the base for other structures
      order.pylons = 1;
      minerals -= 100;
    }

    // Next priority is nexuses
    if (!progress.nexuses && (minerals >= 300) && (nexuses <= pylons)) {
      order.nexuses = 1;
      minerals -= 400;
    }

    // Next priority is cybernetic cores
    if (!cybernetics && (minerals >= 200) && (complete.zealots > 0)) {
      order.cybernetics = 1;
      minerals -= 200;
    }

    // Next priority is robitcs facilities
    if (!robotics && complete.cybernetics && (minerals >= 150) && (vespene >= 100)) {
      order.robotics = 1;
      minerals -= 150;
      vespene -= 100;
    }

    // Next priority is forges
    if (!forges && (minerals >= 150) && cybernetics && (zealots + sentries + stalkers > 10)) {
      order.forges = 1;
      minerals -= 150;
    }

    // Next priority is gateways
    if (!progress.gateways && (nexuses > 1) && (minerals >= 150) && (gateways < 6)) {
      order.gateways = 1;
      minerals -= 150;
    }

    // Next priority is stargates
    if (!progress.stargates && cybernetics && (gateways >= 6) && (stargates + gateways < nexuses * 2) && (minerals >= 150) && (vespene >= 150)) {
      order.stargates = 1;
      minerals -= 150;
      vespene -= 150;
    }

    // Next priority is assimilators
    if (!progress.assimilators && (minerals >= 75) && (minerals > vespene) && (assimilators < complete.nexuses * 2)
        && (gateways > 0) && (nexuses > 1) && (!assimilators || complete.cybernetics)) {
      order.assimilators = 1;
      minerals -= 75;
    }

    // Next priority is probes
    if ((progress.probes < nexuses - progress.nexuses) && (probes < 82) && (minerals >= 50) && foodFree) {
      order.probes = 1;
      minerals -= 50;
      foodFree -= 1;
    }

    // Next priority is gateway units
    if (complete.gateways && (progress.zealots + progress.stalkers + progress.sentries < complete.gateways)) {
      const unit = selectGatewayUnit(
        zealots, 2,
        stalkers, (complete.cybernetics && complete.assimilators && (sentries >= 2)) ? 6 : 0,
        sentries, (complete.cybernetics && complete.assimilators) ? 1 : 0,
      );

      if (unit === "stalker") {
        if ((minerals >= 125) && (vespene >= 50) && (foodFree >= 2)) {
          order.stalkers = 1;
          minerals -= 125;
          vespene -= 50;
          foodFree -= 2;
        }
      } else if (unit === "sentry") {
        if ((minerals >= 50) && (vespene >= 100) && (foodFree >= 2)) {
          order.sentries = 1;
          minerals -= 50;
          vespene -= 100;
          foodFree -= 2;
        }
      } else if (unit === "zealot") {
        if ((minerals >= 100) && (foodFree >= 2)) {
          order.zealots = 1;
          minerals -= 100;
          foodFree -= 2;
        }
      }
    }

    // Next priority is robotics facility units
    if ((observers < 3) && complete.robotics && (progress.observers < complete.robotics)) {
      if ((minerals >= 25) && (vespene >= 75) && (foodFree >= 1)) {
        order.observers = 1;
        minerals -= 25;
        vespene -= 75;
        foodFree -= 1;
      }
    }

    // Next priority is stargate units
    if ((phoenixes < 4) && complete.stargates && (progress.phoenixes < complete.stargates)) {
      if ((minerals >= 150) && (vespene >= 100) && (foodFree >= 2)) {
        order.phoenixes = 1;
        minerals -= 150;
        vespene -= 100;
        foodFree -= 2;
      }
    }

    // Next priority is upgrade of units
    if ((minerals >= 100) && (vespene >= 100)) {
      order.upgradeGroundUnits = 1;
      minerals -= 100;
      vespene -= 100;
    }

    return [
      1, 1,
      order.nexuses, order.nexuses,
      order.pylons, order.pylons,
      order.assimilators, order.assimilators,
      order.gateways, order.gateways,
      order.forges, order.forges,
      order.stargates, order.stargates,
      order.cybernetics, order.cybernetics,
      order.robotics, order.robotics,
      order.zealots, order.zealots,
      order.stalkers, order.stalkers,
      order.sentries, order.sentries,
      order.phoenixes, order.phoenixes,
      order.observers, order.observers,
      order.probes, order.probes,
      order.upgradeGroundUnits,
    ];
  }

}

function selectGatewayUnit(zealots, zealotsRatio, stalkers, stalkersRatio, sentries, sentriesRatio) {
  if (stalkersRatio && (!zealotsRatio || (stalkers * zealotsRatio <= zealots * stalkersRatio)) && (!sentriesRatio || (stalkers * sentriesRatio <= sentries * stalkersRatio))) {
    return "stalker";
  } else if (sentriesRatio && (!zealotsRatio || (sentries * zealotsRatio <= zealots * sentriesRatio))) {
    return "sentry";
  } else {
    return "zealot";
  }
}
