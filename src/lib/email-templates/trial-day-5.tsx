import * as React from 'react'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { SITE_NAME, brand, button, container, footer, h1, hr, main, text } from './_lifecycle-shared'

interface Props { browseUrl?: string }

const Email = ({ browseUrl = '#' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're enjoying unlimited access</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>{SITE_NAME}</Heading>
        <Section>
          <Heading style={h1}>You're enjoying unlimited access</Heading>
          <Text style={text}>
            A quick reminder that your membership trial gives you full access to our
            library of films, documentaries, and exclusive content.
          </Text>
          <Text style={text}>
            New here? Browse curated collections, award-winners, and originals.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={browseUrl} style={button}>Continue watching</Button>
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
  subject: "You're enjoying unlimited access",
  displayName: 'Trial · day 5',
  previewData: { browseUrl: 'https://ir.show/browse' },
} satisfies TemplateEntry
