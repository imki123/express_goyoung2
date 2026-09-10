import { logProcessError } from '../src/processErrorLogger'

describe('logProcessError', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('logs the first three Error stack lines without passing the Error object', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const error = new Error('failure')
    error.stack = ['Error: failure', 'line 1', 'line 2', 'line 3'].join('\n')

    logProcessError('[ProcessError]', error)

    expect(consoleError).toHaveBeenCalledWith(
      '[ProcessError]',
      ['Error: failure', 'line 1', 'line 2'].join('\n')
    )
    expect(consoleError.mock.calls[0]).not.toContain(error)
  })

  it('caps a retained Error stack at 1000 characters', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const error = new Error('failure')
    error.stack = `Error: failure\n${'stack line '.repeat(200)}`

    logProcessError('[ProcessError]', error)

    expect(consoleError).toHaveBeenCalledWith(
      '[ProcessError]',
      error.stack.slice(0, 1000)
    )
    expect(consoleError.mock.calls[0][1]).toHaveLength(1000)
    expect(consoleError.mock.calls[0]).not.toContain(error)
  })

  it('uses the Error message when its stack is unavailable', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const error = new Error('failure')
    error.stack = undefined

    logProcessError('[ProcessError]', error)

    expect(consoleError).toHaveBeenCalledWith('[ProcessError]', 'failure')
  })

  it('logs a rejected string without changing it', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    logProcessError('[ProcessError]', 'rejected')

    expect(consoleError).toHaveBeenCalledWith('[ProcessError]', 'rejected')
  })

  it('caps a dynamic string at 2000 characters', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const reason = 'rejected'.repeat(300)

    logProcessError('[ProcessError]', reason)

    expect(consoleError).toHaveBeenCalledWith(
      '[ProcessError]',
      reason.slice(0, 2000)
    )
    expect(consoleError.mock.calls[0][1]).toHaveLength(2000)
  })

  it('does not pass nested values from a plain rejection object', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)
    const reason = {
      secret: 'nested-secret',
      details: { password: 'nested-password' },
    }

    logProcessError('[ProcessError]', reason)

    expect(consoleError).toHaveBeenCalledWith(
      '[ProcessError]',
      'Process error reason of type object'
    )
    expect(consoleError.mock.calls[0]).not.toContain(reason)
    expect(consoleError.mock.calls[0]).not.toContain('nested-secret')
    expect(consoleError.mock.calls[0]).not.toContain('nested-password')
  })
})
