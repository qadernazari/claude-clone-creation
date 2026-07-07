import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from '@react-email/components'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName, oldEmail, newEmail, confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Confirm your email change for ${siteName} · تأیید تغییر ایمیل`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{siteName}</Heading>
        <Section>
          <Heading style={h1}>Confirm your email change</Heading>
          <Text style={text}>
            You requested to change your {siteName} email from{' '}
            <Link href={`mailto:${oldEmail}`} style={link}>{oldEmail}</Link>{' '}
            to{' '}
            <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link>.
          </Text>
          <Button style={button} href={confirmationUrl}>Confirm change</Button>
          <Text style={footer}>
            If you didn't request this change, please secure your account
            immediately.
          </Text>
        </Section>

        <Hr style={hr} />

        <Section dir="rtl" style={{ textAlign: 'right' }}>
          <Heading style={h1}>تأیید تغییر ایمیل</Heading>
          <Text style={text}>
            درخواست تغییر ایمیل حساب {siteName} شما از{' '}
            <Link href={`mailto:${oldEmail}`} style={link}>{oldEmail}</Link>{' '}
            به{' '}
            <Link href={`mailto:${newEmail}`} style={link}>{newEmail}</Link> ثبت شد.
          </Text>
          <Button style={button} href={confirmationUrl}>تأیید تغییر</Button>
          <Text style={footer}>
            اگر این تغییر را درخواست نکرده‌اید، لطفاً فوراً حساب خود را ایمن کنید.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
const container = { padding: '28px 24px', maxWidth: '560px' }
const brand = { fontSize: '14px', letterSpacing: '0.2em', color: '#0a0807', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0a0807', margin: '0 0 12px' }
const text = { fontSize: '15px', color: '#3a3531', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#0a0807', textDecoration: 'underline' }
const button = { backgroundColor: '#0a0807', color: '#fefdfb', padding: '12px 22px', borderRadius: '6px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999', margin: '24px 0 0' }
const hr = { borderColor: '#e8e4dd', margin: '24px 0' }
