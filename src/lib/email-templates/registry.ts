import type { ComponentType } from 'react'
import { template as ticketReceipt } from './ticket-receipt'
import { template as contributionReceipt } from './contribution-receipt'
import { template as purchaseAdminNotification } from './purchase-admin-notification'
import { template as trialStarted } from './trial-started'
import { template as trialEndingSoon } from './trial-ending-soon'
import { template as trialDay5 } from './trial-day-5'
import { template as trialDay6 } from './trial-day-6'
import { template as trialFinalDay } from './trial-final-day'
import { template as trialExpired } from './trial-expired'
import { template as paymentFailed } from './payment-failed'
import { template as subscriptionCanceled } from './subscription-canceled'
import { template as membershipActivated } from './membership-activated'
import { template as membershipRevoked } from './membership-revoked'
import { template as membershipGranted } from './membership-granted'
import { template as membershipRestored } from './membership-restored'
import { template as heroPerfAlert } from './hero-perf-alert'



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
  'trial-day-5': trialDay5,
  'trial-day-6': trialDay6,
  'trial-final-day': trialFinalDay,
  'trial-expired': trialExpired,
  'payment-failed': paymentFailed,
  'subscription-canceled': subscriptionCanceled,
  'membership-activated': membershipActivated,
  'membership-revoked': membershipRevoked,
  'membership-granted': membershipGranted,
  'membership-restored': membershipRestored,
}


