import React from 'react'
import { PropTypes } from 'prop-types'
import { Card, CardContent, Typography, CircularProgress } from '@material-ui/core'

import WMXLayerTable from './WMXLayerTable'

import { get as getProjection } from 'ol/proj'
import { fetcher, firstOrDefault } from './tools'

import { useTranslation } from 'react-i18next'

const WMXOptions = props => {
  const { provider, merge, onValidation } = props

  const { t, i18n } = useTranslation()
  const collator = Intl.Collator(i18n.language)

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
        const response = await fetcher(props.options.url, { signal })
        if (!response.ok) { throw new Error(response.statusText) }

        const content = await response.text()
        const caps = provider.capabilitiesFromContent(content)
        if (!caps) { throw new Error(t('basemapManagement.invalidResponse')) }
        setCapabilities(caps)
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
    const providedCRS = provider.crs(capabilities, selectedLayerId)
      .map(crs => ({
        Identifier: crs.Identifier,
        SupportedCRS: crs.SupportedCRS,
        CRSCode: crs.SupportedCRS.replace(/urn:ogc:def:crs:(\w+):(.*:)?(\w+)$/, '$1:$3')
      }))
    const missingDefinitions = providedCRS.filter(crs => !getProjection(crs.CRSCode))
    if (missingDefinitions.length === providedCRS.length) {
      /* Oops, seems like we do not support any CRS provided by the source */
      setMissingProjectionDefinitions(missingDefinitions)
      onValidation(false)
    } else {
      /* phew, we do support at least one provided CRS */
      onValidation(true)
    }
  }, [capabilities, selectedLayerId])

  /* increases performance */
  const layers = React.useMemo(() => {

    if (!capabilities) return []
    const l = provider.layers(capabilities)
    return l.sort((left, right) => collator.compare(left.Name, right.Name))
  }, [capabilities])

  /* functions */
  const handleLayerSelected = layerId => {
    setSelectedLayerId(layerId)
    if (layerId) {
      const providedCRS = provider.crs(capabilities, layerId)
      const p = (providedCRS.some(c => c.Identifier === 'EPSG:3857')
        ? 'EPSG:3857'
        : firstOrDefault(providedCRS.filter(crs => getProjection(crs.CRSCode)), null)
      )
      merge({
        layer: layerId,
        wgs84BoundingBox: provider.wgs84BoundingBox(capabilities, layerId),
        projection: p
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

WMXOptions.propTypes = {
  provider: PropTypes.object,
  options: PropTypes.object,
  merge: PropTypes.func,
  onValidation: PropTypes.func
}

export default WMXOptions
