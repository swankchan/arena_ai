// Keep walking and cycling implementations intact, but exclude them from player selection for now.
export const PLAYABLE_MODES = Object.freeze(['car', 'helicopter']);

export function availableMode(mode) {
  return PLAYABLE_MODES.includes(mode) ? mode : 'car';
}
