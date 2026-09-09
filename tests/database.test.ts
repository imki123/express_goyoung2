jest.mock('mongoose', () => ({
  __esModule: true,
  default: {
    set: jest.fn(),
    connect: jest.fn(),
    connection: {
      on: jest.fn(),
    },
  },
}))

type DatabaseTestContext = {
  mongoose: typeof import('mongoose').default
  startDatabase: () => void
}

const loadDatabaseInIsolatedModule = async (): Promise<DatabaseTestContext> => {
  let databaseTestContext: DatabaseTestContext | undefined

  await jest.isolateModulesAsync(async () => {
    const mongoose = (await import('mongoose')).default
    const { startDatabase } = await import('../src/database')
    databaseTestContext = { mongoose, startDatabase }
  })

  if (databaseTestContext === undefined) {
    throw new Error('Database module did not load')
  }

  return databaseTestContext
}

describe('database startup', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    process.env.MONGO_DB_URI = 'mongodb://database.example/test'
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
    jest.spyOn(console, 'info').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('does not connect or register listeners when the module is imported', async () => {
    const { mongoose } = await loadDatabaseInIsolatedModule()
    const mockMongooseSet = jest.mocked(mongoose.set)
    const mockMongooseConnect = jest.mocked(mongoose.connect)
    const mockConnectionOn = jest.mocked(mongoose.connection.on)

    expect(mockMongooseSet).not.toHaveBeenCalled()
    expect(mockMongooseConnect).not.toHaveBeenCalled()
    expect(mockConnectionOn).not.toHaveBeenCalled()
  })

  it('limits initial connection attempts to eleven with a five-second selection timeout', async () => {
    const { mongoose, startDatabase } = await loadDatabaseInIsolatedModule()
    const mockMongooseConnect = jest.mocked(mongoose.connect)
    mockMongooseConnect.mockRejectedValue(new Error('unavailable'))

    startDatabase()
    await jest.runAllTimersAsync()

    expect(mockMongooseConnect).toHaveBeenCalledTimes(11)
    expect(mockMongooseConnect).toHaveBeenCalledWith(
      'mongodb://database.example/test',
      { serverSelectionTimeoutMS: 5000 }
    )
  })

  it('only logs when Mongoose disconnects instead of manually reconnecting', async () => {
    const { mongoose, startDatabase } = await loadDatabaseInIsolatedModule()
    const mockMongooseConnect = jest.mocked(mongoose.connect)
    const mockConnectionOn = jest.mocked(mongoose.connection.on)
    mockMongooseConnect.mockResolvedValue(mongoose)

    startDatabase()
    await Promise.resolve()
    mockMongooseConnect.mockClear()

    const disconnectedListener = mockConnectionOn.mock.calls.find(
      ([event]) => event === 'disconnected'
    )?.[1]
    disconnectedListener?.()

    expect(mockMongooseConnect).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith(
      '[dbDisconnected] MongoDB disconnected.'
    )
  })

  it('registers listeners and starts the initial connection only once', async () => {
    const { mongoose, startDatabase } = await loadDatabaseInIsolatedModule()
    const mockMongooseConnect = jest.mocked(mongoose.connect)
    const mockConnectionOn = jest.mocked(mongoose.connection.on)
    mockMongooseConnect.mockResolvedValue(mongoose)

    startDatabase()
    startDatabase()
    await Promise.resolve()

    expect(mockConnectionOn).toHaveBeenCalledTimes(2)
    expect(mockMongooseConnect).toHaveBeenCalledTimes(1)
  })
})
