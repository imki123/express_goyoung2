import mongoose from 'mongoose'

let hasDatabaseStarted = false

const connectDatabaseWithRetry = async (
  retryCount = 0,
  maxRetries = 10
): Promise<void> => {
  const baseDelay = 1000
  const maxDelay = 30000
  const delay = Math.min(baseDelay * 2 ** retryCount, maxDelay)

  try {
    await mongoose.connect(process.env.MONGO_DB_URI || '', {
      serverSelectionTimeoutMS: 5000,
    })
    console.info(`[dbConnected] retryCount: ${retryCount}`)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(
      `[dbRetry] Attempt ${retryCount + 1}/${maxRetries + 1} failed:`,
      errorMessage
    )

    if (retryCount < maxRetries) {
      console.info(`[dbRetry] Retrying in ${delay}ms...`)
      setTimeout(() => {
        void connectDatabaseWithRetry(retryCount + 1, maxRetries)
      }, delay)
    } else {
      console.error(
        '[dbFailed] Max retries reached. DB connection failed permanently.'
      )
    }
  }
}

export const startDatabase = (): void => {
  if (hasDatabaseStarted) {
    return
  }

  hasDatabaseStarted = true
  mongoose.set('strictQuery', false)

  mongoose.connection.on('disconnected', () => {
    console.error('[dbDisconnected] MongoDB disconnected.')
  })

  mongoose.connection.on('error', (error) => {
    console.error('[dbError] MongoDB connection error:', error)
  })

  void connectDatabaseWithRetry()
}
