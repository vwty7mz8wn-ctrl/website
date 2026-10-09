// Only plain presentation/configuration data crosses the component boundary.
export function freezeSnapshot(value) {
  const copy = structuredClone(value);
  const freeze = object => {
    if (!object || typeof object !== 'object' || Object.isFrozen(object)) return object;
    Object.values(object).forEach(freeze);
    return Object.freeze(object);
  };
  return freeze(copy);
}
