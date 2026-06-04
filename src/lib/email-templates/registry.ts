import type { ComponentType } from 'react'
import { template as ticketReceipt } from './ticket-receipt'
import { template as contributionReceipt } from './contribution-receipt'
import { template as purchaseAdminNotification } from './purchase-admin-notification'
import { template as trialStarted } from './trial-started'
import { template as trialEndingSoon } from './trial-ending-soon'
import { template as paymentFailed } from './payment-failed'
import { template as subscriptionCanceled } from './subscription-canceled'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'ticket-receipt': ticketReceipt,
  'contribution-receipt': contributionReceipt,
  'purchase-admin-notification': purchaseAdminNotification,
  'trial-started': trialStarted,
  'trial-ending-soon': trialEndingSoon,
  'payment-failed': paymentFailed,
  'subscription-canceled': subscriptionCanceled,
}
