import Job from "./job.js";
import Order from "./order.js";

const Color = {
  Attack: { r: 255, g: 0, b: 0 },
  Move: { r: 0, g: 255, b: 0 },
  Cooldown: { r: 100, g: 100, b: 255 },
};

export default class Trace {

  static speed = 0;

  constructor(speed) {
    Trace.speed = speed;
  }

  async step(client) {
    await traceJobs(client);

    if (Trace.speed >= 10) {
      await new Promise(resolve => setTimeout(resolve, Trace.speed));
    }
  }

}

async function traceJobs(client) {
  const jobs = [...Job.list()].sort((a, b) => (b.priority - a.priority));
  const lines = [];
  const texts = [];
  let pending = 0;
  let total = 0;

  for (const job of jobs) {
    const summary = job.priority + " " + job.constructor.name + (job.output ? " " + job.output.name : "");

    if (job.assignee) {
      const body = job.assignee.body;
      const tag = { x: body.x, y: body.y, z: body.z + Math.ceil(body.r) };
    
      lines.push({ line: { p0: body, p1: tag } });
      texts.push({ text: summary, worldPos: tag, size: 16 });
    } else {
      pending++;
      texts.push({ text: summary, virtualPos: { x: 0.05, y: 0.05 + 0.01 * pending }, size: 16 });
    }

    total++;
  }

  texts.push({ text: "Pendings jobs: " + pending + "/" + total, virtualPos: { x: 0.05, y: 0.05 }, size: 16 });

  await client.debug({ debug: [{ draw: { lines: lines, text: texts } }] });
}

async function traceOrders(client) {
  const lines = [];
  const spheres = [];

  for (const order of Order.list()) {
    if (!order.unit.isSelected) continue;
  
    if (order.action === 23) {
      const start = order.unit.body;
      const end = order.target.body ? order.target.body : order.target;
      const dot = (start.x === end.x) && (start.y === end.y);
  
      for (let z = 8; z <= 9; z += 0.2) {
        lines.push({ line: { p0: { x: start.x, y: start.y, z: z }, p1: { x: end.x, y: end.y, z: dot ? 10 : z } }, color: Color.Attack });
      }
  
      spheres.push({ p: { x: end.x, y: end.y, z: 9 }, r: 0.2, color: { r: 200, g: 200, b: 200 } });
    }
  
    trackSpeed(order.unit);
  }
  
  await client.debug({ debug: [{ draw: { lines: lines, spheres: spheres } }] });  
}

function trackSpeed(unit) {
  if (unit.isSelected && unit.job) {

    if (unit.last) {
      const x1 = unit.last.x;
      const y1 = unit.last.y;
      const x2 = unit.body.x;
      const y2 = unit.body.y;

      unit.body.s = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
      unit.body.a = (unit.last.s >= 0) ? unit.body.s - unit.last.s : 0;
    } else {
      unit.body.s = 0;
      unit.body.a = 0;
    }

    unit.last = {
      x: unit.body.x,
      y: unit.body.y,
      s: unit.body.s,
    }

    console.log(unit.job ? unit.job.summary : "free",
      "\tdirection:", unit.direction.toFixed(1),
      "\tspeed:", unit.body.s.toFixed(2),
      "\tacceleration:", unit.body.a.toFixed(2),
      "\torder:", JSON.stringify(unit.order),
    );
  }

}
