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
  accessUntilFormatted?: string
  resubscribeUrl?: string
}

const Email = ({
  accessUntilFormatted = '',
  resubscribeUrl = '#',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Your {SITE_NAME} membership has been canceled · اشتراک شما لغو شد
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{SITE_NAME}</Heading>

        <Section>
          <Heading style={h1}>Your membership has been canceled</Heading>
          <Text style={text}>
            We're sorry to see you go. Your {SITE_NAME} membership has been
            canceled and will not renew.
          </Text>
          {accessUntilFormatted ? (
            <Text style={meta}>
              You still have full access until{' '}
              <strong>{accessUntilFormatted}</strong>.
            </Text>
          ) : null}
          <Text style={text}>
            Change of heart? You can reactivate anytime — we'll be here, and
            so will the films.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={resubscribeUrl} style={button}>
              Reactivate membership
            </Button>
          </Section>
        </Section>

        <Hr style={hr} />

        <Section dir="rtl" style={{ textAlign: 'right' }}>
          <Heading style={h1}>اشتراک شما لغو شد</Heading>
          <Text style={text}>
            اشتراک {SITE_NAME} شما لغو شد و دیگر تمدید نمی‌شود.
          </Text>
          {accessUntilFormatted ? (
            <Text style={meta}>
              تا تاریخ <strong>{accessUntilFormatted}</strong> همچنان دسترسی
              کامل دارید.
            </Text>
          ) : null}
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={resubscribeUrl} style={button}>
              فعال‌سازی مجدد
            </Button>
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
  subject: `Your ${SITE_NAME} membership has been canceled`,
  displayName: 'Subscription canceled',
  previewData: {
    accessUntilFormatted: 'Jul 1, 2026',
    resubscribeUrl: 'https://ir.show/membership',
  },
} satisfies TemplateEntry
