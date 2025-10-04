import Job from "../job.js";
import Order from "../order.js";

const BUSY_DISTANCE = 2;
const PUSH_DISTANCE = 1.5;

const MODE_IDLE = "idle";
const MODE_PUSH = "push";
const MODE_PUSHING = "pushing";
const MODE_PACKING = "packing";
const MODE_REAPING = "reaping";
const MODE_STORING = "storing";

const SPEED_MINING_PATHS = {
  6: [{"resource":{"x":0.5,"y":6},"roundtrip":105,"store":{"x":0.23974609375,"y":2.84228515625},"harvest":{"x":0.42578125,"y":5.134765625}}],
  7: [
    {"resource":{"x":0.5,"y":7},"roundtrip":121,"store":{"x":0.20849609375,"y":2.87353515625},"harvest":{"x":0.4345703125,"y":6.134521484375}},
    {"resource":{"x":0.5,"y":7},"block":{"x":-0.5,"y":6},"roundtrip":122,"store":{"x":0.400146484375,"y":2.85400390625},"harvest":{"x":0.801025390625,"y":6.1533203125}},
    {"resource":{"x":0.5,"y":7},"block":{"x":1.5,"y":6},"roundtrip":125,"store":{"x":0.08642578125,"y":2.8662109375},"harvest":{"x":0.175048828125,"y":6.126708984375}},
  ],
  16: [{"resource":{"x":1.5,"y":6},"roundtrip":107,"store":{"x":0.720458984375,"y":2.87158203125},"harvest":{"x":1.27978515625,"y":5.12744140625}}],
  17: [
    {"resource":{"x":1.5,"y":7},"roundtrip":121,"store":{"x":0.61328125,"y":2.8447265625},"harvest":{"x":1.3115234375,"y":6.130126953125}},
    {"resource":{"x":1.5,"y":7},"block":{"x":0.5,"y":6},"roundtrip":120,"store":{"x":0.9384765625,"y":2.839599609375},"harvest":{"x":1.821044921875,"y":6.125244140625}},
    {"resource":{"x":1.5,"y":7},"block":{"x":2.5,"y":6},"roundtrip":123,"store":{"x":0.52490234375,"y":2.8544921875},"harvest":{"x":1.12109375,"y":6.14404296875}},
  ],
  26: [{"resource":{"x":2.5,"y":6},"roundtrip":107,"store":{"x":1.16357421875,"y":2.791259765625},"harvest":{"x":2.1357421875,"y":5.1279296875}}],
  27: [
    {"resource":{"x":2.5,"y":7},"roundtrip":127,"store":{"x":1.02783203125,"y":2.867919921875},"harvest":{"x":2.187255859375,"y":6.131103515625}},
    {"resource":{"x":2.5,"y":7},"block":{"x":1.5,"y":6},"roundtrip":126,"store":{"x":1.36474609375,"y":2.65478515625},"harvest":{"x":2.813232421875,"y":6.15380859375}},
    {"resource":{"x":2.5,"y":7},"block":{"x":3.5,"y":6},"roundtrip":125,"store":{"x":0.96923828125,"y":2.873291015625},"harvest":{"x":2.06103515625,"y":6.13037109375}},
  ],
  36: [{"resource":{"x":3.5,"y":6},"roundtrip":117,"store":{"x":1.471435546875,"y":2.52099609375},"harvest":{"x":2.99072265625,"y":5.1298828125}}],
  37: [
    {"resource":{"x":3.5,"y":7},"roundtrip":125,"store":{"x":1.329833984375,"y":2.65673828125},"harvest":{"x":3.064453125,"y":6.130126953125}},
    {"resource":{"x":3.5,"y":7},"block":{"x":2.5,"y":6},"roundtrip":132,"store":{"x":1.652587890625,"y":2.369384765625},"harvest":{"x":3.83154296875,"y":6.17138671875}},
  ],
  46: [{"resource":{"x":4.5,"y":6},"roundtrip":121,"store":{"x":1.720947265625,"y":2.2919921875},"harvest":{"x":3.868896484375,"y":5.15966796875}}],
  47: [
    {"resource":{"x":4.5,"y":7},"roundtrip":131,"store":{"x":1.5576171875,"y":2.419677734375},"harvest":{"x":3.94677734375,"y":6.139892578125}},
    {"resource":{"x":4.5,"y":7},"block":{"x":3.5,"y":6},"roundtrip":137,"store":{"x":1.89453125,"y":2.128173828125},"harvest":{"x":4.81103515625,"y":6.154541015625}},
  ],
  55: [{"resource":{"x":5.5,"y":5},"roundtrip":125,"store":{"x":2.097900390625,"y":1.907470703125},"harvest":{"x":4.55078125,"y":4.13623046875}}],
  56: [
    {"resource":{"x":5.5,"y":6},"roundtrip":131,"store":{"x":1.919189453125,"y":2.093994140625},"harvest":{"x":4.712158203125,"y":5.1416015625}},
    {"resource":{"x":5.5,"y":6},"block":{"x":5.5,"y":5},"roundtrip":127,"store":{"x":1.75341796875,"y":2.263671875},"harvest":{"x":4.155517578125,"y":5.368408203125}},
  ],
  60: [{"resource":{"x":6.5,"y":0},"roundtrip":106,"store":{"x":2.859619140625,"y":0.0068359375},"harvest":{"x":5.144775390625,"y":0.0068359375}}],
  61: [{"resource":{"x":6.5,"y":1},"roundtrip":105,"store":{"x":2.86083984375,"y":0.444091796875},"harvest":{"x":5.14013671875,"y":0.790283203125}}],
  62: [{"resource":{"x":6.5,"y":2},"roundtrip":109,"store":{"x":2.87255859375,"y":0.88623046875},"harvest":{"x":5.1494140625,"y":1.581787109375}}],
  63: [
    {"resource":{"x":6.5,"y":3},"roundtrip":113,"store":{"x":2.7412109375,"y":1.266357421875},"harvest":{"x":5.173583984375,"y":2.386474609375}},
    {"resource":{"x":6.5,"y":3},"block":{"x":6.5,"y":2},"roundtrip":113,"store":{"x":2.664306640625,"y":1.36279296875},"harvest":{"x":5.133544921875,"y":2.62451171875}},
  ],
  64: [
    {"resource":{"x":6.5,"y":4},"roundtrip":119,"store":{"x":2.478271484375,"y":1.525390625},"harvest":{"x":5.247802734375,"y":3.229248046875}},
    {"resource":{"x":6.5,"y":4},"block":{"x":6.5,"y":3},"roundtrip":119,"store":{"x":2.371826171875,"y":1.644287109375},"harvest":{"x":5.136474609375,"y":3.56005859375}},
  ],
  65: [
    {"resource":{"x":6.5,"y":5},"roundtrip":129,"store":{"x":2.26123046875,"y":1.741455078125},"harvest":{"x":5.39697265625,"y":4.149658203125}},
    {"resource":{"x":6.5,"y":5},"block":{"x":6.5,"y":4},"roundtrip":131,"store":{"x":2.1484375,"y":1.880615234375},"harvest":{"x":5.132568359375,"y":4.489990234375}},
  ],
  70: [{"resource":{"x":7.5,"y":0},"roundtrip":119,"store":{"x":2.86767578125,"y":0},"harvest":{"x":6.14892578125,"y":0}}],
  71: [{"resource":{"x":7.5,"y":1},"roundtrip":123,"store":{"x":2.87451171875,"y":0.386962890625},"harvest":{"x":6.137451171875,"y":0.815673828125}}],
  72: [
    {"resource":{"x":7.5,"y":2},"roundtrip":119,"store":{"x":2.87353515625,"y":0.768798828125},"harvest":{"x":6.13720703125,"y":1.63427734375}},
    {"resource":{"x":7.5,"y":2},"block":{"x":6.5,"y":1},"roundtrip":120,"store":{"x":2.84814453125,"y":0.940673828125},"harvest":{"x":6.172607421875,"y":1.855224609375}},
  ],
  73: [
    {"resource":{"x":7.5,"y":3},"roundtrip":123,"store":{"x":2.818115234375,"y":1.12939453125},"harvest":{"x":6.155517578125,"y":2.46044921875}},
    {"resource":{"x":7.5,"y":3},"block":{"x":6.5,"y":2},"roundtrip":123,"store":{"x":2.64892578125,"y":1.36474609375},"harvest":{"x":6.1953125,"y":2.880859375}},
    {"resource":{"x":7.5,"y":3},"block":{"x":7.5,"y":2},"roundtrip":127,"store":{"x":2.805908203125,"y":1.216064453125},"harvest":{"x":6.133544921875,"y":2.652587890625}},
  ],
  74: [
    {"resource":{"x":7.5,"y":4},"roundtrip":127,"store":{"x":2.59765625,"y":1.38623046875},"harvest":{"x":6.19482421875,"y":3.302734375}},
    {"resource":{"x":7.5,"y":4},"block":{"x":6.5,"y":3},"roundtrip":131,"store":{"x":2.3564453125,"y":1.656005859375},"harvest":{"x":6.12939453125,"y":3.873291015625}},
    {"resource":{"x":7.5,"y":4},"block":{"x":7.5,"y":3},"roundtrip":133,"store":{"x":2.53515625,"y":1.4892578125},"harvest":{"x":6.12744140625,"y":3.593017578125}},
  ],
};

