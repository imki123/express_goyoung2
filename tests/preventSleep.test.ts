import axios, { AxiosHeaders, type AxiosResponse } from 'axios'
import { startPreventSleep, stopPreventSleep } from '../src/preventSleep'

let mockAxiosGet: jest.SpiedFunction<typeof axios.get>

const createAxiosResponse = (): AxiosResponse<unknown> => ({
  data: undefined,
  status: 200,
  statusText: 'OK',
  headers: new AxiosHeaders(),
  config: {
    headers: new AxiosHeaders(),
  },
})

describe('prevent sleep', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockAxiosGet = jest.spyOn(axios, 'get')
    process.env.MAIN_SERVER_URL = 'https://main.example/'
    delete process.env.SUB_SERVER_URL
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
    jest.spyOn(console, 'info').mockImplementation(() => undefined)
  })

  afterEach(() => {
    stopPreventSleep()
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('sets a five-second timeout for the immediate request', () => {
    mockAxiosGet.mockResolvedValue(createAxiosResponse())

    startPreventSleep()

    expect(mockAxiosGet).toHaveBeenCalledWith('https://main.example/ping', {
      timeout: 5000,
    })
  })

  it('does not make a second immediate request when started twice', () => {
    mockAxiosGet.mockResolvedValue(createAxiosResponse())

    startPreventSleep()
    startPreventSleep()

    expect(mockAxiosGet).toHaveBeenCalledTimes(1)
  })

  it('does not overlap an unsettled batch and starts the next batch after it settles', async () => {
    let fulfillRequest: (_response: AxiosResponse<unknown>) => void = () => undefined
    const pendingRequest = new Promise<AxiosResponse<unknown>>((resolve) => {
      fulfillRequest = resolve
    })
    mockAxiosGet.mockImplementation(() => pendingRequest)

    startPreventSleep()
    jest.advanceTimersByTime(1000 * 60 * 10)

    expect(mockAxiosGet).toHaveBeenCalledTimes(1)

    fulfillRequest(createAxiosResponse())
    await pendingRequest
    await Promise.resolve()
    await Promise.resolve()
    jest.advanceTimersByTime(1000 * 60 * 10)

    expect(mockAxiosGet).toHaveBeenCalledTimes(2)
  })

  it('clears the cadence interval when stopped', () => {
    mockAxiosGet.mockResolvedValue(createAxiosResponse())

    startPreventSleep()
    stopPreventSleep()
    jest.advanceTimersByTime(1000 * 60 * 10)

    expect(mockAxiosGet).toHaveBeenCalledTimes(1)
  })

  it('logs concise diagnostics for a rejected Axios request', async () => {
    const requestUrl = 'https://main.example/ping?region=kr'
    const responseData = 'x'.repeat(2500)
    const requestConfig = {
      url: requestUrl,
      method: 'get',
      headers: new AxiosHeaders({ Authorization: 'secret' }),
      data: 'request body',
    }
    const response: AxiosResponse<string> = {
      data: responseData,
      status: 503,
      statusText: 'Service Unavailable',
      headers: new AxiosHeaders(),
      config: {
        ...requestConfig,
        headers: requestConfig.headers,
      },
    }
    const error = new axios.AxiosError(
      'Ping failed',
      'ERR_BAD_RESPONSE',
      requestConfig,
      undefined,
      response
    )
    const consoleError = jest.spyOn(console, 'error')
    mockAxiosGet.mockRejectedValue(error)

    startPreventSleep()
    await Promise.resolve()
    await Promise.resolve()

    expect(consoleError).toHaveBeenCalledWith(
      '[preventSleep] Main Server Error:',
      {
        method: 'GET',
        url: requestUrl,
        status: 503,
        code: 'ERR_BAD_RESPONSE',
        message: 'Ping failed',
        responseData: responseData.slice(0, 2000),
      }
    )
    expect(consoleError.mock.calls[0][1]).not.toHaveProperty('request')
    expect(JSON.stringify(consoleError.mock.calls[0])).not.toContain(
      'Authorization'
    )
    expect(JSON.stringify(consoleError.mock.calls[0])).not.toContain(
      'request body'
    )
  })
})
