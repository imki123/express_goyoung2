export const logProcessError = (prefix: string, reason: unknown): void => {
  const message =
    reason instanceof Error
      ? reason.stack ?? reason.message
      : typeof reason === 'string'
        ? reason
        : `Process error reason of type ${typeof reason}`

  console.error(prefix, message)
}