export default class HarvestMinerals extends Job {

  isHarvestMineralsJob = true;

  mode = MODE_IDLE;

  constructor(line, resource) {
    super("Probe");

    this.zone = line.zone;
    this.isBusy = false;

    this.setResource(line, resource);
  }

  setResource(line, resource) {
    this.line = line;
    this.zone = line.zone;
    this.priority = line.priority;
    this.target = resource;
    this.details = line.details;

    this.speedMiningPath = findSpeedMiningPath(this.zone.depot, resource);
  }

  accepts(unit) {
    return (unit.zone === this.zone);
  }

  assign(unit) {
    this.mode = MODE_IDLE;
    this.order = null;

    super.assign(unit);
  }

  execute() {
    if (!this.target) return;

    if (!this.target.isAlive || !this.target.isActive) {
      return this.close(true);
    }

    const worker = this.assignee;

    if (this.wasCarryingHarvest && !worker.isCarryingHarvest) {
      this.setResource(this.line, this.line.sequence.get(this.target));
    }
    this.wasCarryingHarvest = worker.isCarryingHarvest;

    if (this.speedMiningPath) {
      this.isBusy = true;

      // Don't disturb the worker while packing the harvest
      if ((worker.order.abilityId === 299) && !worker.order.targetUnitTag) {
        this.mode = MODE_PACKING;
        return;
      }

      const path = this.speedMiningPath;

      if (worker.isCarryingHarvest) {
        if (shouldPush(worker, path.xaxis, path.boost, path.store)) {
          this.mode = pushToDepot(worker, this.mode, path.store, this.target, this.zone.depot);
        } else {
          this.mode = returnHarvest(worker);
        }
      } else {
        if (shouldPush(worker, path.xaxis, path.boost, path.harvest)) {
          this.mode = pushToResource(worker, this.mode, path.harvest, this.target);
        } else {
          this.mode = harvestResource(worker, this.target);

          // While moving to the resource, the worker is available to take higher priority jobs
          this.isBusy = false;
        }
      }
    } else if (!this.order || (this.order.target !== this.target)) {
      this.order = order(worker, 298, this.target);
    } else if ((worker.order.abilityId !== 299) && (worker.order.targetUnitTag !== this.target.tag)) {
      this.order = order(worker, 298, this.target);
    } else {
      this.isBusy = (worker.order.abilityId !== 298);

      if ((worker.order.abilityId === 298) && (isCloseTo(worker.body, this.target.body, BUSY_DISTANCE))) this.isBusy = true;
    }
  }

}

