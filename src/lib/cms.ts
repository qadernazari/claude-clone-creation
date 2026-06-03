// Shared CMS types + defaults, used by both admin editors and public pages.
// All website content is stored in the `site_content` table keyed by string.

export type BilingualText = { en: string; fa: string };

export type ButtonLabels = {
  watch: BilingualText;
  support: BilingualText;
  pay: BilingualText;
};

export type SupportPayments = {
  enabled: boolean;
  intl: { amounts: number[]; stripe: boolean; paypal: boolean };
  iran: { amounts: number[]; zarinpal: boolean; idpay: boolean; nextpay: boolean };
};

export type HeroSettings = {
  featuredFilmSlug: string | null;
  kicker: BilingualText;
  heading: BilingualText;
};

export type WhyIranCard = { icon: string; heading: BilingualText; body: BilingualText };

export type HomepageSection =
  | { id: string; type: "hero"; hidden?: boolean }
  | { id: string; type: "features"; hidden?: boolean }
  | { id: string; type: "filmrow"; hidden?: boolean; title?: BilingualText; category?: string | null }
  | { id: string; type: "textband"; hidden?: boolean; body?: BilingualText }
  | { id: string; type: "signup"; hidden?: boolean };

export type WelcomeScreen = {
  heading: BilingualText;
  buttonGlobal: BilingualText;
  buttonIran: BilingualText;
};

export type MenuItem = { id: string; label: BilingualText; linkTo: string };

export type FooterColumn = {
  id: string;
  heading: BilingualText;
  links: { id: string; label: BilingualText; href: string }[];
};

export type FooterContent = { columns: FooterColumn[]; copyright: BilingualText };

export type BannerContent = {
  enabled: boolean;
  text: BilingualText;
  ctaLabel: BilingualText;
  ctaHref: string;
  tone: "info" | "warning" | "success";
};

export type FaqContent = {
  heading: BilingualText;
  items: { id: string; question: BilingualText; answer: BilingualText }[];
};

export type Appearance = {
  primary: string;
  accent: string;
  background: string;
  foreground: string;
};

export type PaymentProviderIds = {
  stripe: { publishableKey: string };
  paypal: { clientId: string };
  zarinpal: { merchantId: string };
};

export type SiteAccessMode = "free" | "paid";

// All keys we use in `site_content`. Add a new key here when you add a new CMS section.
export const CMS_KEYS = {
  ACCESS_MODE: "access_mode",
  BUTTON_LABELS: "button_labels",
  SUPPORT_PAYMENTS: "support_payments",
  HERO: "hero",
  WHY_IRAN: "why_iran",
  HOMEPAGE_SECTIONS: "homepage_sections",
  WELCOME: "welcome",
  MENU: "menu",
  FOOTER: "footer",
  BANNER: "banner",
  FAQ: "faq",
  APPEARANCE: "appearance",
  PAYMENT_PROVIDER_IDS: "payment_provider_ids",
} as const;

export const DEFAULT_BUTTON_LABELS: ButtonLabels = {
  watch: { en: "Watch Free", fa: "تماشای رایگان" },
  support: { en: "Support the filmmaker", fa: "حمایت از فیلم‌ساز" },
  pay: { en: "Pay & Watch", fa: "خرید بلیت و تماشا" },
};

export const DEFAULT_SUPPORT_PAYMENTS: SupportPayments = {
  enabled: true,
  intl: { amounts: [3, 4, 6, 9], stripe: true, paypal: true },
  iran: { amounts: [50000, 100000, 200000], zarinpal: false, idpay: false, nextpay: false },
};

export const DEFAULT_HERO: HeroSettings = {
  featuredFilmSlug: null,
  kicker: { en: "Original Iranian short films", fa: "آثار کوتاه اختصاصی ایرانی" },
  heading: { en: "Cinema, in its true voice.", fa: "سینما، با صدای واقعی‌اش." },
};

export const DEFAULT_WHY_IRAN: { cards: WhyIranCard[] } = {
  cards: [
    {
      icon: "🎬",
      heading: { en: "Curated", fa: "گزیده" },
      body: { en: "Hand-picked Iranian shorts.", fa: "فیلم‌های کوتاه ایرانی منتخب." },
    },
    {
      icon: "💝",
      heading: { en: "Pay per film", fa: "پرداخت برای هر فیلم" },
      body: { en: "No subscription required.", fa: "بدون نیاز به اشتراک." },
    },
    {
      icon: "🌍",
      heading: { en: "Bilingual", fa: "دوزبانه" },
      body: { en: "English & Persian throughout.", fa: "انگلیسی و فارسی در سراسر سایت." },
    },
    {
      icon: "🤝",
      heading: { en: "Support filmmakers", fa: "حمایت از فیلم‌سازان" },
      body: { en: "Tip directly. They keep most of it.", fa: "حمایت مستقیم از فیلم‌سازان." },
    },
  ],
};

