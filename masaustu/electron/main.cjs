const { app, BrowserWindow, shell, session } = require('electron')
const path = require('node:path')

// Yeni sipariş sesi kullanıcı tıklamadan da çalabilsin
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

// Uygulama ikinci kez açılırsa mevcut pencereyi öne getir
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

let win

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 880,
    minWidth: 1100,
    minHeight: 700,
    title: 'Restoran Sipariş',
    backgroundColor: '#fafaf9',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))

  // Dış bağlantılar (ör. QR menü adresi) varsayılan tarayıcıda açılsın
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) event.preventDefault()
  })
}

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.whenReady().then(() => {
  // Sadece bildirim iznine izin ver; kamera, mikrofon, konum vb. hepsi kapalı
  session.defaultSession.setPermissionRequestHandler((_wc, izin, cevap) => cevap(izin === 'notifications'))
  createWindow()
})
app.on('window-all-closed', () => app.quit())