function order(worker, ability, target) {
  if (worker.todo) {
    return worker.todo.replace(ability, target).accept(true);
  } else {
    return new Order(worker, ability, target).accept(true);
  }
}

function pushToResource(worker, mode, harvestPoint, resource) {
  if ((worker.order.abilityId === 16) && isSamePoint(worker.order.targetWorldSpacePos, harvestPoint)) return MODE_PUSHING;
  if ((worker.order.abilityId === 298) && (worker.order.targetUnitTag === resource.tag) && (mode === MODE_PUSHING)) return MODE_PUSHING;

  order(worker, 16, harvestPoint).queue(298, resource);

  return MODE_PUSH;
}

function harvestResource(worker, resource) {
  if ((worker.order.abilityId !== 298) || (worker.order.targetUnitTag !== resource.tag)) {
    order(worker, 298, resource);
  }

  return MODE_REAPING;
}

function pushToDepot(worker, mode, storePoint, resource, nexus) {
  if ((worker.order.abilityId === 16) && isSamePoint(worker.order.targetWorldSpacePos, storePoint)) return MODE_PUSHING;
  if ((worker.order.abilityId === 299) && (worker.order.targetUnitTag === nexus.tag) && (mode === MODE_PUSHING)) return MODE_PUSHING;

  order(worker, 16, storePoint).queue(1, nexus).queue(1, resource);

  return MODE_PUSH;
}

