import process from 'node:process'
import axios from 'axios'

const TEN_MINUTES_IN_MS = 1000 * 60 * 10

export const startPreventSleep = () => {
  const mainServerUrl = process.env.MAIN_SERVER_URL
  const subServerUrl = process.env.SUB_SERVER_URL

  let count = 1
  console.info('[preventSleep] Fetch:', count, mainServerUrl, subServerUrl)

  if (mainServerUrl) {
    console.info(`[preventSleep] Main Server URL: ${mainServerUrl}`)
    axios.get(mainServerUrl).catch((error) => {
      console.error('[preventSleep] Main Server Error:', error)
    })
  }

  if (subServerUrl) {
    axios.get(subServerUrl).catch((error) => {
      console.error('[preventSleep] Sub Server Error:', error)
    })
  }

  const interval = setInterval(() => {
    console.info('[preventSleep] Fetch:', ++count, mainServerUrl, subServerUrl)

    if (mainServerUrl) {
      axios.get(mainServerUrl).catch((error) => {
        console.error('[preventSleep] Main Server Error:', error)
      })
    }

    if (subServerUrl) {
      axios.get(subServerUrl).catch((error) => {
        console.error('[preventSleep] Sub Server Error:', error)
      })
    }
  }, TEN_MINUTES_IN_MS)

  process.on('SIGINT', () => {
    clearInterval(interval)
    console.info('[preventSleep] Stopped')
  })
}
