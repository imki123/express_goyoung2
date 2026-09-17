import { OAuth2Client } from 'google-auth-library'

const googleClient = new OAuth2Client()

export type GoogleCredentialPayload = {
  email: string
  sub: string
  email_verified: boolean
  name?: string
  picture?: string
}

export const verifyGoogleCredential = async (
  idToken: string,
  audience: string
): Promise<GoogleCredentialPayload | null> => {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience,
  })

  const payload = ticket.getPayload()

  if (!payload?.email || !payload.sub || payload.email_verified !== true) {
    return null
  }

  return {
    email: payload.email,
    sub: payload.sub,
    email_verified: payload.email_verified,
    name: payload.name,
    picture: payload.picture,
  }
}
