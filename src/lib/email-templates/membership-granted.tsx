import * as React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { SITE_NAME, brand, button, container, footer, h1, hr, main, meta, text } from './_lifecycle-shared'

interface Props {
  monthsLabel?: string
  expiresFormatted?: string
  browseUrl?: string
  accountUrl?: string
}

const Email = ({
  monthsLabel = '',
  expiresFormatted = '',
  browseUrl = 'https://ir.show/browse',
  accountUrl = 'https://ir.show/account',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been granted free access to {SITE_NAME} · دسترسی رایگان به {SITE_NAME} برای شما فعال شد</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{SITE_NAME}</Heading>
        <Section>
          <Heading style={h1}>You've been granted free access 🎁</Heading>
          <Text style={text}>
            Great news! Our team has granted you {monthsLabel ? <strong>{monthsLabel} of </strong> : null}free access to {SITE_NAME}. You can now watch all films without any payment.
          </Text>
          {expiresFormatted ? <Text style={meta}>Access valid until <strong>{expiresFormatted}</strong>.</Text> : null}
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={browseUrl} style={button}>Start watching</Button>
          </Section>
          <Text style={meta}>View your membership details on your <a href={accountUrl}>account page</a>.</Text>
        </Section>
        <Hr style={hr} />
        <Section dir="rtl" style={{ textAlign: 'right' }}>
          <Heading style={h1}>دسترسی رایگان برای شما فعال شد 🎁</Heading>
          <Text style={text}>
            خبر خوب! تیم ما {monthsLabel ? <><strong>{monthsLabel} </strong>از </> : null}دسترسی رایگان به {SITE_NAME} را برای شما فعال کرده است. می‌توانید همه فیلم‌ها را بدون پرداخت تماشا کنید.
          </Text>
          {expiresFormatted ? <Text style={meta}>اعتبار تا <strong>{expiresFormatted}</strong></Text> : null}
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={browseUrl} style={button}>شروع تماشا</Button>
          </Section>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} · ir.show</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: `You've been granted free access to ${SITE_NAME}`,
  displayName: 'Membership granted (free)',
  previewData: {
    monthsLabel: '3 months',
    expiresFormatted: 'Oct 1, 2026',
    browseUrl: 'https://ir.show/browse',
    accountUrl: 'https://ir.show/account',
  },
} satisfies TemplateEntry
