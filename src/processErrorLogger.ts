export const logProcessError = (prefix: string, reason: unknown): void => {
  const message =
    reason instanceof Error
      ? reason.stack
        ? reason.stack.split('\n').slice(0, 3).join('\n').slice(0, 1000)
        : reason.message
      : typeof reason === 'string'
      ? reason
      : `Process error reason of type ${typeof reason}`

  console.error(prefix.slice(0, 2000), message.slice(0, 2000))
}
