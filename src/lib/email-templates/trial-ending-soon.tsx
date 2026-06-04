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
  trialEndFormatted?: string
  priceFormatted?: string
  manageUrl?: string
}

const Email = ({
  trialEndFormatted = '',
  priceFormatted = '',
  manageUrl = '#',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Your {SITE_NAME} trial ends soon · پایان دوره آزمایشی نزدیک است
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{SITE_NAME}</Heading>

        <Section>
          <Heading style={h1}>Your trial ends soon</Heading>
          <Text style={text}>
            Just a heads-up — your free trial ends on{' '}
            <strong>{trialEndFormatted || 'soon'}</strong>. After that,
            your membership will renew{' '}
            {priceFormatted ? (
              <>at <strong>{priceFormatted}</strong></>
            ) : (
              'at the standard rate'
            )}{' '}
            so you can keep watching without interruption.
          </Text>
          <Text style={meta}>
            No action needed to continue. To cancel, visit your membership
            page before the trial ends.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={manageUrl} style={button}>
              Manage membership
            </Button>
          </Section>
        </Section>

        <Hr style={hr} />

        <Section dir="rtl" style={{ textAlign: 'right' }}>
          <Heading style={h1}>پایان دوره آزمایشی نزدیک است</Heading>
          <Text style={text}>
            دوره آزمایشی شما در تاریخ{' '}
            <strong>{trialEndFormatted || 'به‌زودی'}</strong> به پایان می‌رسد.
            پس از آن اشتراک{' '}
            {priceFormatted ? (
              <>به مبلغ <strong>{priceFormatted}</strong></>
            ) : null}{' '}
            تمدید می‌شود تا بتوانید بدون وقفه تماشا کنید.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={manageUrl} style={button}>
              مدیریت اشتراک
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
  subject: `Your ${SITE_NAME} trial ends soon`,
  displayName: 'Trial ending soon',
  previewData: {
    trialEndFormatted: 'Jun 11, 2026',
    priceFormatted: '$9.99 / month',
    manageUrl: 'https://ir.show/membership',
  },
} satisfies TemplateEntry
