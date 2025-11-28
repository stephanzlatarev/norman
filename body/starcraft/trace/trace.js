import traceBattles from "./battles.js";
import traceJobs from "./jobs.js";
import traceMemory from "./memory.js";
import tracePerimeter from "./perimeter.js";
import tracePins from "./pins.js";
import traceThreats from "./threats.js";
import traceZones from "./zones.js";

export default async function(client) {
  const lines = [];
  const text = [];
  const shapes = [];
  const spheres = [];

  tracePerimeter(shapes);
  traceZones(shapes);
  tracePins(shapes);
  traceBattles(lines, text);
  traceThreats(spheres);

  traceMemory(text);
  traceJobs(text);

  for (let row = 0; row < text.length; row++) text[row] = { text: text[row], virtualPos: { x: 0, y: row } };
  for (const shape of shapes) text.push({ text: JSON.stringify(shape) });

  await client.debug({ debug: [{ draw: { lines, text, spheres } }] });
}
