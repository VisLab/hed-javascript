/**
 * Determine whether a sidecar value has HED data.
 *
 * @param {object} sidecarValue A BIDS sidecar value.
 * @return {boolean} Whether the sidecar value has HED data.
 */
export const sidecarValueHasHed = function (sidecarValue) {
  return sidecarValue !== null && typeof sidecarValue === 'object' && sidecarValue.HED !== undefined
}