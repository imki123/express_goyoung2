import { logProcessError } from '../src/processErrorLogger'

describe('logProcessError', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('logs an Error stack or message without passing the Error object', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const error = new Error('failure')

    logProcessError('[ProcessError]', error)

    expect(consoleError).toHaveBeenCalledWith('[ProcessError]', error.stack)
    expect(consoleError.mock.calls[0]).not.toContain(error)
  })

  it('uses the Error message when its stack is unavailable', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const error = new Error('failure')
    error.stack = undefined

    logProcessError('[ProcessError]', error)

    expect(consoleError).toHaveBeenCalledWith('[ProcessError]', 'failure')
  })

  it('logs a rejected string without changing it', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    logProcessError('[ProcessError]', 'rejected')

    expect(consoleError).toHaveBeenCalledWith('[ProcessError]', 'rejected')
  })

  it('does not pass nested values from a plain rejection object', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const reason = {
      secret: 'nested-secret',
      details: { password: 'nested-password' },
    }

    logProcessError('[ProcessError]', reason)

    expect(consoleError).toHaveBeenCalledWith(
      '[ProcessError]',
      'Process error reason of type object'
    )
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('nested-secret')
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('nested-password')
  })
})
