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
    <Preview>Continue watching with membership</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{SITE_NAME}</Heading>
        <Section>
          <Heading style={h1}>Continue watching with membership</Heading>
          <Text style={text}>
            Your free trial has ended. Your account, watchlist, and history are
            saved — pick up right where you left off whenever you're ready.
          </Text>
          <Text style={text}>
            Join {SITE_NAME} membership to unlock the full catalog again.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={membershipUrl} style={button}>Become a member</Button>
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
  subject: 'Continue watching with membership',
  displayName: 'Trial · expired',
  previewData: { membershipUrl: 'https://ir.show/account' },
} satisfies TemplateEntry
