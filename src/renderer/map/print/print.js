import { MouseWheelZoom, PinchZoom, DragZoom, KeyboardZoom } from 'ol/interaction'
import { getPointResolution, toLonLat } from 'ol/proj'

import domtoimage from 'dom-to-image-more'
import jsPDF from 'jspdf'

import evented from '../../evented'
import getCurrentDateTime from '../../../shared/militaryTime'
import coordinateFormat from '../../../shared/coord-format'

import paperSizes from './paperSizes.json'
import dpi from './quality.json'

const padding = {
  left: 5,
  right: 5,
  top: 20,
  bottom: 5
}

const inch2mm = 25.4

/***********************/


const setZoomInteractions = (map, active = true) => {
  map.getInteractions().forEach(interaction => {
    if (interaction instanceof MouseWheelZoom) interaction.setActive(active)
    else if (interaction instanceof KeyboardZoom) interaction.setActive(active)
    else if (interaction instanceof PinchZoom) interaction.setActive(active)
    else if (interaction instanceof DragZoom) interaction.setActive(active)
  })
}

const saveImage = (dataURL, fileName) => {
  const link = document.createElement('a')
  link.download = fileName
  link.href = dataURL
  link.click()
  setTimeout(() => link.remove(), 300)
}

const showPrintArea = (map, props) => {

  const { paperSize, orientation, quality, scale } = props

  /* these values correspond with the physical dimensions of the paper and the pixel density */
  const desiredMapWidth = (paperSizes[paperSize][orientation].width - (padding.left + padding.right)) / inch2mm * dpi[quality]
  const desiredMapHeight = (paperSizes[paperSize][orientation].height - (padding.top + padding.bottom)) / inch2mm * dpi[quality]

  /* ratio differs from the typical A* paper ratios because it honors the padding values! */
  const ratio = desiredMapWidth / desiredMapHeight

  /* our map uses WebMercator, thus we need to consider the latidue in order to get the resolution rigth */
  const scaleResolution = scale / getPointResolution(map.getView().getProjection(), dpi[quality] / inch2mm, map.getView().getCenter())

  const limitingDimension = (window.innerHeight <= window.innerWidth) ? 'innerHeight' : 'innerWidth'

  const limitingMargin = Math.floor(0.15 * window[limitingDimension])
  const printArea = document.getElementById('printArea')

  const height = window.innerHeight - 2 * limitingMargin
  const width = Math.floor(ratio * height)

  printArea.style.height = `${height}px`
  printArea.style.width = `${width}px`
  printArea.style.visibility = 'visible'

  const currentSizeResolution = height / desiredMapHeight
  map.getView().setResolution(scaleResolution / currentSizeResolution)
  setZoomInteractions(map, false)
}

const hidePrintArea = map => {
  setZoomInteractions(map, true)
}