function returnHarvest(worker) {
  if (worker.order.abilityId !== 299) {
    order(worker, 299);
  }

  return MODE_STORING;
}

function shouldPush(worker, xaxis, boost, target) {
  if (xaxis) {
    if (worker.body.x < Math.min(boost.x, target.x)) return false;
    if (worker.body.x > Math.max(boost.x, target.x)) return false;
    if (worker.body.y < target.y - PUSH_DISTANCE) return false;
    if (worker.body.y > target.y + PUSH_DISTANCE) return false;
  } else {
    if (worker.body.y < Math.min(boost.y, target.y)) return false;
    if (worker.body.y > Math.max(boost.y, target.y)) return false;
    if (worker.body.x < target.x - PUSH_DISTANCE) return false;
    if (worker.body.x > target.x + PUSH_DISTANCE) return false;
  }

  return true;
}

function isSamePoint(a, b) {
  if (!a || !b) return false;

  return (Math.abs(a.x - b.x) < 0.1) && (Math.abs(a.y - b.y) < 0.1);
}

function isCloseTo(a, b, distance) {
  if (!a || !b) return false;

  return (Math.abs(a.x - b.x) < distance) && (Math.abs(a.y - b.y) < distance);
}

function findMinerals(depot, x, y) {
  for (const one of depot.zone.minerals) {
    if ((one.body.x === x) && (one.body.y === y)) return one;
  }
}

function findSpeedMiningPath(depot, resource) {
  const dx = resource.body.x - depot.body.x;
  const dy = resource.body.y - depot.body.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  const sdx = Math.sign(dx);
  const sdy = Math.sign(dy);
  const key = (adx - 0.5) * 10 + ady;
  const paths = SPEED_MINING_PATHS[key];

  if (!paths || !paths.length) return;

  let best = paths[0];
  for (const path of paths) {
    if (path.block) {
      if (findMinerals(depot, depot.body.x + path.block.x * sdx, depot.body.y + path.block.y * sdy)) {
        best = path;
        break;
      }
    } else if (!best.block) {
      best = path;
    }
  }

  const harvest = { x: depot.body.x + best.harvest.x * sdx, y: depot.body.y + best.harvest.y * sdy };
  const store = { x: depot.body.x + best.store.x * sdx, y: depot.body.y + best.store.y * sdy };

  return {
    harvest,
    store,
    xaxis: (adx >= ady),
    boost: { x: (store.x + harvest.x) / 2, y: (store.y + harvest.y) / 2 },
    roundtrip: best.roundtrip,
  };
}
