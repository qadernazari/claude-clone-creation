import * as React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { SITE_NAME, brand, button, container, footer, h1, hr, main, text } from './_lifecycle-shared'

interface Props {
  membershipUrl?: string
}

const Email = ({ membershipUrl = 'https://ir.show/membership' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} membership has ended · دسترسی عضویت شما پایان یافت</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{SITE_NAME}</Heading>
        <Section>
          <Heading style={h1}>Your membership access has ended</Heading>
          <Text style={text}>
            Your {SITE_NAME} membership has been ended by our team. If you believe this was a mistake, please contact us at hello@ir.show.
          </Text>
          <Text style={text}>
            You can reactivate your membership at any time.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={membershipUrl} style={button}>Reactivate membership</Button>
          </Section>
        </Section>
        <Hr style={hr} />
        <Section dir="rtl" style={{ textAlign: 'right' }}>
          <Heading style={h1}>دسترسی عضویت شما پایان یافت</Heading>
          <Text style={text}>
            عضویت شما در {SITE_NAME} توسط تیم ما پایان یافته است. اگر فکر می‌کنید این اشتباه است، لطفاً با hello@ir.show تماس بگیرید.
          </Text>
          <Text style={text}>
            می‌توانید در هر زمان عضویت خود را دوباره فعال کنید.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={membershipUrl} style={button}>فعال‌سازی مجدد عضویت</Button>
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
  subject: `Your ${SITE_NAME} membership has ended`,
  displayName: 'Membership revoked',
  previewData: { membershipUrl: 'https://ir.show/membership' },
} satisfies TemplateEntry
