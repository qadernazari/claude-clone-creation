import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { SITE_NAME, brand, button, container, footer, h1, hr, main, text } from './_lifecycle-shared'

interface Props { membershipUrl?: string }

const Email = ({ membershipUrl = '#' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Last day of your membership trial · آخرین روز آزمایش رایگان`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{SITE_NAME}</Heading>
        <Section>
          <Heading style={h1}>Last day of your membership trial</Heading>
          <Text style={text}>
            Today is the final day of your {SITE_NAME} membership trial. We hope
            you've enjoyed exploring the platform.
          </Text>
          <Text style={text}>
            To keep streaming the full catalog tomorrow and beyond, choose a
            membership plan whenever you're ready.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={membershipUrl} style={button}>Continue with membership</Button>
          </Section>
        </Section>

        <Hr style={hr} />

        <Section dir="rtl" style={{ textAlign: 'right' }}>
          <Heading style={h1}>آخرین روز آزمایش رایگان شما</Heading>
          <Text style={text}>
            امروز آخرین روز دوره آزمایش عضویت شما در {SITE_NAME} است. امیدواریم
            از گشت‌وگذار در پلتفرم لذت برده باشید.
          </Text>
          <Text style={text}>
            برای ادامه‌ی تماشای کل کتابخانه از فردا به بعد، هر زمان آماده بودید
            یک طرح عضویت انتخاب کنید.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={membershipUrl} style={button}>ادامه با عضویت</Button>
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
  subject: 'Last day of your membership trial',
  displayName: 'Trial · final day',
  previewData: { membershipUrl: 'https://ir.show/account' },
} satisfies TemplateEntry
