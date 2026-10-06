let ctx

/** Yeni sipariş için iki tonlu, dikkat çekici ama rahatsız etmeyen bir "ding-dong" çalar. */
export function zilCal() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') ctx.resume()
    const t = ctx.currentTime
    ;[
      [880, 0],
      [660, 0.22],
    ].forEach(([frekans, gecikme]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = frekans
      gain.gain.setValueAtTime(0.0001, t + gecikme)
      gain.gain.exponentialRampToValueAtTime(0.35, t + gecikme + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + gecikme + 0.6)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t + gecikme)
      osc.stop(t + gecikme + 0.65)
    })
  } catch {
    /* ses çalınamazsa sessizce devam et */
  }
}

/** Uygulama arka plandayken Windows bildirimi gösterir. */
export function masaustuBildirimi(baslik, govde) {
  if (!('Notification' in window) || document.hasFocus()) return
  const goster = () => new Notification(baslik, { body: govde, silent: true })
  if (Notification.permission === 'granted') goster()
  else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((p) => p === 'granted' && goster())
  }
}
