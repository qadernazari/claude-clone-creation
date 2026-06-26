import { createFileRoute } from "@tanstack/react-router";
import { useLocale } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — IRAN" },
      {
        name: "description",
        content:
          "How IRAN collects, uses, and protects your personal data on our Iranian cinema streaming platform.",
      },
      { property: "og:title", content: "Privacy Policy — IRAN" },
      {
        property: "og:description",
        content: "How IRAN collects, uses, and protects your personal data.",
      },
      { property: "og:url", content: "https://ir.show/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://ir.show/privacy" }],
  }),
  component: PrivacyPage,
});

const SECTIONS_EN: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. Information we collect",
    body: (
      <>
        <p>
          <strong className="text-cream">Account data</strong> — When you register, we collect your
          email address and password (hashed, never stored in plain text).
        </p>
        <p>
          <strong className="text-cream">Payment data</strong> — Payments are processed by Stripe.
          We never store your card number. We receive only a transaction ID and billing country.
        </p>
        <p>
          <strong className="text-cream">Usage data</strong> — We collect which films you watch, how
          long you watch them, your watchlist, and device/browser type. This powers your "Continue
          Watching" history and helps us improve the catalog.
        </p>
        <p>
          <strong className="text-cream">Technical data</strong> — IP address, browser type,
          operating system, and referral URL collected automatically on each visit.
        </p>
        <p>
          <strong className="text-cream">Communications</strong> — If you email us at hello@ir.show,
          we store that correspondence.
        </p>
        <p className="text-cream">We do NOT sell your personal data to third parties. Ever.</p>
      </>
    ),
  },
  {
    title: "2. How we use your data",
    body: (
      <ul className="list-disc space-y-2 pl-5 text-cream/65 marker:text-amber/60">
        <li>To provide and operate the streaming service</li>
        <li>To process payments and send receipts</li>
        <li>To remember your watch progress and preferences</li>
        <li>To send transactional emails (receipts, account notices)</li>
        <li>To improve the platform through aggregated, anonymised analytics</li>
        <li>To comply with legal obligations</li>
        <li className="text-cream/85">
          We do NOT use your data for advertising or sell it to data brokers.
        </li>
      </ul>
    ),
  },
  {
    title: "3. Data sharing",
    body: (
      <>
        <p>We share data only with:</p>
        <ul className="list-disc space-y-2 pl-5 text-cream/65 marker:text-amber/60">
          <li>
            <strong className="text-cream">Stripe</strong> — payment processing (stripe.com/privacy)
          </li>
          <li>
            <strong className="text-cream">Supabase</strong> — database and file storage, hosted on
            AWS (supabase.com/privacy)
          </li>
          <li>
            <strong className="text-cream">Vercel / hosting infrastructure</strong> — page serving
          </li>
        </ul>
        <p>
          All processors are contractually bound to protect your data and may not use it for their
          own purposes.
        </p>
      </>
    ),
  },
  {
    title: "4. Data retention",
    body: (
      <ul className="list-disc space-y-2 pl-5 text-cream/65 marker:text-amber/60">
        <li>
          <strong className="text-cream">Account data</strong> — kept while your account is active,
          deleted within 30 days of account deletion request.
        </li>
        <li>
          <strong className="text-cream">Watch history</strong> — kept for 12 months after last
          login.
        </li>
        <li>
          <strong className="text-cream">Payment records</strong> — kept for 7 years as required by
          financial regulations.
        </li>
      </ul>
    ),
  },
  {
    title: "5. Your rights",
    body: (
      <>
        <p>Depending on your location, you may have the right to:</p>
        <ul className="list-disc space-y-2 pl-5 text-cream/65 marker:text-amber/60">
          <li>Access the personal data we hold about you</li>
          <li>Correct inaccurate data</li>
          <li>Delete your account and associated data</li>
          <li>Export your data in a portable format</li>
          <li>Withdraw consent at any time</li>
        </ul>
        <p>
          To exercise any of these rights, email{" "}
          <a href="mailto:hello@ir.show" className="text-amber hover:underline">
            hello@ir.show
          </a>{" "}
          with the subject "Privacy Request". We will respond within 14 days.
        </p>
      </>
    ),
  },
  {
    title: "6. Cookies",
    body: (
      <p>
        We use essential cookies only — for session management and keeping you logged in. We do not
        use advertising or tracking cookies. We do not use Google Analytics or Facebook Pixel.
      </p>
    ),
  },
  {
    title: "7. Children",
    body: (
      <p>
        ir.show is not directed at children under 13. We do not knowingly collect data from
        children. If you believe a child has created an account, contact hello@ir.show and we will
        delete it immediately.
      </p>
    ),
  },
  {
    title: "8. Security",
    body: (
      <p>
        We use industry-standard security: HTTPS everywhere, encrypted passwords (bcrypt), and
        row-level security on all database tables. No system is 100% secure — if you suspect a
        breach, email hello@ir.show immediately.
      </p>
    ),
  },
  {
    title: "9. Changes to this policy",
    body: (
      <p>
        We may update this policy. When we do, we will update the "Last updated" date above and, for
        material changes, notify registered users by email.
      </p>
    ),
  },
  {
    title: "10. Contact",
    body: (
      <div className="space-y-1">
        <p className="text-cream">IRAN Streaming Platform</p>
        <p>
          Email:{" "}
          <a href="mailto:hello@ir.show" className="text-amber hover:underline">
            hello@ir.show
          </a>
        </p>
        <p>
          Website:{" "}
          <a href="https://ir.show" className="text-amber hover:underline">
            https://ir.show
          </a>
        </p>
      </div>
    ),
  },
];

