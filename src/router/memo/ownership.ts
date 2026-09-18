import {
  MemoUserModel,
  type MemoJwtPayload,
  type MemoUserDocument,
} from '../../model/memoUser'
import type { HydratedDocument } from 'mongoose'

export type MemoOwner = Pick<MemoJwtPayload, 'email' | 'sub'>

type PersistedMemoUser = HydratedDocument<MemoUserDocument>

export type MemoOwnership = {
  readonly owner: MemoOwner
  readonly canonicalUser: PersistedMemoUser | null
}

const normalizeSharingEmail = (email: string | undefined) => email?.trim()

const getMemoSharingEmails = () => {
  const canonicalOwnerEmail = normalizeSharingEmail(
    process.env.MEMO_CANONICAL_OWNER_EMAIL
  )
  const authorizedSubAccountEmails =
    process.env.MEMO_AUTHORIZED_SUB_ACCOUNT_EMAIL
      ?.split(',')
      .map((email) => normalizeSharingEmail(email))
      .filter((email): email is string => Boolean(email)) ?? []

  if (
    !canonicalOwnerEmail && authorizedSubAccountEmails.length === 0
  ) {
    return null
  }

  if (
    !canonicalOwnerEmail ||
    authorizedSubAccountEmails.length === 0 ||
    authorizedSubAccountEmails.includes(canonicalOwnerEmail)
  ) {
    return undefined
  }

  return { canonicalOwnerEmail, authorizedSubAccountEmails }
}

export const resolveMemoOwnership = async (
  authenticatedUser: MemoOwner
): Promise<MemoOwnership | null> => {
  const sharingEmails = getMemoSharingEmails()

  if (sharingEmails === undefined) {
    return null
  }

  if (sharingEmails === null) {
    return { owner: authenticatedUser, canonicalUser: null }
  }

  if (
    authenticatedUser.email !== sharingEmails.canonicalOwnerEmail &&
    !sharingEmails.authorizedSubAccountEmails.includes(authenticatedUser.email)
  ) {
    return { owner: authenticatedUser, canonicalUser: null }
  }

  const canonicalUser = await MemoUserModel.findOne({
    email: sharingEmails.canonicalOwnerEmail,
  })

  if (!canonicalUser) {
    return null
  }

  return {
    owner: { email: canonicalUser.email, sub: canonicalUser.sub },
    canonicalUser,
  }
}
