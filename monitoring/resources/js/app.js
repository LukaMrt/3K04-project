import Alpine from 'alpinejs'
import { Transmit } from '@adonisjs/transmit-client'

const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''

/**
 * Live channel (Server-Sent Events) shared by the whole page. Subscriptions are
 * POST requests, so they carry the CSRF token like any other form.
 */
const transmit = new Transmit({
  baseUrl: window.location.origin,
  beforeSubscribe: (request) => request.headers.set('X-CSRF-TOKEN', csrfToken),
  beforeUnsubscribe: (request) => request.headers.set('X-CSRF-TOKEN', csrfToken),
})

/**
 * Home page check: subscribe to "system/echo", then ask the server to
 * broadcast on it and display the round trip.
 */
Alpine.data('liveCheck', function () {
  return {
    connected: false,
    status: 'Connecting…',
    async init() {
      const subscription = transmit.subscription('system/echo')
      subscription.onMessage(({ sentAt }) => {
        this.status = `Event received (sent at ${new Date(sentAt).toLocaleTimeString()})`
      })
      try {
        await subscription.create()
        this.connected = true
        this.status = 'Connected'
      } catch {
        this.status = 'Connection failed'
      }
    },
    async ping() {
      this.status = 'Waiting for event…'
      await fetch('/system/echo', { method: 'POST', headers: { 'X-CSRF-TOKEN': csrfToken } })
    },
  }
})

Alpine.data('alert', function () {
  return {
    isVisible: false,
    dismiss() {
      this.isVisible = false
    },
    init() {
      setTimeout(() => {
        this.isVisible = true
      }, 80)
      setTimeout(() => {
        this.dismiss()
      }, 5000)
    },
  }
})

Alpine.data('themeToggle', function () {
  return {
    theme: 'light',
    init() {
      this.theme = this.$el.dataset.initialTheme || 'light'
    },
    toggle() {
      const next = this.theme === 'dark' ? 'light' : 'dark'
      this.theme = next
      document.documentElement.setAttribute('data-theme', next)
      document.cookie = `app_theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    },
  }
})

/**
 * Audible cue of an alarm (NFR-ACC-01): two short beeps made by the browser, no sound
 * file. Browsers only play sound after a click or a key press on the page itself, so the
 * choice "sound on" is remembered in the browser, and each new page turns the sound back
 * on at the first click or key press anywhere on it.
 */
const SOUND_KEY = 'alarm-sound'

function soundWanted() {
  try {
    return localStorage.getItem(SOUND_KEY) === 'on'
  } catch {
    return false
  }
}

function rememberSound(on) {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off')
  } catch {
    // Private window or blocked storage: the choice only lasts for this page.
  }
}

let audio = null
function beep() {
  if (!audio || audio.state !== 'running') return
  for (const start of [0, 0.35]) {
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.frequency.value = 880
    gain.gain.value = 0.2
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start(audio.currentTime + start)
    oscillator.stop(audio.currentTime + start + 0.2)
  }
}

/** Same rule as app/modules/dashboard/presentation.ts: colour only adds to the text. */
function labelClass(value) {
  if (['OFFLINE', 'UNREACHABLE', 'FAULT', 'critical', 'error'].includes(value)) {
    return 'label label--danger'
  }
  if (['MAINTENANCE', 'PENDING', 'warning'].includes(value)) return 'label label--warn'
  if (value === 'ONLINE') return 'label label--ok'
  return 'label'
}

/**
 * Main view of the dashboard (resources/views/pages/dashboard.edge). Starts from the state
 * rendered by the server, then follows the "alarms" and "adcs" channels of the live
 * channel (app/modules/dashboard/live_channel.ts).
 */
Alpine.data('dashboard', function (initial) {
  return {
    ...initial,
    soundOn: false,
    soundReady: false,
    flash: false,
    announcement: '',
    timers: {},
    labelClass,

    /** Times to the second (D-34), in the time zone of the hospital given by the server (D-43). */
    time(value) {
      return value ? new Date(value).toLocaleString('sv-SE', { timeZone: this.timeZone }) : '—'
    },

    init() {
      if (soundWanted()) this.enableSound()
      for (const alarm of this.alarms) this.startCue(alarm)
      if (this.canAlarms) this.listen('alarms', (event) => this.onAlarm(event))
      if (this.canStatuses) this.listen('adcs', (event) => this.onStatus(event))
    },

    async listen(channel, handler) {
      const subscription = transmit.subscription(channel)
      subscription.onMessage(handler)
      await subscription.create()
    },

    /**
     * Turns the sound on now if the browser allows it, otherwise at the first click or key
     * press on the page.
     */
    enableSound() {
      audio = audio ?? new AudioContext()
      audio.onstatechange = () => (this.soundReady = audio.state === 'running')
      audio.resume().catch(() => {})
      this.soundReady = audio.state === 'running'
      this.soundOn = true
      rememberSound(true)
      const unlock = () => audio.resume().catch(() => {})
      window.addEventListener('pointerdown', unlock, { once: true })
      window.addEventListener('keydown', unlock, { once: true })
    },

    disableSound() {
      audio?.suspend()
      this.soundOn = false
      rememberSound(false)
    },

    /** NFR-PRF-01: a new alarm is shown at once, with a visual and an audible cue. */
    onAlarm(event) {
      if (event.kind === 'raised') {
        const alarm = {
          ...event.alarm,
          adcLabel: event.adcLabel,
          audibleRepeatSeconds: event.audibleRepeatSeconds,
        }
        this.alarms.unshift(alarm)
        this.announcement = `New ${alarm.severity} alarm on ${alarm.adcLabel}: ${alarm.alarmType}`
        this.flash = true
        setTimeout(() => (this.flash = false), 3000)
        beep()
        this.startCue(alarm)
      } else {
        this.alarms = this.alarms.filter((alarm) => alarm.alarmId !== event.alarmId)
        this.stopCue(event.alarmId)
      }
    },

    /** NFR-SAF-04: the cue repeats as the Alarm Manager says, until acknowledged. */
    startCue(alarm) {
      if (!alarm.audibleRepeatSeconds) return
      this.timers[alarm.alarmId] = setInterval(beep, alarm.audibleRepeatSeconds * 1000)
    },

    stopCue(alarmId) {
      clearInterval(this.timers[alarmId])
      delete this.timers[alarmId]
    },

    /** D-22: a status change is shown at once; an ADC entering the list reloads it. */
    onStatus({ status, label }) {
      const adc = this.adcs.find((candidate) => candidate.adcId === status.adcId)
      const matches = !this.filter || status.displayedStatus === this.filter
      if (!adc && matches) return window.location.reload()

      if (adc && matches) Object.assign(adc, status)
      if (adc && !matches) this.adcs = this.adcs.filter((other) => other !== adc)

      this.attention = this.attention.filter((other) => other.adcId !== status.adcId)
      if (this.attentionStatuses.includes(status.displayedStatus)) {
        this.attention.push({ ...status, label })
      }
    },
  }
})

Alpine.start()
