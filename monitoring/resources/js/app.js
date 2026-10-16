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

Alpine.start()
