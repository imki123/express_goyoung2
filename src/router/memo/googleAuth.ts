import { OAuth2Client } from 'google-auth-library'

const googleClient = new OAuth2Client()

export type GoogleCredentialPayload = {
  email: string
  sub: string
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

  if (!payload?.email || !payload.sub) {
    return null
  }

  return {
    email: payload.email,
    sub: payload.sub,
    name: payload.name,
    picture: payload.picture,
  }
}
