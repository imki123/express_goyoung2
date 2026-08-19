import process from 'node:process'
import axios from 'axios'

const TEN_MINUTES_IN_MS = 1000 * 60 * 10

let preventSleepInterval: ReturnType<typeof setInterval> | undefined

const createPingUrl = (serverUrl: string): string =>
  `${serverUrl.replace(/\/+$/, '')}/ping`

export const startPreventSleep = () => {
  const mainServerUrl = process.env.MAIN_SERVER_URL
  const subServerUrl = process.env.SUB_SERVER_URL

  let count = 1
  console.info(
    '[preventSleep] Fetch:',
    count,
    createPingUrl(mainServerUrl ?? ''),
    createPingUrl(subServerUrl ?? '')
  )

  if (mainServerUrl) {
    console.info(`[preventSleep] Main Server URL: ${mainServerUrl}`)
    axios.get(createPingUrl(mainServerUrl)).catch((error) => {
      console.error('[preventSleep] Main Server Error:', error)
    })
  }

  if (subServerUrl) {
    axios.get(createPingUrl(subServerUrl)).catch((error) => {
      console.error('[preventSleep] Sub Server Error:', error)
    })
  }

  if (preventSleepInterval !== undefined) {
    return
  }

  preventSleepInterval = setInterval(() => {
    console.info('[preventSleep] Fetch:', ++count, mainServerUrl, subServerUrl)

    if (mainServerUrl) {
      axios.get(createPingUrl(mainServerUrl)).catch((error) => {
        console.error('[preventSleep] Main Server Error:', error)
      })
    }

    if (subServerUrl) {
      axios.get(createPingUrl(subServerUrl)).catch((error) => {
        console.error('[preventSleep] Sub Server Error:', error)
      })
    }
  }, TEN_MINUTES_IN_MS)
}

export const stopPreventSleep = (): void => {
  if (preventSleepInterval === undefined) {
    return
  }

  clearInterval(preventSleepInterval)
  preventSleepInterval = undefined
  console.info('[preventSleep] Stopped')
}

process.once('SIGINT', stopPreventSleep)
process.once('SIGTERM', stopPreventSleep)
