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

const SITE_NAME = 'IRAN'

interface TicketReceiptProps {
  filmTitleEn?: string
  filmTitleFa?: string
  amountFormatted?: string
  watchUrl?: string
}

const TicketReceiptEmail = ({
  filmTitleEn = 'your film',
  filmTitleFa,
  amountFormatted = '',
  watchUrl = '#',
}: TicketReceiptProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Your ticket for {filmTitleEn} is ready · بلیط فیلم شما آماده است
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{SITE_NAME}</Heading>

        {/* English */}
        <Section>
          <Heading style={h1}>Your ticket is ready</Heading>
          <Text style={text}>
            Thank you for supporting independent Iranian cinema. Your ticket
            for <strong>{filmTitleEn}</strong> is confirmed.
          </Text>
          <Text style={meta}>
            Amount paid: <strong>{amountFormatted}</strong>
            <br />
            Access: <strong>Lifetime — yours forever</strong>
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={watchUrl} style={button}>
              Watch now
            </Button>
          </Section>
        </Section>

        <Hr style={hr} />

        {/* Persian */}
        <Section dir="rtl" style={{ textAlign: 'right' }}>
          <Heading style={h1}>بلیط شما آماده است</Heading>
          <Text style={text}>
            از حمایت شما از سینمای مستقل ایران سپاسگزاریم. بلیط شما برای فیلم{' '}
            <strong>{filmTitleFa || filmTitleEn}</strong> ثبت شد.
          </Text>
          <Text style={meta}>
            مبلغ پرداخت‌شده: <strong>{amountFormatted}</strong>
            <br />
            دسترسی: <strong>مادام‌العمر — همیشه در حساب شما</strong>
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={watchUrl} style={button}>
              تماشای فیلم
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
  component: TicketReceiptEmail,
  subject: (data: Record<string, any>) =>
    `Your ${SITE_NAME} ticket — ${data?.filmTitleEn ?? 'your film'}`,
  displayName: 'Ticket receipt',
  previewData: {
    filmTitleEn: 'The Wind Will Carry Us',
    filmTitleFa: 'باد ما را خواهد برد',
    amountFormatted: '$4.99',
    watchUrl: 'https://ir.show/watch/the-wind',
  },
    filmTitleEn: 'The Wind Will Carry Us',
    filmTitleFa: 'باد ما را خواهد برد',
    amountFormatted: '$4.99',
    watchUrl: 'https://ir.show/watch/the-wind',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
}
const container = { padding: '28px 24px', maxWidth: '560px' }
const brand = {
  fontSize: '14px',
  letterSpacing: '0.2em',
  color: '#0a0807',
  margin: '0 0 24px',
}
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0a0807',
  margin: '0 0 12px',
}
const text = {
  fontSize: '15px',
  color: '#3a3531',
  lineHeight: '1.6',
  margin: '0 0 12px',
}
const meta = {
  fontSize: '14px',
  color: '#55504a',
  lineHeight: '1.7',
  margin: '0 0 8px',
}
const button = {
  backgroundColor: '#0a0807',
  color: '#fefdfb',
  padding: '12px 22px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
}
const hr = { borderColor: '#e8e4dd', margin: '24px 0' }
const footer = {
  fontSize: '12px',
  color: '#999',
  textAlign: 'center' as const,
  margin: '8px 0 0',
}
