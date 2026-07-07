import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from '@react-email/components'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Reset your password for ${siteName} · بازیابی رمز عبور`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{siteName}</Heading>
        <Section>
          <Heading style={h1}>Reset your password</Heading>
          <Text style={text}>
            We received a request to reset your password for {siteName}. Click
            the button below to choose a new one.
          </Text>
          <Button style={button} href={confirmationUrl}>Reset password</Button>
          <Text style={footer}>
            If you didn't request a reset, you can safely ignore this email —
            your password will stay the same.
          </Text>
        </Section>

        <Hr style={hr} />

        <Section dir="rtl" style={{ textAlign: 'right' }}>
          <Heading style={h1}>بازیابی رمز عبور</Heading>
          <Text style={text}>
            درخواستی برای بازیابی رمز عبور {siteName} شما دریافت کردیم. برای
            انتخاب رمز جدید روی دکمه زیر بزنید.
          </Text>
          <Button style={button} href={confirmationUrl}>بازیابی رمز عبور</Button>
          <Text style={footer}>
            اگر این درخواست را نداده‌اید، این ایمیل را نادیده بگیرید — رمز عبور
            شما تغییری نمی‌کند.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
const container = { padding: '28px 24px', maxWidth: '560px' }
const brand = { fontSize: '14px', letterSpacing: '0.2em', color: '#0a0807', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0a0807', margin: '0 0 12px' }
const text = { fontSize: '15px', color: '#3a3531', lineHeight: '1.6', margin: '0 0 20px' }
const button = { backgroundColor: '#0a0807', color: '#fefdfb', padding: '12px 22px', borderRadius: '6px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999', margin: '24px 0 0' }
const hr = { borderColor: '#e8e4dd', margin: '24px 0' }
