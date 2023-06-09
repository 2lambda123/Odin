import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import Paper from '@material-ui/core/Paper'
import Category from '@material-ui/icons/CategoryOutlined'
import PermDataSettingIcon from '@material-ui/icons/PermDataSettingOutlined'
import MapIcon from '@material-ui/icons/MapOutlined'
import PhotoCameraIcon from '@material-ui/icons/PhotoCameraOutlined'
import PrintIcon from '@material-ui/icons/PrintOutlined'
import Button from '@material-ui/core/Button'
import SettingsIcon from '@material-ui/icons/SettingsOutlined'
import { LayersTripleOutline, Undo, Redo, ContentCut, ContentCopy, ContentPaste } from 'mdi-material-ui'

import ActivityBar from './ActivityBar'
import BasemapPanel from './basemapPanel/BasemapPanel'
import PrinterPanel from './printerPanel/PrinterPanel'
import LayerList from './layerlist/LayerList'
import FeaturePalette from './palette/FeaturePalette'
import SliderSetting from './settings/SliderSetting'
import SwitchSetting from './settings/SwitchSetting'

import Traveller from './traveller/Traveller'

import undo from '../undo'
import evented from '../evented'
import preferences from '../project/preferences'

import { schemeToSliderValue, sliderValueToScheme } from './settings/util'

import { useTranslation } from 'react-i18next'

const useStyles = makeStyles((/* theme */) => ({
  toolsPanel: {
    gridArea: 'L',
    pointerEvents: 'auto',
    padding: 20
  }
}))

