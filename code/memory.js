
const memory = new Map();
const labels = new Map();
const lists = new Map();

export function label(key, value, label) {
  let keyLabels = labels.get(key);

  if (!keyLabels) {
    keyLabels = new Map();
    labels.set(key, keyLabels);
  }

  if (label) {
    keyLabels.set(value, label);
  } else {
    return keyLabels.get(value);
  }
}

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

export const List = new Proxy({}, {

  get: function (_, key) {
    return lists.get(key) || [];
  },

  set: function(_, key, value) {
    lists.set(key, value);

    return true;
  }
});
