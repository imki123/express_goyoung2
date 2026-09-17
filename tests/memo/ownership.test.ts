import { MemoUserModel } from '../../src/model/memoUser'
import { resolveMemoOwnership } from '../../src/router/memo/ownership'

const canonicalEmail = 'canonical@example.com'
const authorizedSubAccountEmail = 'sub-account@example.com'
const authorizedSubAccount = {
  email: authorizedSubAccountEmail,
  sub: 'sub-account-sub',
}

const setSharingConfig = (
  configuredCanonicalEmail: string | undefined,
  configuredSubAccountEmail: string | undefined
) => {
  if (configuredCanonicalEmail === undefined) {
    delete process.env.MEMO_CANONICAL_OWNER_EMAIL
  } else {
    process.env.MEMO_CANONICAL_OWNER_EMAIL = configuredCanonicalEmail
  }

  if (configuredSubAccountEmail === undefined) {
    delete process.env.MEMO_AUTHORIZED_SUB_ACCOUNT_EMAIL
  } else {
    process.env.MEMO_AUTHORIZED_SUB_ACCOUNT_EMAIL = configuredSubAccountEmail
  }
}

describe('resolveMemoOwnership', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    delete process.env.MEMO_CANONICAL_OWNER_EMAIL
    delete process.env.MEMO_AUTHORIZED_SUB_ACCOUNT_EMAIL
  })

  it.each([
    [canonicalEmail, undefined],
    [undefined, authorizedSubAccountEmail],
    ['', authorizedSubAccountEmail],
    [canonicalEmail, ''],
    [canonicalEmail, canonicalEmail],
  ])(
    'fails closed for invalid sharing configuration',
    async (configuredCanonicalEmail, configuredSubAccountEmail) => {
      setSharingConfig(configuredCanonicalEmail, configuredSubAccountEmail)

      const ownership = await resolveMemoOwnership(authorizedSubAccount)

      expect(ownership).toBeNull()
    }
  )

  it('fails closed when the configured canonical user does not exist', async () => {
    process.env.MEMO_CANONICAL_OWNER_EMAIL = canonicalEmail
    process.env.MEMO_AUTHORIZED_SUB_ACCOUNT_EMAIL = authorizedSubAccountEmail
    jest.spyOn(MemoUserModel, 'findOne').mockResolvedValueOnce(null)

    const ownership = await resolveMemoOwnership(authorizedSubAccount)

    expect(ownership).toBeNull()
  })

  it('uses independent ownership when both sharing configuration values are blank', async () => {
    setSharingConfig('  ', '\t')
    const findOneSpy = jest.spyOn(MemoUserModel, 'findOne')

    const ownership = await resolveMemoOwnership(authorizedSubAccount)

    expect(ownership).toEqual({
      owner: authorizedSubAccount,
      canonicalUser: null,
    })
    expect(findOneSpy).not.toHaveBeenCalled()
  })

  it('uses the persisted canonical sub rather than configuration for the shared owner', async () => {
    process.env.MEMO_CANONICAL_OWNER_EMAIL = canonicalEmail
    process.env.MEMO_AUTHORIZED_SUB_ACCOUNT_EMAIL = authorizedSubAccountEmail
    jest.spyOn(MemoUserModel, 'findOne').mockResolvedValueOnce({
      email: canonicalEmail,
      sub: 'persisted-canonical-sub',
    } as never)

    const ownership = await resolveMemoOwnership(authorizedSubAccount)

    expect(ownership?.owner).toEqual({
      email: canonicalEmail,
      sub: 'persisted-canonical-sub',
    })
  })

  it('trims sharing emails before resolving the canonical user', async () => {
    process.env.MEMO_CANONICAL_OWNER_EMAIL = ` ${canonicalEmail} `
    process.env.MEMO_AUTHORIZED_SUB_ACCOUNT_EMAIL = ` ${authorizedSubAccountEmail} `
    jest.spyOn(MemoUserModel, 'findOne').mockResolvedValueOnce({
      email: canonicalEmail,
      sub: 'persisted-canonical-sub',
    } as never)

    const ownership = await resolveMemoOwnership(authorizedSubAccount)

    expect(ownership?.owner).toEqual({
      email: canonicalEmail,
      sub: 'persisted-canonical-sub',
    })
    expect(MemoUserModel.findOne).toHaveBeenCalledWith({
      email: canonicalEmail,
    })
  })
})