export const DEFAULT_HOMEPAGE_SECTIONS: HomepageSection[] = [
  { id: "s1", type: "hero" },
  { id: "s2", type: "features" },
  { id: "s3", type: "filmrow" },
  { id: "s4", type: "textband" },
  { id: "s5", type: "signup" },
];

export const DEFAULT_WELCOME: WelcomeScreen = {
  heading: { en: "Welcome to IRAN", fa: "به ایران خوش آمدید" },
  buttonGlobal: { en: "Global (English)", fa: "بین‌المللی" },
  buttonIran: { en: "Inside Iran", fa: "داخل ایران" },
};

export const DEFAULT_MENU: { items: MenuItem[] } = {
  items: [
    { id: "m1", label: { en: "Home", fa: "خانه" }, linkTo: "home" },
    { id: "m2", label: { en: "Originals", fa: "آثار" }, linkTo: "originals" },
    { id: "m3", label: { en: "About", fa: "درباره" }, linkTo: "about" },
  ],
};

export const DEFAULT_FOOTER: FooterContent = {
  columns: [
    {
      id: "c1",
      heading: { en: "IRAN", fa: "ایران" },
      links: [
        { id: "l1", label: { en: "About", fa: "درباره" }, href: "/about" },
        { id: "l2", label: { en: "Contact", fa: "تماس" }, href: "/contact" },
      ],
    },
    {
      id: "c2",
      heading: { en: "Legal", fa: "حقوقی" },
      links: [
        { id: "l3", label: { en: "Privacy", fa: "حریم خصوصی" }, href: "/privacy" },
        { id: "l4", label: { en: "Terms", fa: "شرایط" }, href: "/terms" },
      ],
    },
  ],
  copyright: { en: "© IRAN. All rights reserved.", fa: "© ایران. تمامی حقوق محفوظ است." },
};

export const DEFAULT_BANNER: BannerContent = {
  enabled: false,
  text: { en: "", fa: "" },
  ctaLabel: { en: "", fa: "" },
  ctaHref: "",
  tone: "info",
};

export const DEFAULT_FAQ: FaqContent = {
  heading: { en: "Frequently asked questions", fa: "پرسش‌های متداول" },
  items: [],
};

export const DEFAULT_APPEARANCE: Appearance = {
  primary: "#c9a84c",
  accent: "#4a3318",
  background: "#0a0807",
  foreground: "#f5f0e0",
};

export const DEFAULT_PAYMENT_PROVIDER_IDS: PaymentProviderIds = {
  stripe: { publishableKey: "" },
  paypal: { clientId: "" },
  zarinpal: { merchantId: "" },
};

export const DEFAULTS_BY_KEY: Record<string, unknown> = {
  [CMS_KEYS.ACCESS_MODE]: { mode: "paid" as SiteAccessMode },
  [CMS_KEYS.BUTTON_LABELS]: DEFAULT_BUTTON_LABELS,
  [CMS_KEYS.SUPPORT_PAYMENTS]: DEFAULT_SUPPORT_PAYMENTS,
  [CMS_KEYS.HERO]: DEFAULT_HERO,
  [CMS_KEYS.WHY_IRAN]: DEFAULT_WHY_IRAN,
  [CMS_KEYS.HOMEPAGE_SECTIONS]: { sections: DEFAULT_HOMEPAGE_SECTIONS },
  [CMS_KEYS.WELCOME]: DEFAULT_WELCOME,
  [CMS_KEYS.MENU]: DEFAULT_MENU,
  [CMS_KEYS.FOOTER]: DEFAULT_FOOTER,
  [CMS_KEYS.BANNER]: DEFAULT_BANNER,
  [CMS_KEYS.FAQ]: DEFAULT_FAQ,
  [CMS_KEYS.APPEARANCE]: DEFAULT_APPEARANCE,
  [CMS_KEYS.PAYMENT_PROVIDER_IDS]: DEFAULT_PAYMENT_PROVIDER_IDS,
};

export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function nid(): string {
  return Math.random().toString(36).slice(2, 10);
}
