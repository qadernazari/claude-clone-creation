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

interface ContributionReceiptProps {
  amountFormatted?: string
  filmTitleEn?: string | null
  filmTitleFa?: string | null
}

const ContributionReceiptEmail = ({
  amountFormatted = '',
  filmTitleEn,
  filmTitleFa,
}: ContributionReceiptProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Thank you for supporting {SITE_NAME} · از حمایت شما سپاسگزاریم
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{SITE_NAME}</Heading>

        <Section>
          <Heading style={h1}>Thank you for your contribution</Heading>
          <Text style={text}>
            Your gift of <strong>{amountFormatted}</strong> helps{' '}
            {filmTitleEn
              ? <>support the team behind <strong>{filmTitleEn}</strong></>
              : <>bring more Iranian shorts to a global audience</>}
            . We&apos;re grateful.
          </Text>
        </Section>

        <Hr style={hr} />

        <Section dir="rtl" style={{ textAlign: 'right' }}>
          <Heading style={h1}>از حمایت شما سپاسگزاریم</Heading>
          <Text style={text}>
            مشارکت <strong>{amountFormatted}</strong> شما{' '}
            {filmTitleFa || filmTitleEn
              ? <>به تیم فیلم <strong>{filmTitleFa || filmTitleEn}</strong> کمک می‌کند</>
              : <>به ما کمک می‌کند فیلم‌های کوتاه ایرانی بیشتری را به مخاطب جهانی برسانیم</>}
            .
          </Text>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} · ir.show</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContributionReceiptEmail,
  subject: 'Thank you for supporting IRAN',
  displayName: 'Contribution receipt',
  previewData: {
    amountFormatted: '$25.00',
    filmTitleEn: 'The Wind Will Carry Us',
    filmTitleFa: 'باد ما را خواهد برد',
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
const hr = { borderColor: '#e8e4dd', margin: '24px 0' }
const footer = {
  fontSize: '12px',
  color: '#999',
  textAlign: 'center' as const,
  margin: '8px 0 0',
}
