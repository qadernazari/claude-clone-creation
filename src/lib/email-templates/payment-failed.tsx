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
  buttonAlt,
  container,
  footer,
  h1,
  hr,
  main,
  meta,
  text,
} from './_lifecycle-shared'

interface Props {
  amountFormatted?: string
  nextAttemptFormatted?: string
  updatePaymentUrl?: string
}

const Email = ({
  amountFormatted = '',
  nextAttemptFormatted = '',
  updatePaymentUrl = '#',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Payment failed for your {SITE_NAME} membership · مشکل در پرداخت
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{SITE_NAME}</Heading>

        <Section>
          <Heading style={h1}>We couldn't process your payment</Heading>
          <Text style={text}>
            Your most recent membership payment{' '}
            {amountFormatted ? <>of <strong>{amountFormatted}</strong> </> : null}
            didn't go through. This usually means your card expired or your bank
            declined the charge.
          </Text>
          {nextAttemptFormatted ? (
            <Text style={meta}>
              We'll try again on <strong>{nextAttemptFormatted}</strong>. To
              avoid losing access, please update your payment method now.
            </Text>
          ) : (
            <Text style={meta}>
              Please update your payment method to keep your membership active.
            </Text>
          )}
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={updatePaymentUrl} style={buttonAlt}>
              Update payment method
            </Button>
          </Section>
        </Section>

        <Hr style={hr} />

        <Section dir="rtl" style={{ textAlign: 'right' }}>
          <Heading style={h1}>پرداخت شما انجام نشد</Heading>
          <Text style={text}>
            آخرین پرداخت عضویت شما{' '}
            {amountFormatted ? <>به مبلغ <strong>{amountFormatted}</strong> </> : null}
            موفق نبود. معمولاً به این دلیل است که کارت منقضی شده یا توسط بانک
            رد شده است.
          </Text>
          {nextAttemptFormatted ? (
            <Text style={meta}>
              تلاش بعدی: <strong>{nextAttemptFormatted}</strong>
            </Text>
          ) : null}
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={updatePaymentUrl} style={buttonAlt}>
              به‌روزرسانی روش پرداخت
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
  subject: `Action needed: payment failed for your ${SITE_NAME} membership`,
  displayName: 'Payment failed',
  previewData: {
    amountFormatted: '$9.99',
    nextAttemptFormatted: 'Jun 7, 2026',
    updatePaymentUrl: 'https://ir.show/membership',
  },
} satisfies TemplateEntry
