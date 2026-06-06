import * as React from 'react'
import {
  Body, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from '@react-email/components'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({
  siteName, siteUrl, recipient, confirmationUrl, token,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {siteName} verification code{token ? `: ${token}` : ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{siteName}</Heading>
        <Section>
          <Heading style={h1}>Confirm your email</Heading>
          <Text style={text}>
            Welcome to{' '}
            <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>
            . Enter this code to confirm <strong>{recipient}</strong>{' '}
            and start streaming independent Iranian cinema.
          </Text>
          {token && <Text style={codeStyle}>{token}</Text>}
          <Text style={hint}>
            This code expires in 60 minutes. Or you can{' '}
            <Link href={confirmationUrl} style={link}>verify with a link</Link>.
          </Text>
          <Text style={footer}>
            If you didn't create an account, you can safely ignore this email.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
const container = { padding: '28px 24px', maxWidth: '560px' }
const brand = { fontSize: '14px', letterSpacing: '0.2em', color: '#0a0807', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0a0807', margin: '0 0 12px' }
const text = { fontSize: '15px', color: '#3a3531', lineHeight: '1.6', margin: '0 0 16px' }
const link = { color: '#0a0807', textDecoration: 'underline' }
const codeStyle = { fontFamily: 'Menlo, Courier, monospace', fontSize: '32px', letterSpacing: '0.35em', fontWeight: 'bold' as const, color: '#0a0807', margin: '8px 0 20px' }
const hint = { fontSize: '13px', color: '#666', lineHeight: '1.6', margin: '0 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '24px 0 0' }
