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
  trialDays?: number
  trialEndFormatted?: string
  manageUrl?: string
  browseUrl?: string
}

const Email = ({
  trialDays = 7,
  trialEndFormatted = '',
  manageUrl = '#',
  browseUrl = '#',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your ${trialDays}-day ${SITE_NAME} trial has started · دوره آزمایشی شما آغاز شد`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{SITE_NAME}</Heading>

        <Section>
          <Heading style={h1}>Welcome to {SITE_NAME}</Heading>
          <Text style={text}>
            Your <strong>{trialDays}-day free trial</strong> is now active. Stream
            the full library of independent Iranian cinema, with new films added
            every month.
          </Text>
          {trialEndFormatted ? (
            <Text style={meta}>
              Your trial ends on <strong>{trialEndFormatted}</strong>. We'll
              email you before then.
            </Text>
          ) : null}
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={browseUrl} style={button}>
              Start watching
            </Button>
          </Section>
          <Text style={meta}>
            You can cancel anytime from your <a href={manageUrl}>membership page</a>.
          </Text>
        </Section>

        <Hr style={hr} />

        <Section dir="rtl" style={{ textAlign: 'right' }}>
          <Heading style={h1}>به {SITE_NAME} خوش آمدید</Heading>
          <Text style={text}>
            دوره آزمایشی <strong>{trialDays} روزه</strong> شما فعال شد. به همه‌ی
            فیلم‌های مستقل ایرانی دسترسی دارید.
          </Text>
          {trialEndFormatted ? (
            <Text style={meta}>
              پایان دوره آزمایشی: <strong>{trialEndFormatted}</strong>
            </Text>
          ) : null}
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={browseUrl} style={button}>
              شروع تماشا
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
  subject: `Your ${SITE_NAME} free trial is active`,
  displayName: 'Trial started',
  previewData: {
    trialDays: 7,
    trialEndFormatted: 'Jun 11, 2026',
    manageUrl: 'https://ir.show/membership',
    browseUrl: 'https://ir.show/browse',
  },
} satisfies TemplateEntry
