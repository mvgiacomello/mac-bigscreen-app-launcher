/**
 * This file represents the main process of the Electron app.
 */
import { app, shell, BrowserWindow, ipcMain, Tray, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { GamepadHandler, GamepadHandlerEvents } from './gamepad'
import icon from '../../resources/icon.png?asset'
import trayIcon from '../../resources/tray.png?asset'
import fs from 'node:fs'
import path from 'node:path'

// Config file
const configFilePath = path.join(app.getPath('userData'), 'config.json')
console.log('configFilePath: ', configFilePath)

// Check if config file exists
if (!fs.existsSync(configFilePath)) {
  fs.writeFileSync(configFilePath, JSON.stringify({}))
}

// Read config file
const configFile = fs.readFileSync(configFilePath, 'utf8')
console.log('configFile contents: ', JSON.parse(configFile))

// Tray Button
let tray: Tray | null = null

// Handles Gamepad Events
const gamepadHandler = new GamepadHandler(createWindow)
gamepadHandler.init()

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('org.mac-bigscreen-app-launcher.app')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // Handle Tray
  tray = new Tray(trayIcon) // Replace with your icon's path
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open App', click: (): void => createWindow() },
    { label: 'Quit', click: (): void => app.quit() }
  ])
  tray.setContextMenu(contextMenu)
  tray.setToolTip('Mac Bigscreen App Launcher')

  // Handle Gamepad
  gamepadHandler.emit(GamepadHandlerEvents.ELECTRON_READY)
})

app.on('window-all-closed', () => {
  // Do nothing
})
