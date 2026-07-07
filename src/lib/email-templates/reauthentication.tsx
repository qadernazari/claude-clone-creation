import * as React from 'react'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from '@react-email/components'

interface ReauthenticationEmailProps {
  token: string
  siteName?: string
}

export const ReauthenticationEmail = ({ token, siteName = 'IRAN' }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your ${siteName} verification code · کد تأیید هویت`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{siteName}</Heading>
        <Section>
          <Heading style={h1}>Confirm it's you</Heading>
          <Text style={text}>Use the code below to confirm your identity:</Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={footer}>
            This code will expire shortly. If you didn't request it, you can
            safely ignore this email.
          </Text>
        </Section>

        <Hr style={hr} />

        <Section dir="rtl" style={{ textAlign: 'right' }}>
          <Heading style={h1}>تأیید هویت</Heading>
          <Text style={text}>برای تأیید هویت خود از کد زیر استفاده کنید:</Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={footer}>
            این کد به‌زودی منقضی می‌شود. اگر آن را درخواست نکرده‌اید، ایمیل را
            نادیده بگیرید.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
const container = { padding: '28px 24px', maxWidth: '560px' }
const brand = { fontSize: '14px', letterSpacing: '0.2em', color: '#0a0807', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0a0807', margin: '0 0 12px' }
const text = { fontSize: '15px', color: '#3a3531', lineHeight: '1.6', margin: '0 0 16px' }
const codeStyle = { fontFamily: 'Menlo, Courier, monospace', fontSize: '28px', letterSpacing: '0.3em', fontWeight: 'bold' as const, color: '#0a0807', margin: '8px 0 24px' }
const footer = { fontSize: '12px', color: '#999', margin: '24px 0 0' }
const hr = { borderColor: '#e8e4dd', margin: '24px 0' }
