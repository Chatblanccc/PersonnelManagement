export interface TokenPayload {
  sub: string
  exp: number
  iat?: number
  token_type: 'access' | 'refresh'
  roles?: string[]
  permissions?: string[]
}

