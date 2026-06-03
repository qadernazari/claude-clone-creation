import * as React from 'react'
import {
  Body,
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

interface PurchaseAdminNotificationProps {
  kind?: 'ticket' | 'contribution'
  buyerEmail?: string
  amountFormatted?: string
  filmTitleEn?: string | null
  occurredAtFormatted?: string
}

const PurchaseAdminNotificationEmail = ({
  kind = 'ticket',
  buyerEmail = 'unknown',
  amountFormatted = '',
  filmTitleEn = null,
  occurredAtFormatted = '',
}: PurchaseAdminNotificationProps) => {
  const label = kind === 'contribution' ? 'New contribution' : 'New ticket sold'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {label}
        {amountFormatted ? ` · ${amountFormatted}` : ''}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={brand}>{SITE_NAME} · Admin</Heading>
          <Section>
            <Heading style={h1}>{label}</Heading>
            <Text style={meta}>
              Buyer: <strong>{buyerEmail}</strong>
              {amountFormatted ? (
                <>
                  <br />
                  Amount: <strong>{amountFormatted}</strong>
                </>
              ) : null}
              {filmTitleEn ? (
                <>
                  <br />
                  Film: <strong>{filmTitleEn}</strong>
                </>
              ) : null}
              {occurredAtFormatted ? (
                <>
                  <br />
                  When: <strong>{occurredAtFormatted}</strong>
                </>
              ) : null}
            </Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>{SITE_NAME} · ir.show</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PurchaseAdminNotificationEmail,
  subject: (data: Record<string, any>) => {
    const kind = data?.kind === 'contribution' ? 'contribution' : 'ticket'
    const amt = data?.amountFormatted ? ` ${data.amountFormatted}` : ''
    return `[${SITE_NAME}] New ${kind}${amt}`
  },
  displayName: 'Admin: new purchase',
  previewData: {
    kind: 'ticket',
    buyerEmail: 'fan@example.com',
    amountFormatted: '$4.99',
    filmTitleEn: 'The Wind Will Carry Us',
    occurredAtFormatted: 'Jun 3, 2026, 11:00 PM',
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
const meta = {
  fontSize: '14px',
  color: '#55504a',
  lineHeight: '1.7',
  margin: '0 0 8px',
}
const hr = { borderColor: '#e8e4dd', margin: '24px 0' }
const footer = {
  fontSize: '12px',
  color: '#999',
  textAlign: 'center' as const,
  margin: '8px 0 0',
}
