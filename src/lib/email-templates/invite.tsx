import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from '@react-email/components'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to join {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{siteName}</Heading>
        <Section>
          <Heading style={h1}>You've been invited</Heading>
          <Text style={text}>
            You've been invited to join{' '}
            <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>
            . Accept the invitation to create your account.
          </Text>
          <Button style={button} href={confirmationUrl}>Accept invitation</Button>
          <Text style={footer}>
            If you weren't expecting this, you can safely ignore this email.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
const container = { padding: '28px 24px', maxWidth: '560px' }
const brand = { fontSize: '14px', letterSpacing: '0.2em', color: '#0a0807', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0a0807', margin: '0 0 12px' }
const text = { fontSize: '15px', color: '#3a3531', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#0a0807', textDecoration: 'underline' }
const button = { backgroundColor: '#0a0807', color: '#fefdfb', padding: '12px 22px', borderRadius: '6px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999', margin: '24px 0 0' }
