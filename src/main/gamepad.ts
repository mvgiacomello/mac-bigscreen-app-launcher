import gamecontroller, { Gamecontroller } from 'sdl2-gamecontroller'
import { ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import { BrowserWindow } from 'electron'
import EventEmitter from 'events'

// ENUM with events
export enum GamepadHandlerEvents {
  ELECTRON_READY = 'electron-ready'
}

export class GamepadHandler extends EventEmitter {
  pressedButtons: Set<string>
  childApp: ChildProcessWithoutNullStreams | null
  gamecontroller: Gamecontroller
  callBack: () => void

  constructor(callBack: () => void) {
    super()
    this.pressedButtons = new Set()
    this.childApp = null
    this.gamecontroller = gamecontroller
    this.callBack = callBack
    this.setupListeners()
  }

  setupListeners(): void {
    this.on(GamepadHandlerEvents.ELECTRON_READY, () =>
      console.log(`GamepadHandler Event ${GamepadHandlerEvents.ELECTRON_READY}: Electron is ready!`)
    )
  }

  handleGamepadShortcut(): void {
    if (BrowserWindow.getAllWindows().length === 0) {
      // 1. If there is no window, create one.
      this.callBack()
    } else if (!BrowserWindow.getAllWindows()[0]?.isFullScreen()) {
      // 2. If the window is not in fullscreen mode, set it to fullscreen.
      !BrowserWindow.getFocusedWindow()?.setFullScreen(true)
    } else if (this.childApp) {
      // 3. If app is running close it
      console.log('Closing app', JSON.stringify(this.childApp))
      // this.childApp.kill('SIGKILL')
    } else {
      // 4. Log
      console.log('Gamepad Shortcut detected but no action was taken')
    }
  }

  init(): void {
    // Listen to Gamepad Events
    // API: https://github.com/IBM/sdl2-gamecontroller/blob/main/docs/API.md
    this.pressedButtons = new Set()
    gamecontroller.on('error', (data) => console.log('error', data))
    gamecontroller.on('warning', (data) => console.log('warning', data))
    gamecontroller.on('sdl-init', () => console.log('SDL2 Initialized'))
    gamecontroller.on('controller-button-down', (data) => {
      this.pressedButtons.add(data.button)

      // Detects shortcut for bigscreen
      if (this.pressedButtons.has('back') && this.pressedButtons.has('start')) {
        this.handleGamepadShortcut()
      }
    })
    gamecontroller.on('controller-button-up', (data) => {
      this.pressedButtons.delete(data.button)
    })
    gamecontroller.on('a:down', () => {
      console.log('Button A pressed, launching game!')
      const apps = [
        {
          name: 'Gran Turismo 4',
          path: '/Applications/PCSX2.app/Contents/MacOS/PCSX2',
          arguments: [
            '-fastboot',
            '-fullscreen',
            '-nogui',
            '-state',
            '1',
            '--',
            '/Users/mau/Games/ROMS/PS2/Gran Turismo 4 (USA).iso'
          ]
        }
      ]
      this.childApp = spawn(apps[0].path, apps[0].arguments, {
        detached: true
      })
      this.childApp.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`)
      })

      this.childApp.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`)
      })

      this.childApp.on('close', (code) => {
        console.log(`child process exited with code ${code}`)
      })
    })
    gamecontroller.on('b:down', () => {
      console.log('Button B pressed, killing game!')
      this.childApp?.kill('SIGKILL')
      // Refocus on the main window
      setTimeout(() => {
        BrowserWindow.getAllWindows()[0]?.focus()
      }, 2000)
    })
    gamecontroller.on('x:down', () => {
      console.log('Button X pressed, printing game subprocess!')
      console.log(this.childApp)
    })
  }
}
