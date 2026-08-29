export type TwoFactorEmailData = {
  email: string
  last_token: string | null
  token_sent: number
  attempts: number
}