// Activities for activity bar.
const initialActivities = (classes, t) => [
  {
    id: 'map',
    type: 'activity',
    icon: <MapIcon/>,
    tooltip: t('activities.tooltips.map'),
    panel: () => <BasemapPanel />
  },
  {
    id: 'layers',
    type: 'activity',
    icon: <LayersTripleOutline/>,
    panel: () => <LayerList/>,
    tooltip: t('activities.tooltips.layers')
  },
  {
    id: 'palette',
    type: 'activity',
    icon: <Category/>,
    tooltip: t('activities.tooltips.symbols'),
    panel: () => <FeaturePalette/>
  },
  {
    id: 'tools',
    type: 'activity',
    icon: <PermDataSettingIcon/>,
    tooltip: t('activities.tooltips.tools'),
    panel: () => <Paper className={classes.toolsPanel} elevation={6}>
      <Button variant='outlined' fullWidth={true} style={{ marginBottom: '0.5em' }} onClick={() => evented.emit('MAP_MEASURE_LENGTH')}>{t('measure.length')}</Button>
      <Button variant='outlined' fullWidth={true} style={{ marginBottom: '0.5em' }} onClick={() => evented.emit('MAP_MEASURE_AREA')}>{t('measure.area')}</Button>
      <Traveller />
    </Paper>
  },
  {
    id: 'preferences',
    type: 'activity',
    icon: <SettingsIcon />,
    tooltip: t('preferences.name'),
    panel: () => <Paper className={classes.toolsPanel} elevation={6}>
      <Paper variant='outlined' style={{ padding: '1em', marginBottom: '0.5em' }}>
        <SliderSetting
          caption={t('preferences.scheme.name')}
          defaultValue={ schemeToSliderValue(preferences.get('scheme')) }
          marks={[
            { label: t('preferences.scheme.light'), value: 0 },
            { label: t('preferences.scheme.medium'), value: 50 },
            { label: t('preferences.scheme.dark'), value: 100 }
          ]}
          onChange={value => preferences.set('scheme', sliderValueToScheme(value))}
        />
      </Paper>
      <Paper variant='outlined' style={{ padding: '1em', marginBottom: '0.5em' }}>
        <SliderSetting
          caption={t('preferences.lineWidth')}
          defaultValue={preferences.get('lineWidth')}
          marks={[
            { label: 'S', value: 2 },
            { label: 'M', value: 3 },
            { label: 'L', value: 4 },
            { label: 'XL', value: 5 }
          ]}
          onChange={value => preferences.set('lineWidth', value)}
        />
      </Paper>
      <Paper variant='outlined' style={{ padding: '1em', marginBottom: '0.5em' }}>
        <SliderSetting
          caption={t('preferences.labelTextSize')}
          defaultValue={preferences.get('labelTextSize')}
          marks={[
            { value: 16, label: 'S' },
            { value: 24, label: 'M' },
            { value: 32, label: 'L' },
            { value: 40, label: 'XL' }
          ]}
          onChange={value => preferences.set('labelTextSize', value)}
        />
        <SwitchSetting defaultValue={preferences.get('useBoldLabelText')}
          onChange={value => preferences.set('useBoldLabelText', value)}
          label={t('preferences.useBoldLabelText')}
        />
      </Paper>
      <Paper variant='outlined' style={{ padding: '1em', marginBottom: '0.5em' }}>
        <SliderSetting
          caption={t('preferences.symbolSize')}
          defaultValue={preferences.get('symbolSize')}
          marks={[
            { label: 'S', value: 30 },
            { label: 'M', value: 40 },
            { label: 'L', value: 50 },
            { label: 'XL', value: 60 }
          ]}
          onChange={value => preferences.set('symbolSize', value)}
        />
        <SliderSetting
          caption={t('preferences.symbolTextSize')}
          defaultValue={preferences.get('symbolTextSize')}
          marks={[
            { label: 'S', value: 30 },
            { label: 'M', value: 40 },
            { label: 'L', value: 50 },
            { label: 'XL', value: 60 }
          ]}
          onChange={value => preferences.set('symbolTextSize', value)}
        />
        <SwitchSetting defaultValue={preferences.get('symbolSizeByEchelon')}
          onChange={value => preferences.set('symbolSizeByEchelon', value)}
          label={t('preferences.symbolSizeByEchelon')}
        />
        <SwitchSetting defaultValue={preferences.get('simpleStatusModifier')}
          onChange={value => preferences.set('simpleStatusModifier', value)}
          label={t('preferences.simpleStatusModifier')}
        />
      </Paper>
    </Paper>
  },
  {
    type: 'divider'
  },
  {
    id: 'undo',
    type: 'action',
    icon: <Undo/>,
    tooltip: t('activities.tooltips.undo'),
    action: undo.undo
  },
  {
    id: 'redo',
    type: 'action',
    icon: <Redo/>,
    tooltip: t('activities.tooltips.redo'),
    action: undo.redo
  },
  {
    type: 'divider'
  },
  {
    id: 'cut',
    type: 'action',
    icon: <ContentCut/>,
    tooltip: t('activities.tooltips.cut'),
    action: () => evented.emit('EDIT_CUT')
  },
  {
    id: 'copy',
    type: 'action',
    icon: <ContentCopy/>,
    tooltip: t('activities.tooltips.copy'),
    action: () => evented.emit('EDIT_COPY')
  },
  {
    id: 'paste',
    type: 'action',
    icon: <ContentPaste/>,
    tooltip: t('activities.tooltips.paste'),
    action: () => evented.emit('EDIT_PASTE')
  },
  {
    type: 'divider'
  },
  {
    id: 'sharePng',
    type: 'action',
    icon: <PhotoCameraIcon/>,
    tooltip: t('activities.tooltips.exportPNG'),
    action: () => evented.emit('SHARE_PNG')
  },
  {
    id: 'print',
    type: 'activity',
    icon: <PrintIcon/>,
    panel: () => <PrinterPanel />,
    tooltip: t('activities.tooltips.print')
  }
]

const Activities = (/* props */) => {
  const classes = useStyles()
  const { t } = useTranslation()
  const activities = initialActivities(classes, t)
  const [activeTool, setActiveTool] = React.useState(null)

  const handleActivitySelected = activity => {
    if (!activeTool) {
      setActiveTool(activity)
    } else {
      setActiveTool(activeTool.id !== activity.id ? activity : null)
    }
  }

  const toolPanel = () => activeTool ? activeTool.panel() : null

  return (
    <>
      <ActivityBar activities={activities} activeTool={activeTool} onActivitySelected={handleActivitySelected}/>
      { toolPanel() }
    </>
  )
}

export default Activities
