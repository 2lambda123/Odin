import L from 'leaflet'

// https://github.com/PaulLeCam/react-leaflet/issues/255
// ==> Stupid hack so that leaflet's images work after going through webpack.

import marker from 'leaflet/dist/images/marker-icon.png'
import marker2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker,
  shadowUrl: markerShadow
})

// <== Stupid hack: end.