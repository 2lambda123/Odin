import React from 'react'
import { PropTypes } from 'prop-types'
import { Card, CardContent, Typography, CircularProgress } from '@material-ui/core'

import WMXLayerTable from './WMXLayerTable'

import { get as getProjection } from 'ol/proj'
import wmts from './wmts'

import { useTranslation } from 'react-i18next'

const WMTSOptions = props => {
  const { merge, onValidation } = props

  const { t } = useTranslation()

  /* effects */
  const [capabilities, setCapabilities] = React.useState(null)
  const [selectedLayerId, setSelectedLayerId] = React.useState(props.options.layer)
  const [error, setError] = React.useState(null)
  const [missingProjectionDefinitions, setMissingProjectionDefinitions] = React.useState([])

  React.useEffect(() => {
    const controller = new AbortController()
    const signal = controller.signal

    const fetchAndSetCapabilities = async () => {
      setError(null)
      setCapabilities(null)
      try {
        const response = await fetch(props.options.url, { signal })
        if (!response.ok) { throw new Error(response.statusText) }

        const content = await response.text()
        const capabilities = wmts.capabilitiesFromContent(content)
        if (!capabilities) { throw new Error(t('basemapManagement.invalidResponse')) }
        setCapabilities(capabilities)
      } catch (error) {
        setError(error.message)
      }
    }
    fetchAndSetCapabilities()
    onValidation(!!props.options.layer && capabilities && !error)
    return () => { controller.abort() }
  }, [])

  // triggered by changes to the WMTS capabilities or by selecting a layer
  React.useEffect(() => {
    if (!capabilities || !selectedLayerId) return
    const missingDefinitions = wmts.crs(capabilities, selectedLayerId)
      .map(crs => ({
        Identifier: crs.Identifier,
        SupportedCRS: crs.SupportedCRS,
        CRSCode: crs.SupportedCRS.replace(/urn:ogc:def:crs:(\w+):(.*:)?(\w+)$/, '$1:$3')
      }))
      .filter(crs => !getProjection(crs.CRSCode))

    setMissingProjectionDefinitions(missingDefinitions)
    onValidation(missingDefinitions.length === 0)
  }, [capabilities, selectedLayerId])

  /* increases performance */
  const layers = React.useMemo(() => {
    /*  Depending on the WMTS provider the abstract may be lengthy. In order
        to avoid information overflow we cut off the abstract at a given length.
    */

    if (!capabilities) return []
    return wmts.layers(capabilities)
  }, [capabilities])

  /* functions */
  const handleLayerSelected = layerId => {
    setSelectedLayerId(layerId)
    if (layerId) {
      merge({
        layer: layerId,
        wgs84BoundingBox: wmts.wgs84BoundingBox(capabilities, layerId)
      })
    }
  }

  /* rendering */
  if (error) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography gutterBottom variant="body1" color="secondary">
            {t('basemapManagement.wmts.error')}: {error}
          </Typography>
        </CardContent>
      </Card>
    )
  } else if (!capabilities) {
    return (
      <Card variant="outlined">
        <CardContent align="center">
          <CircularProgress />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card variant="outlined">
        <CardContent>
          <Typography gutterBottom>
            {capabilities.ServiceProvider ? capabilities.ServiceProvider.ProviderName : ''}
          </Typography>
          <Typography gutterBottom variant="h5" component="h2">
            {capabilities.ServiceIdentification ? capabilities.ServiceIdentification.Title : ''}
          </Typography>
          <Typography gutterBottom >
            {capabilities.ServiceIdentification ? capabilities.ServiceIdentification.Abstract : ''}
          </Typography>
        </CardContent>
      </Card>
      <WMXLayerTable
        layers={layers}
        selectedLayerIdentifier={selectedLayerId}
        onLayerSelected={handleLayerSelected}
      />
      { missingProjectionDefinitions.length > 0
        ? <Card variant="outlined" style={{ marginTop: '0.5em' }}>
          <CardContent>
            <Typography gutterBottom color="secondary">
              {t('basemapManagement.wmts.missingProjections')}: {missingProjectionDefinitions.map(d => d.CRSCode).join(',')}
            </Typography>
          </CardContent>
        </Card>
        : null
      }
    </>
  )
}
WMTSOptions.propTypes = {
  options: PropTypes.object,
  merge: PropTypes.func,
  onValidation: PropTypes.func
}

export default WMTSOptions
