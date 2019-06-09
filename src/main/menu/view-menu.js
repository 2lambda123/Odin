import { sendMessage } from './ipc'
import tileProviders from '../tile-providers'

const menu = settings => {

  const mapVisible = settings.has('mapVisible') ? settings.get('mapVisible') : true
  const osdVisible = settings.has('osdVisible') ? settings.get('osdVisible') : true
  const osdOptions = settings.get('osdOptions') ||
      ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3']

  const mapFilters = [
    { label: 'Brightness', command: 'brightness' },
    { label: 'Contrast', command: 'contrast' },
    { label: 'Grayscale', command: 'grayscale' },
    { label: 'Hue', command: 'hue-rotate' },
    { label: 'Invert', command: 'invert' },
    { label: 'Sepia', command: 'sepia' }
  ].map(({ label, command }, index) => ({
    label,
    click: sendMessage('COMMAND_ADJUST', command),
    accelerator: process.platform === 'darwin'
      ? `Alt+Cmd+${index + 1}`
      : `Ctrl+Shift+${index + 1}`
  }))

  mapFilters.push({
    label: 'Reset',
    click: sendMessage('COMMAND_RESET_FILTERS'),
    accelerator: process.platform === 'darwin'
      ? 'Alt+Cmd+9'
      : 'Ctrl+Shift+9'
  })

  // Get last provider (if any) to check corresponding menu item:
  const lastProviderId = settings.get('tileProvider')
  const hiDPISupport = settings.get('hiDPISupport') || false

  const providerMenu = provider => ({
    id: provider.id,
    label: provider.name,
    type: 'checkbox',
    checked: provider.id === lastProviderId,
    click: (menuItem, focusedWindow) => {
      menuItem.menu.items.filter(x => x !== menuItem).forEach(x => (x.checked = false))
      sendMessage('COMMAND_MAP_TILE_PROVIDER', provider)(menuItem, focusedWindow)
      settings.set('tileProvider', provider.id)
    }
  })

  const providerAccelerator = (menu, index) => {
    if (index < 9) menu.accelerator = 'CmdOrCtrl+' + (index + 1)
    return menu
  }

  const tileProvidersMenu = tileProviders()
    .map(providerMenu)
    .map(providerAccelerator)

  return {
    label: 'View',
    submenu: [
      {
        label: 'Map',
        submenu: [
          {
            label: 'Filter',
            submenu: mapFilters
          },
          {
            label: 'Tile Providers',
            submenu: tileProvidersMenu
          }
        ]
      },
      {
        label: 'HiDPI Support',
        type: 'checkbox',
        checked: hiDPISupport,
        click: (menuItem, focusedWindow) => {
          settings.set('hiDPISupport', menuItem.checked)
          sendMessage('COMMAND_HIDPI_SUPPORT', menuItem.checked)(menuItem, focusedWindow)
        }
      },
      {
        label: 'Copy Coordinates',
        accelerator: 'ALT + C',
        click: sendMessage('COMMAND_COPY_COORDS')
      },
      { type: 'separator' },
      { role: 'reload' },
      { role: 'forcereload' },
      { role: 'toggledevtools' },
      { type: 'separator' },
      { role: 'resetzoom' },
      { role: 'zoomin' },
      { role: 'zoomout' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
      { type: 'separator' },
      {
        label: 'Show',
        submenu: [
          {
            label: 'On-Screen Display',
            click: (menuItem, focusedWindow) => {
              menuItem.menu.items
                .filter(x => x !== menuItem && x.label !== 'Map')
                .forEach(x => (x.enabled = menuItem.checked))
              sendMessage('COMMAND_TOGGLE_OSD', menuItem.checked)(menuItem, focusedWindow)
              settings.set('osdVisible', menuItem.checked)
            },
            type: 'checkbox',
            checked: osdVisible
          },
          { type: 'separator' },
          {
            label: 'Date and Time',
            click: sendMessage('COMMAND_TOGGLE_OSD_OPTIONS', 'C1'),
            type: 'checkbox',
            checked: osdOptions.includes('C1'),
            enabled: osdVisible
          },
          {
            label: 'Scale',
            click: sendMessage('COMMAND_TOGGLE_OSD_OPTIONS', 'C2'),
            type: 'checkbox',
            checked: osdOptions.includes('C2'),
            enabled: osdVisible
          },
          {
            label: 'Position',
            click: sendMessage('COMMAND_TOGGLE_OSD_OPTIONS', 'C3'),
            type: 'checkbox',
            checked: osdOptions.includes('C3'),
            enabled: osdVisible
          },
          { type: 'separator' },
          {
            label: 'Map',
            click: (menuItem, focusedWindow) => {
              sendMessage('COMMAND_TOGGLE_MAP_VISIBILITY', menuItem.checked)(menuItem, focusedWindow)
              settings.set('mapVisible', menuItem.checked)
            },
            type: 'checkbox',
            checked: mapVisible
          }
        ]
      }
    ]
  }
}

export default settings => menu(settings)