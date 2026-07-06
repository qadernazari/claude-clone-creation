import * as React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { SITE_NAME, brand, button, container, footer, h1, hr, main, meta, text } from './_lifecycle-shared'

interface Props {
  monthsLabel?: string
  expiresFormatted?: string
  browseUrl?: string
}

const Email = ({
  monthsLabel = '',
  expiresFormatted = '',
  browseUrl = 'https://ir.show/browse',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} membership has been restored · عضویت شما بازگردانده شد</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{SITE_NAME}</Heading>
        <Section>
          <Heading style={h1}>Your membership has been restored</Heading>
          <Text style={text}>
            Good news — your {SITE_NAME} membership has been restored{monthsLabel ? <> for <strong>{monthsLabel}</strong></> : null}. You have full access to the library again.
          </Text>
          {expiresFormatted ? <Text style={meta}>Access valid until <strong>{expiresFormatted}</strong>.</Text> : null}
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={browseUrl} style={button}>Start watching</Button>
          </Section>
        </Section>
        <Hr style={hr} />
        <Section dir="rtl" style={{ textAlign: 'right' }}>
          <Heading style={h1}>عضویت شما بازگردانده شد</Heading>
          <Text style={text}>
            خبر خوب — عضویت {SITE_NAME} شما{monthsLabel ? <> برای <strong>{monthsLabel}</strong></> : null} بازگردانده شده است. دوباره دسترسی کامل به کتابخانه دارید.
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
  subject: `Your ${SITE_NAME} membership has been restored`,
  displayName: 'Membership restored',
  previewData: {
    monthsLabel: '3 months',
    expiresFormatted: 'Oct 1, 2026',
    browseUrl: 'https://ir.show/browse',
  },
} satisfies TemplateEntry
