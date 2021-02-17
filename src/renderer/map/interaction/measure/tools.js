import GeometryType from 'ol/geom/GeometryType'
import { getArea, getLength } from 'ol/sphere'

const meterFormatter = new Intl.NumberFormat(window.navigator.userLanguage || window.navigator.language, { maximumFractionDigits: 2, style: 'unit', unit: 'meter' })
const kilometerFormatter = new Intl.NumberFormat(window.navigator.userLanguage || window.navigator.language, { maximumFractionDigits: 2, style: 'unit', unit: 'kilometer' })
const twoDigitsFormatter = new Intl.NumberFormat(window.navigator.userLanguage || window.navigator.language, {
  maximumFractionDigits: 2
})

const formatLength = length => {
  if (length < 1000) {
    return meterFormatter.format(length)
  }
  return kilometerFormatter.format(length / 1000)
}

export const formatAngle = angle => {
  return `${twoDigitsFormatter.format(angle)}°`
}

export const formatArea = area => {
  const unit = area > 100000 ? 'km²' : 'm²'
  const factor = area > 100000 ? 1000000 : 1
  return `${twoDigitsFormatter.format(area / factor)}${unit}`
}

export const length = geometry => {
  return formatLength(getLength(geometry))
}

export const angle = lineStringSegment => {
  const start = lineStringSegment.getFirstCoordinate()
  const end = lineStringSegment.getLastCoordinate()
  return formatAngle((-1 * Math.atan2(end[1] - start[1], end[0] - start[0]) * 180 / Math.PI + 450) % 360)
}

export const area = polygonGeometry => {
  return formatArea(getArea(polygonGeometry))
}

export const getLastSegmentCoordinates = lineStringGeometry => {
  const coordinates = lineStringGeometry.getCoordinates()
  if (coordinates.length <= 2) return coordinates
  return [coordinates[coordinates.length - 2], coordinates[coordinates.length - 1]]
}

export const isSingleSegment = lineStringGeometry => {
  if (lineStringGeometry.getType() !== GeometryType.LINE_STRING) return false
  return lineStringGeometry.getCoordinates().length === 2
}
