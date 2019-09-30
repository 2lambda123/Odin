import L from 'leaflet'
import { calcStruts, line, svgFactory } from './geo-helper'

// TODO: can we parameterize this with different arrows?
// TODO: provide adequate styling information
// TODO: 'CATK' label in first segment
export const corridorShape = (group, options) => {
  const f = svgFactory({ ...options, dashed: true })
  const outline = f.outline()
  const path = f.path()
  const arrow = f.p({ stroke: 'black', 'stroke-width': 1, fill: 'black' })
  group.appendChild(outline)
  group.appendChild(path)
  group.appendChild(arrow)

  // NOTE: fully width envelope
  const updateFrame = ({ center, envelope }) => {
    const dw = line(envelope[0]).d
    const s0 = line(center.slice(0, 2))

    // CATKF has a pretty complicated set of arrows.
    // First we define a set of struts s(0) - s(n), starting from the tip.
    // Then we calculate named points on these struts.
    const s = calcStruts(center, envelope)([ 0.1, 0.28, 0.53, 0.69, 0.92 ])

    // Interpolate points for corridor width (half of arrow width)
    // TODO: remove/simplify shape when minimum width is below a certain limit
    const struts = envelope.map(line).slice(1)

    const points = [
      [
        ...struts.map(s => s.point(0.75)).reverse(),
        s[4].point(0.75), s[4].point(1),
        s0.point(0.53 * (dw / s0.d)),
        s[4].point(0), s[4].point(0.25),
        ...struts.map(s => s.point(0.25))
      ],
      [
        s[2].point(-0.5),
        s[1].point(0),
        s[1].point(1),
        s[2].point(1.5)
      ],
      [
        s0.point(0.1 * (dw / s0.d)), s0.point(0.28 * (dw / s0.d))
      ]
    ]

    const closed = false
    path.setAttribute('d', L.SVG.pointsToPath(points, closed))
    outline.setAttribute('d', L.SVG.pointsToPath(points, closed))
    arrow.setAttribute('d', L.SVG.pointsToPath([
      [center[0], s[0].point(0.45), s[0].point(0.55)]
    ], true))
  }

  return {
    updateFrame
  }
}
