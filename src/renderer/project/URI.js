import uuid from 'uuid-random'

const SCHEME_FEATURE = 'feature:'
const SCHEME_LAYER = 'layer:'
const SCHEME_TRAVEL_MARKER = 'travel:'

export default {
  SCHEME_FEATURE,
  SCHEME_LAYER,
  SCHEME_TRAVEL_MARKER,
  layerId: featureId => featureId
    ? `layer:${featureId.match(/feature:(.*)\/.*/)[1]}`
    : `layer:${uuid()}`,

  featureId: (layerId, featureId) =>
    featureId
      ? featureId.replace('^feature:.+/', `feature:${layerId}/`)
      : `feature:${layerId.match(/layer:(.*)/)[1]}/${uuid()}`,
  isFeatureId: s => s.startsWith('feature:'),
  isLayerId: s => s.startsWith('layer:'),
  isTravelMarkerId: s => (s && s.startsWith(SCHEME_TRAVEL_MARKER))
}