const SECTION_TITLES_FA = [
  "۱. اطلاعاتی که جمع‌آوری می‌کنیم",
  "۲. چگونه از داده‌های شما استفاده می‌کنیم",
  "۳. اشتراک‌گذاری داده‌ها",
  "۴. مدت نگهداری داده‌ها",
  "۵. حقوق شما",
  "۶. کوکی‌ها",
  "۷. کودکان",
  "۸. امنیت",
  "۹. تغییرات این سیاست",
  "۱۰. تماس",
];

const SECTIONS_FA: { body: React.ReactNode }[] = [
  {
    body: (
      <>
        <p>
          <strong className="text-cream font-semibold">اطلاعات حساب</strong> — هنگام ثبت‌نام، ایمیل
          و رمز عبور شما را دریافت می‌کنیم (رمز عبور رمزنگاری‌شده ذخیره می‌شود و هرگز به‌صورت متن
          ساده نگه داشته نمی‌شود).
        </p>
        <p>
          <strong className="text-cream font-semibold">اطلاعات پرداخت</strong> — پرداخت‌ها توسط
          Stripe پردازش می‌شوند. شماره کارت شما هرگز ذخیره نمی‌شود. تنها شناسه تراکنش و کشور
          صورت‌حساب را دریافت می‌کنیم.
        </p>
        <p>
          <strong className="text-cream font-semibold">اطلاعات استفاده</strong> — ثبت می‌کنیم کدام
          فیلم‌ها را تماشا کرده‌اید، چه مدت، فهرست تماشای شما و نوع دستگاه/مرورگر. این اطلاعات
          «ادامه تماشا» را فعال می‌کند و به بهبود کاتالوگ کمک می‌کند.
        </p>
        <p>
          <strong className="text-cream font-semibold">اطلاعات فنی</strong> — آدرس IP، نوع مرورگر،
          سیستم عامل و آدرس ارجاع‌دهنده به‌صورت خودکار در هر بازدید ثبت می‌شوند.
        </p>
        <p>
          <strong className="text-cream font-semibold">ارتباطات</strong> — اگر با hello@ir.show
          تماس بگیرید، آن مکاتبات را نگه می‌داریم.
        </p>
        <p className="text-cream">
          ما اطلاعات شخصی شما را به هیچ شخص ثالثی نمی‌فروشیم. هرگز.
        </p>
      </>
    ),
  },
  {
    body: (
      <ul className="list-disc space-y-2 pr-5 text-cream/65 marker:text-amber/60">
        <li>ارائه و اجرای سرویس پخش</li>
        <li>پردازش پرداخت‌ها و ارسال رسید</li>
        <li>ذخیره پیشرفت تماشا و تنظیمات شما</li>
        <li>ارسال ایمیل‌های خدماتی (رسیدها، اطلاع‌رسانی‌های حساب)</li>
        <li>بهبود پلتفرم از طریق آمار مجموعه و ناشناس</li>
        <li>رعایت تعهدات قانونی</li>
        <li className="text-cream/85">
          از اطلاعات شما برای تبلیغات استفاده نمی‌کنیم و آن‌ها را به کارگزاران داده نمی‌فروشیم.
        </li>
      </ul>
    ),
  },
  {
    body: (
      <>
        <p>اطلاعات را تنها با موارد زیر به اشتراک می‌گذاریم:</p>
        <ul className="list-disc space-y-2 pr-5 text-cream/65 marker:text-amber/60">
          <li>
            <strong className="text-cream font-semibold">Stripe</strong> — پردازش پرداخت
            (stripe.com/privacy)
          </li>
          <li>
            <strong className="text-cream font-semibold">Supabase</strong> — پایگاه داده و
            ذخیره‌سازی فایل، میزبانی‌شده روی AWS (supabase.com/privacy)
          </li>
          <li>
            <strong className="text-cream font-semibold">Vercel / زیرساخت میزبانی</strong> —
            سرویس‌دهی صفحات
          </li>
        </ul>
        <p>
          تمام پردازشگرها قراردادی ملزم به حفاظت از داده‌های شما هستند و نمی‌توانند از آن‌ها برای
          اهداف خود استفاده کنند.
        </p>
      </>
    ),
  },
  {
    body: (
      <ul className="list-disc space-y-2 pr-5 text-cream/65 marker:text-amber/60">
        <li>
          <strong className="text-cream font-semibold">اطلاعات حساب</strong> — تا زمانی که حساب شما
          فعال است نگه داشته می‌شود؛ ظرف ۳۰ روز از درخواست حذف، پاک می‌شود.
        </li>
        <li>
          <strong className="text-cream font-semibold">تاریخچه تماشا</strong> — ۱۲ ماه پس از آخرین
          ورود نگه داشته می‌شود.
        </li>
        <li>
          <strong className="text-cream font-semibold">سوابق پرداخت</strong> — ۷ سال طبق مقررات
          مالی نگه داشته می‌شود.
        </li>
      </ul>
    ),
  },
  {
    body: (
      <>
        <p>بسته به محل سکونت شما، ممکن است این حقوق را داشته باشید:</p>
        <ul className="list-disc space-y-2 pr-5 text-cream/65 marker:text-amber/60">
          <li>دسترسی به اطلاعات شخصی که نگه می‌داریم</li>
          <li>اصلاح اطلاعات نادرست</li>
          <li>حذف حساب و اطلاعات مرتبط</li>
          <li>دریافت اطلاعات در قالبی قابل انتقال</li>
          <li>پس گرفتن رضایت در هر زمان</li>
        </ul>
        <p>
          برای استفاده از هر یک از این حقوق، با موضوع «درخواست حریم خصوصی» به{" "}
          <a href="mailto:hello@ir.show" className="text-amber hover:underline">
            hello@ir.show
          </a>{" "}
          ایمیل بزنید. ظرف ۱۴ روز پاسخ می‌دهیم.
        </p>
      </>
    ),
  },
  {
    body: (
      <p>
        ما فقط از کوکی‌های ضروری استفاده می‌کنیم — برای مدیریت نشست و نگه داشتن شما در حالت ورود.
        از کوکی‌های تبلیغاتی یا ردیابی استفاده نمی‌کنیم. از Google Analytics یا Facebook Pixel
        استفاده نمی‌کنیم.
      </p>
    ),
  },
  {
    body: (
      <p>
        ir.show برای کودکان زیر ۱۳ سال طراحی نشده است. ما آگاهانه اطلاعاتی از کودکان جمع‌آوری
        نمی‌کنیم. اگر فکر می‌کنید کودکی حساب ایجاد کرده، با hello@ir.show تماس بگیرید تا فوراً آن
        را حذف کنیم.
      </p>
    ),
  },
  {
    body: (
      <p>
        از امنیت استاندارد صنعت استفاده می‌کنیم: HTTPS در همه جا، رمزنگاری رمز عبور (bcrypt)، و
        امنیت سطح سطری در تمام جداول پایگاه داده. هیچ سیستمی ۱۰۰٪ امن نیست — اگر مشکلی مشاهده
        کردید، فوراً به hello@ir.show ایمیل بزنید.
      </p>
    ),
  },
  {
    body: (
      <p>
        ممکن است این سیاست را به‌روز کنیم. در این صورت تاریخ «آخرین به‌روزرسانی» را تغییر می‌دهیم
        و برای تغییرات اساسی، کاربران ثبت‌نام‌شده را از طریق ایمیل مطلع می‌کنیم.
      </p>
    ),
  },
  {
    body: (
      <div className="space-y-1">
        <p className="text-cream">پلتفرم پخش ایران</p>
        <p>
          ایمیل:{" "}
          <a href="mailto:hello@ir.show" className="text-amber hover:underline">
            hello@ir.show
          </a>
        </p>
        <p>
          وب‌سایت:{" "}
          <a href="https://ir.show" className="text-amber hover:underline">
            https://ir.show
          </a>
        </p>
      </div>
    ),
  },
];

