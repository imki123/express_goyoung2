import type { NextFunction, Request, Response } from 'express'
import { stopPreventSleep } from './preventSleep'

let completedResponseCount = 0
let knownContentLengthResponseCount = 0
let knownContentLengthBodyByteSum = 0
let unknownContentLengthResponseCount = 0
let lifetimeKnownContentLengthBodyByteSum = 0
let responseDataThresholdWarningEmitted = false

const RESPONSE_BODY_DATA_WINDOW_LIMIT_BYTES = 5 * 1024 * 1024
const RESPONSE_BODY_DATA_WINDOW_DURATION_MILLISECONDS = 10 * 60 * 1000
const responseDataMeasurementStartedAt = Date.now()

const responseBodyDataEstimateInterval = setInterval(() => {
  const currentWindowCompletedResponseCount = completedResponseCount
  const currentWindowKnownContentLengthResponseCount =
    knownContentLengthResponseCount
  const currentWindowKnownContentLengthBodyByteSum =
    knownContentLengthBodyByteSum
  const currentWindowUnknownContentLengthResponseCount =
    unknownContentLengthResponseCount
  lifetimeKnownContentLengthBodyByteSum +=
    currentWindowKnownContentLengthBodyByteSum
  const elapsedMilliseconds = Date.now() - responseDataMeasurementStartedAt
  const elapsedTimeHourlyAverageKnownContentLengthBodyBytes =
    elapsedMilliseconds > 0
      ? (lifetimeKnownContentLengthBodyByteSum * 60 * 60 * 1000) /
        elapsedMilliseconds
      : 0
  const roundedElapsedTimeHourlyAverageKnownContentLengthBodyBytes =
    Math.round(elapsedTimeHourlyAverageKnownContentLengthBodyBytes * 10) / 10

  console.info(
    `[response-body-data estimate; not Render billing] 
- measurementWindowMinutes=10
- currentWindowCompletedResponseCount=${currentWindowCompletedResponseCount} 
- currentWindowKnownContentLengthResponseCount=${currentWindowKnownContentLengthResponseCount} 
- currentWindowKnownContentLengthBodyByteSum=${currentWindowKnownContentLengthBodyByteSum} 
- lifetimeKnownContentLengthBodyByteSum=${lifetimeKnownContentLengthBodyByteSum} 
- roundedElapsedTimeHourlyAverageKnownContentLengthBodyBytes=${roundedElapsedTimeHourlyAverageKnownContentLengthBodyBytes} 
- currentWindowUnknownContentLengthResponseCount=${currentWindowUnknownContentLengthResponseCount}`
  )

  if (
    !responseDataThresholdWarningEmitted &&
    currentWindowKnownContentLengthBodyByteSum >
      RESPONSE_BODY_DATA_WINDOW_LIMIT_BYTES
  ) {
    responseDataThresholdWarningEmitted = true
    console.warn(
      '[response-body-data estimate warning; not Render billing] Current 10-minute known Content-Length bytes exceeded 5 MiB. Stopping only the preventSleep recurring interval.'
    )
    stopPreventSleep()
  }

  completedResponseCount = 0
  knownContentLengthResponseCount = 0
  knownContentLengthBodyByteSum = 0
  unknownContentLengthResponseCount = 0
}, RESPONSE_BODY_DATA_WINDOW_DURATION_MILLISECONDS)
responseBodyDataEstimateInterval.unref()

process.once('SIGINT', () => {
  clearInterval(responseBodyDataEstimateInterval)
})
process.once('SIGTERM', () => {
  clearInterval(responseBodyDataEstimateInterval)
})

export const responseBodyDataMeasurementMiddleware = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.once('finish', () => {
    completedResponseCount += 1
    const contentLengthHeader = res.getHeader('content-length')
    const contentLength =
      typeof contentLengthHeader === 'number'
        ? contentLengthHeader
        : typeof contentLengthHeader === 'string' &&
          contentLengthHeader.trim() !== ''
        ? Number(contentLengthHeader)
        : Number.NaN

    if (Number.isSafeInteger(contentLength) && contentLength >= 0) {
      knownContentLengthResponseCount += 1
      knownContentLengthBodyByteSum += contentLength
    } else {
      unknownContentLengthResponseCount += 1
    }
  })
  next()
}