// returns a promise
const executePrint = async (map, props) => {

  const { paperSize, orientation, quality, scale, targetOutputFormat } = props

  const previousSettings = {
    mapSize: map.getSize(),
    viewResolution: map.getView().getResolution(),
    viewCenter: map.getView().getCenter()
  }

  const printArea = document.getElementById('printArea')
  printArea.style.visibility = 'hidden'
  // printArea.parentElement.style.backdropFilter = 'blur(25px)'

  // calculate center of print area on the screen
  const rect = printArea.getBoundingClientRect()
  const centerOnScreen = [rect.left + Math.floor(rect.width / 2), rect.top + Math.floor(rect.height / 2)]
  const centerCoordinates = map.getCoordinateFromPixel(centerOnScreen)

  /* these values correspond with the physical dimensions of the paper and the pixel density */
  const desiredMapWidth = (paperSizes[paperSize][orientation].width - (padding.left + padding.right)) / inch2mm * dpi[quality]
  const desiredMapHeight = (paperSizes[paperSize][orientation].height - (padding.top + padding.bottom)) / inch2mm * dpi[quality]

  const scaleResolution = scale / getPointResolution(map.getView().getProjection(), dpi[quality] / inch2mm, centerCoordinates)

  map.getView().setCenter(centerCoordinates)
  // required in order to allow the <map /> element to grow to the desired size
  map.getTargetElement().style.position = 'static'
  map.getTargetElement().style.width = `${Math.floor(desiredMapWidth)}px`
  map.getTargetElement().style.height = `${Math.floor(desiredMapHeight)}px`
  map.updateSize()
  map.getView().setResolution(scaleResolution)

  return new Promise((resolve, reject) => {
    // execute this after the map ist rendered
    map.once('rendercomplete', async () => {

      // omit these OpenLayers elements
      const exportOptions = {
        filter: function (element) {
          const className = element.className || ''
          return (className.indexOf('ol-scale-bar') < 0 && className.indexOf('ol-attribution') < 0)
        }
      }

      try {
        const dateTimeOfPrinting = getCurrentDateTime()
        // const dataURL = await domtoimage.toPng(map.getViewport(), exportOptions)
        const dataURL = await domtoimage.toJpeg(map.getViewport(), exportOptions)

        // just save the "raw" image
        if (targetOutputFormat === 'JPEG') {
          saveImage(dataURL, `${dateTimeOfPrinting}.jpeg`)
          return resolve(true)
        }

        // from here it's all about creating a beautiful PDF
        // eslint-disable-next-line new-cap
        const pdf = new jsPDF({ format: paperSize, orientation })
        const x = padding.left
        const y = padding.top
        const w = paperSizes[paperSize][orientation].width - (padding.left + padding.right)
        const h = paperSizes[paperSize][orientation].height - (padding.top + padding.bottom)
        pdf.addImage(dataURL, 'JPEG', x, y, w, h)

        // scale text in the upper right corner of the header
        const scaleText = `1 : ${scale}000`
        pdf.text(scaleText, (paperSizes[paperSize][orientation].width - padding.right), padding.top - 2, { align: 'right' })

        // date/time of printing in the upper left corner of the header
        pdf.text(dateTimeOfPrinting, padding.left, padding.top - Math.floor(padding.top / 2))

        // place center of map coordinates in the upper left corner of the header
        const centerAsLonLat = toLonLat(centerCoordinates, map.getView().getProjection())
        pdf.text(coordinateFormat.format({ lng: centerAsLonLat[0], lat: centerAsLonLat[1] }), padding.left, padding.top - 2)

        // scale bar lower left corner ON THE map
        const scaleBarHeight = 2
        const scaleBarSegmentWidth = 10
        pdf.setDrawColor(0, 0, 0)

        pdf.setFillColor(255, 255, 255)
        pdf.rect(
          padding.left + scaleBarHeight / 2,
          paperSizes[paperSize][orientation].height - padding.bottom - 2.5 * scaleBarHeight,
          5.25 * scaleBarSegmentWidth,
          2 * scaleBarHeight,
          'FD'
        )

        // white segments
        pdf.setFillColor(255, 255, 255)
        pdf.rect(padding.left + scaleBarHeight, paperSizes[paperSize][orientation].height - padding.bottom - 2 * scaleBarHeight, scaleBarSegmentWidth, scaleBarHeight, 'FD')
        pdf.rect(padding.left + scaleBarHeight + 2 * scaleBarSegmentWidth, paperSizes[paperSize][orientation].height - padding.bottom - 2 * scaleBarHeight, scaleBarSegmentWidth, scaleBarHeight, 'FD')

        // red segments
        pdf.setFillColor(255, 0, 0)
        pdf.rect(padding.left + scaleBarHeight + scaleBarSegmentWidth, paperSizes[paperSize][orientation].height - padding.bottom - 2 * scaleBarHeight, scaleBarSegmentWidth, scaleBarHeight, 'FD')
        pdf.rect(padding.left + scaleBarHeight + 3 * scaleBarSegmentWidth, paperSizes[paperSize][orientation].height - padding.bottom - 2 * scaleBarHeight, scaleBarSegmentWidth, scaleBarHeight, 'FD')

        // real length of scale bar in (k)m
        const realLifeLength = scale * 0.04
        pdf.setFontSize(scaleBarHeight * 4)
        pdf.text(`${realLifeLength < 1 ? realLifeLength * 1000 : realLifeLength}${realLifeLength >= 1 ? 'k' : ''}m`,
          padding.left + 4 * scaleBarSegmentWidth + 2 * scaleBarHeight,
          paperSizes[paperSize][orientation].height - padding.bottom - scaleBarHeight
        )

        await pdf.save(`map-${dateTimeOfPrinting}.pdf`, { returnPromise: true })
        resolve(true)
      } catch (error) {
        reject(error)
      } finally {
        // restore styling
        printArea.style.visibility = 'visible'
        // printArea.parentElement.style.backdropFilter = 'none'
        map.getTargetElement().style = 'fixed'
        map.getTargetElement().style.width = ''
        map.getTargetElement().style.height = ''
        map.updateSize()
        map.getView().setResolution(previousSettings.viewResolution)
        map.getView().setCenter(previousSettings.viewCenter)
      }
    })
  })
}

// these events are emitted by components/printerPanel/PrinterPanel.js
const print = map => {
  evented.on('PRINT_SHOW_AREA', props => showPrintArea(map, props))
  evented.on('PRINT_EXECUTE', props => executePrint(map, props)
    .then(() => evented.emit('PRINT_EXECUTION_DONE'))
    .catch(error => console.error(error))
  )
  evented.on('PRINT_HIDE_AREA', () => hidePrintArea(map))
}

export default print
