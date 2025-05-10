
const memory = new Map();

function get(_, key) {
  return memory.get(key) || 0;
}

function set(_, key, value) {
  if (value >= -Infinity) {
    memory.set(key, value);
  } else {
    memory.set(key, value ? 1 : 0);
  }

  return true;
}

export default new Proxy({}, { get, set });
