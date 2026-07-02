import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import {
  SITE_NAME,
  brand,
  button,
  container,
  footer,
  h1,
  hr,
  main,
  meta,
  text,
} from './_lifecycle-shared'

interface Props {
  monthsLabel?: string
  expiresFormatted?: string
  refId?: string
  browseUrl?: string
  accountUrl?: string
}

const Email = ({
  monthsLabel = '',
  expiresFormatted = '',
  refId = '',
  browseUrl = 'https://ir.show/browse',
  accountUrl = 'https://ir.show/account',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your ${SITE_NAME} membership is active · عضویت شما فعال شد`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{SITE_NAME}</Heading>

        <Section>
          <Heading style={h1}>Payment received — membership activated</Heading>
          <Text style={text}>
            Thanks for supporting Iranian cinema. Your {monthsLabel ? <strong>{monthsLabel} </strong> : null}
            membership is now active and you have unlimited access to the full library.
          </Text>
          {expiresFormatted ? (
            <Text style={meta}>Access valid until <strong>{expiresFormatted}</strong>.</Text>
          ) : null}
          {refId ? <Text style={meta}>Transaction reference: <strong>{refId}</strong></Text> : null}
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={browseUrl} style={button}>Start watching</Button>
          </Section>
          <Text style={meta}>
            Manage your membership from your <a href={accountUrl}>account page</a>.
          </Text>
        </Section>

        <Hr style={hr} />

        <Section dir="rtl" style={{ textAlign: 'right' }}>
          <Heading style={h1}>پرداخت دریافت شد — عضویت فعال است</Heading>
          <Text style={text}>
            از حمایت شما از سینمای ایران سپاسگزاریم. عضویت{monthsLabel ? <> <strong>{monthsLabel}</strong> </> : ' '}
            شما فعال است و دسترسی نامحدود به کل کتابخانه دارید.
          </Text>
          {expiresFormatted ? (
            <Text style={meta}>اعتبار تا <strong>{expiresFormatted}</strong></Text>
          ) : null}
          {refId ? <Text style={meta}>شماره تراکنش: <strong>{refId}</strong></Text> : null}
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
  subject: `Your ${SITE_NAME} membership is active`,
  displayName: 'Membership activated',
  previewData: {
    monthsLabel: '3 months',
    expiresFormatted: 'Sep 11, 2026',
    refId: '123456789',
    browseUrl: 'https://ir.show/browse',
    accountUrl: 'https://ir.show/account',
  },
} satisfies TemplateEntry
