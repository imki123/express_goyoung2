import process from 'node:process'
import axios from 'axios'

const TEN_MINUTES_IN_MS = 1000 * 60 * 10
const REQUEST_TIMEOUT_IN_MS = 5000

let preventSleepInterval: ReturnType<typeof setInterval> | undefined
let activePreventSleepBatch: Promise<void> | undefined

type PingTarget = {
  serverName: 'Main' | 'Sub'
  serverUrl: string
}

const createPingUrl = (serverUrl: string): string =>
  `${serverUrl.replace(/\/+$/, '')}/ping`

const stringifyResponseData = (data: unknown): string => {
  try {
    const serializedData = typeof data === 'string' ? data : JSON.stringify(data)
    return (serializedData ?? String(data)).slice(0, 2000)
  } catch {
    return '[unserializable response data]'
  }
}

const logPingError = (
  serverName: PingTarget['serverName'],
  error: unknown
): void => {
  if (axios.isAxiosError(error)) {
    console.error(`[preventSleep] ${serverName} Server Error:`, {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status ?? error.status,
      code: error.code,
      message: error.message,
      responseData: stringifyResponseData(error.response?.data),
    })
    return
  }

  const message = error instanceof Error ? error.message : String(error)
  console.error(`[preventSleep] ${serverName} Server Error:`, message)
}

const startPreventSleepBatch = (
  count: number,
  pingTargets: PingTarget[]
): void => {
  if (activePreventSleepBatch !== undefined) {
    return
  }

  console.info(
    '[preventSleep] Fetch:',
    count,
    ...pingTargets.map(({ serverUrl }) => createPingUrl(serverUrl))
  )

  activePreventSleepBatch = Promise.allSettled(
    pingTargets.map(({ serverUrl }) =>
      axios.get(createPingUrl(serverUrl), { timeout: REQUEST_TIMEOUT_IN_MS })
    )
  )
    .then((results) => {
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logPingError(pingTargets[index].serverName, result.reason)
        }
      })
    })
    .finally(() => {
      activePreventSleepBatch = undefined
    })
}

export const startPreventSleep = (): void => {
  if (preventSleepInterval !== undefined) {
    return
  }

  const mainServerUrl = process.env.MAIN_SERVER_URL
  const subServerUrl = process.env.SUB_SERVER_URL
  const pingTargets: PingTarget[] = []

  if (mainServerUrl) {
    console.info(`[preventSleep] Main Server URL: ${mainServerUrl}`)
    pingTargets.push({
      serverName: 'Main',
      serverUrl: mainServerUrl,
    })
  }

  if (subServerUrl) {
    pingTargets.push({
      serverName: 'Sub',
      serverUrl: subServerUrl,
    })
  }

  let count = 0
  const runPreventSleepBatch = (): void => {
    startPreventSleepBatch(++count, pingTargets)
  }

  preventSleepInterval = setInterval(runPreventSleepBatch, TEN_MINUTES_IN_MS)
  runPreventSleepBatch()
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
