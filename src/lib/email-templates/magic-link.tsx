import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your sign-in link for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{siteName}</Heading>
        <Section>
          <Heading style={h1}>Sign in to {siteName}</Heading>
          <Text style={text}>
            Tap the button below to sign in. This link expires shortly and can
            only be used once.
          </Text>
          <Button style={button} href={confirmationUrl}>Sign in</Button>
          <Text style={footer}>
            If you didn't request this link, you can safely ignore this email.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
const container = { padding: '28px 24px', maxWidth: '560px' }
const brand = { fontSize: '14px', letterSpacing: '0.2em', color: '#0a0807', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0a0807', margin: '0 0 12px' }
const text = { fontSize: '15px', color: '#3a3531', lineHeight: '1.6', margin: '0 0 20px' }
const button = { backgroundColor: '#0a0807', color: '#fefdfb', padding: '12px 22px', borderRadius: '6px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999', margin: '24px 0 0' }