function PrivacyPage() {
  const { locale, dir } = useLocale();
  const fa = locale === "fa";

  return (
    <div dir={dir} className={`min-h-screen bg-bg-0 text-cream ${fa ? "font-vazir" : ""}`}>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-28 md:py-36">
        <p className="mb-6 text-xs uppercase tracking-[0.35em] text-amber">
          {fa ? "حریم خصوصی" : "Privacy"}
        </p>
        <h1
          className={`text-4xl leading-[1.05] text-cream-bright md:text-5xl ${fa ? "font-vazir" : "font-display"}`}
        >
          {fa ? "سیاست حریم خصوصی" : "Privacy Policy"}
        </h1>
        <p className="mt-2 mb-10 text-xs text-cream/45">
          {fa ? "آخرین به‌روزرسانی: ۲۷ ژوئن ۲۰۲۶" : "Last updated: June 27, 2026"}
        </p>

        {fa ? (
          <p className="text-[15px] leading-relaxed text-cream/75">
            ایران («ما») پلتفرم پخش آنلاین ir.show را اداره می‌کند. این سیاست حریم خصوصی توضیح
            می‌دهد چه اطلاعاتی جمع‌آوری می‌کنیم، چگونه از آن‌ها استفاده می‌کنیم و چه حقوقی دارید.
          </p>
        ) : (
          <p className="text-[15px] leading-relaxed text-cream/75">
            IRAN ("we", "us", "our") operates the streaming platform at{" "}
            <a href="https://ir.show" className="text-amber hover:underline">
              ir.show
            </a>
            . This Privacy Policy explains what data we collect, how we use it, and your rights.
          </p>
        )}

        {SECTIONS_EN.map((s, i) => (
          <section key={s.title}>
            <h2 className="mt-10 mb-3 text-sm font-semibold uppercase tracking-widest text-amber">
              {fa ? SECTION_TITLES_FA[i] : s.title}
            </h2>
            <div className="space-y-4 text-[15px] leading-relaxed text-cream/75">
              {fa ? SECTIONS_FA[i].body : s.body}
            </div>
          </section>
        ))}
      </main>
      <SiteFooter />
    </div>
  );
}
