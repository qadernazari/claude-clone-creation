import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { SITE_NAME, brand, button, container, footer, h1, hr, main, meta, text } from './_lifecycle-shared'

interface Props { trialEndFormatted?: string; membershipUrl?: string }

const Email = ({ trialEndFormatted = '', membershipUrl = '#' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your free trial ends soon · روز ۶ آزمایش رایگان`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{SITE_NAME}</Heading>
        <Section>
          <Heading style={h1}>Your free trial ends soon</Heading>
          <Text style={text}>
            Your {SITE_NAME} membership trial will end tomorrow
            {trialEndFormatted ? <> on <strong>{trialEndFormatted}</strong></> : null}.
          </Text>
          <Text style={text}>
            If you'd like to keep streaming without interruption, you can upgrade
            to a full membership now.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={membershipUrl} style={button}>View membership options</Button>
          </Section>
          <Text style={meta}>You don't need to do anything if you'd rather let the trial end.</Text>
        </Section>

        <Hr style={hr} />

        <Section dir="rtl" style={{ textAlign: 'right' }}>
          <Heading style={h1}>روز ۶ آزمایش رایگان</Heading>
          <Text style={text}>
            دوره آزمایش عضویت شما در {SITE_NAME} فردا
            {trialEndFormatted ? <> ({<strong>{trialEndFormatted}</strong>})</> : null} به پایان می‌رسد.
          </Text>
          <Text style={text}>
            اگر می‌خواهید بدون وقفه تماشا را ادامه دهید، می‌توانید همین حالا به
            عضویت کامل ارتقا دهید.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={membershipUrl} style={button}>مشاهده گزینه‌های عضویت</Button>
          </Section>
          <Text style={meta}>اگر ترجیح می‌دهید آزمایش به پایان برسد، نیازی به هیچ کاری نیست.</Text>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} · ir.show</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your free trial ends soon',
  displayName: 'Trial · day 6',
  previewData: { trialEndFormatted: 'Jun 11, 2026', membershipUrl: 'https://ir.show/account' },
} satisfies TemplateEntry
