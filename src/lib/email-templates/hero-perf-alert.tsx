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

interface Breach {
  bucket: string
  kind: 'lcp' | 'cache_hit' | 'both'
  lcpP75Ms: number | null
  cacheHitRate: number | null
  sampleCount: number
}

interface HeroPerfAlertProps {
  windowMinutes?: number
  breaches?: Breach[]
  dashboardUrl?: string
}

const Email = ({
  windowMinutes = 30,
  breaches = [],
  dashboardUrl = 'https://ir.show/admin/hero-perf',
}: HeroPerfAlertProps) => {
  const count = breaches.length
  const label = count === 1 ? 'breach' : 'breaches'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`Hero performance alert — ${count} ${label} in the last ${windowMinutes} min`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={brand}>{SITE_NAME} · Perf alert</Heading>
          <Heading style={h1}>Hero LCP / cache-hit alert</Heading>
          <Text style={meta}>
            {count} viewport {label} in the last {windowMinutes} minutes.
          </Text>
          <Section>
            {breaches.map((b) => (
              <div key={b.bucket} style={row}>
                <Text style={rowTitle}>{b.bucket}</Text>
                <Text style={rowBody}>
                  LCP p75:{' '}
                  <strong>{b.lcpP75Ms == null ? '—' : `${b.lcpP75Ms} ms`}</strong>
                  <br />
                  Cache-hit rate:{' '}
                  <strong>
                    {b.cacheHitRate == null
                      ? '—'
                      : `${Math.round(b.cacheHitRate * 100)}%`}
                  </strong>
                  <br />
                  Samples: <strong>{b.sampleCount}</strong>
                  <br />
                  Trigger: <strong>{b.kind}</strong>
                </Text>
              </div>
            ))}
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            Open the dashboard: {dashboardUrl}
            <br />
            {SITE_NAME} · ir.show
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    const n = Array.isArray(data?.breaches) ? data.breaches.length : 0
    return `[${SITE_NAME}] Hero perf alert — ${n} breach${n === 1 ? '' : 'es'}`
  },
  displayName: 'Hero perf alert',
  previewData: {
    windowMinutes: 30,
    breaches: [
      { bucket: 'mobile', kind: 'both', lcpP75Ms: 3120, cacheHitRate: 0.62, sampleCount: 41 },
    ],
    dashboardUrl: 'https://ir.show/admin/hero-perf',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const brand = { fontSize: '13px', color: '#888', margin: '0 0 12px', letterSpacing: '1px', textTransform: 'uppercase' as const }
const h1 = { fontSize: '22px', color: '#111', margin: '0 0 8px' }
const meta = { fontSize: '14px', color: '#333', margin: '0 0 16px' }
const row = { borderTop: '1px solid #eee', padding: '12px 0' }
const rowTitle = { fontSize: '14px', color: '#111', margin: 0, textTransform: 'capitalize' as const, fontWeight: 700 }
const rowBody = { fontSize: '13px', color: '#444', margin: '4px 0 0', lineHeight: '20px' }
const hr = { borderColor: '#eee', margin: '20px 0' }
const footer = { fontSize: '12px', color: '#888' }
