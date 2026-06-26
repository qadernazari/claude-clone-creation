import { createFileRoute } from "@tanstack/react-router";
import { useLocale } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — IRAN" },
      {
        name: "description",
        content:
          "Terms governing your use of the IRAN streaming platform — accounts, membership, payments, and acceptable use.",
      },
      { property: "og:title", content: "Terms of Service — IRAN" },
      {
        property: "og:description",
        content: "Terms governing your use of the IRAN streaming platform.",
      },
      { property: "og:url", content: "https://ir.show/terms" },
    ],
    links: [{ rel: "canonical", href: "https://ir.show/terms" }],
  }),
  component: TermsPage,
});

const SECTIONS_EN: { title: string; body: React.ReactNode }[] = [
  {
    title: "1. The service",
    body: (
      <p>
        ir.show is a video streaming platform featuring Iranian cinema — original documentaries,
        short films, and curated collections. Content is available in English and Persian (فارسی).
      </p>
    ),
  },
  {
    title: "2. Accounts",
    body: (
      <>
        <p>
          You must be 18 or older (or the age of majority in your country) to create an account.
          You are responsible for keeping your password secure. You may not share your account with
          others or use it for commercial screening without prior written permission.
        </p>
        <p>
          One account per person. We reserve the right to terminate accounts that show signs of
          credential sharing or abuse.
        </p>
      </>
    ),
  },
  {
    title: "3. Membership and payments",
    body: (
      <>
        <p>
          Memberships are available in 1, 3, 6, and 12-month terms. All payments are one-time —
          there is NO automatic renewal. Your membership expires at the end of the period you paid
          for. You will receive an email reminder before your membership expires.
        </p>
        <p>
          Prices are shown in USD. Your bank may apply currency conversion fees — we are not
          responsible for those.
        </p>
        <p>Payments are processed securely by Stripe. We do not store your card details.</p>
      </>
    ),
  },
  {
    title: "4. Free trial",
    body: (
      <p>
        New accounts receive a 7-day free trial with full access to the catalog. Only one free
        trial per person. We reserve the right to verify eligibility and revoke trials used in bad
        faith.
      </p>
    ),
  },
  {
    title: "5. Refund policy",
    body: (
      <>
        <p>
          Because our content is delivered digitally and immediately accessible, all sales are
          final. We do not offer refunds once access has been granted, except where required by
          applicable law (for example, EU consumer protection law grants a 14-day cooling-off
          period for digital purchases if content has not been accessed).
        </p>
        <p>
          If you believe you were charged in error, contact{" "}
          <a href="mailto:hello@ir.show" className="text-amber hover:underline">
            hello@ir.show
          </a>{" "}
          within 7 days and we will investigate.
        </p>
      </>
    ),
  },
  {
    title: "6. Content and intellectual property",
    body: (
      <>
        <p>
          All films, images, and text on ir.show are protected by copyright and owned by their
          respective creators and licensors. Your membership grants you a personal,
          non-transferable, non-exclusive licence to stream content for private viewing only.
        </p>
        <p>You may not:</p>
        <ul className="list-disc space-y-2 pl-5 text-cream/65 marker:text-amber/60">
          <li>Download, copy, or redistribute any content</li>
          <li>Use screen recording software to capture streams</li>
          <li>Use the content for public or commercial screenings</li>
          <li>Remove or alter any copyright notices</li>
        </ul>
      </>
    ),
  },
  {
    title: "7. Acceptable use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5 text-cream/65 marker:text-amber/60">
          <li>Use the platform for any unlawful purpose</li>
          <li>Attempt to reverse-engineer, hack, or disrupt the service</li>
          <li>Create fake accounts or circumvent trial restrictions</li>
          <li>Upload, post, or transmit any harmful or illegal content</li>
        </ul>
      </>
    ),
  },
  {
    title: "8. Service availability",
    body: (
      <p>
        We aim for 99.9% uptime but do not guarantee uninterrupted access. Planned maintenance will
        be announced in advance where possible. We are not liable for losses caused by downtime.
      </p>
    ),
  },
  {
    title: "9. Termination",
    body: (
      <p>
        We may suspend or terminate your account if you violate these Terms. You may delete your
        account at any time by contacting{" "}
        <a href="mailto:hello@ir.show" className="text-amber hover:underline">
          hello@ir.show
        </a>
        . Termination does not entitle you to a refund of unused membership time.
      </p>
    ),
  },
  {
    title: "10. Limitation of liability",
    body: (
      <p>
        To the maximum extent permitted by law, IRAN is not liable for indirect, incidental, or
        consequential damages arising from your use of the service. Our total liability to you for
        any claim shall not exceed the amount you paid us in the 3 months preceding the claim.
      </p>
    ),
  },
  {
    title: "11. Governing law",
    body: (
      <p>
        These Terms are governed by the laws of the United Arab Emirates. Disputes shall be
        resolved in the courts of Dubai, UAE.
      </p>
    ),
  },
  {
    title: "12. Changes to terms",
    body: (
      <p>
        We may update these Terms. Continued use of the service after changes constitutes
        acceptance. For material changes, we will notify registered users by email with at least 14
        days notice.
      </p>
    ),
  },
  {
    title: "13. Contact",
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
  "۱. سرویس",
  "۲. حساب‌های کاربری",
  "۳. عضویت و پرداخت‌ها",
  "۴. آزمایش رایگان",
  "۵. سیاست بازپرداخت",
  "۶. محتوا و مالکیت معنوی",
  "۷. استفاده مجاز",
  "۸. در دسترس بودن سرویس",
  "۹. خاتمه",
  "۱۰. محدودیت مسئولیت",
  "۱۱. قانون حاکم",
  "۱۲. تغییرات شرایط",
  "۱۳. تماس",
];

const SECTIONS_FA: { body: React.ReactNode }[] = [
  {
    body: (
      <p>
        ir.show یک پلتفرم پخش ویدیو با محوریت سینمای ایران است — مستندهای اصلی، فیلم‌های کوتاه و
        مجموعه‌های گزینش‌شده. محتوا به دو زبان فارسی و انگلیسی در دسترس است.
      </p>
    ),
  },
  {
    body: (
      <>
        <p>
          برای ایجاد حساب باید حداقل ۱۸ سال داشته باشید (یا سن قانونی کشور خود). مسئولیت امنیت رمز
          عبورتان با خودتان است. بدون اجازه کتبی، حق اشتراک‌گذاری حساب با دیگران یا استفاده تجاری
          از آن را ندارید.
        </p>
        <p>
          هر فرد فقط یک حساب می‌تواند داشته باشد. حق داریم حساب‌هایی را که نشانه‌هایی از سوءاستفاده
          یا اشتراک‌گذاری غیرمجاز دارند، مسدود کنیم.
        </p>
      </>
    ),
  },
  {
    body: (
      <>
        <p>
          عضویت در دوره‌های ۱، ۳، ۶ و ۱۲ ماهه در دسترس است. همه پرداخت‌ها یک‌بار انجام می‌شوند —
          هیچ تمدید خودکاری وجود ندارد. عضویت در پایان دوره‌ای که برای آن پرداخت کرده‌اید منقضی
          می‌شود. قبل از انقضا، ایمیل یادآوری دریافت خواهید کرد.
        </p>
        <p>
          قیمت‌ها به دلار آمریکا نمایش داده می‌شوند. ممکن است بانک شما کارمزد تبدیل ارز اعمال کند
          — ما مسئول آن نیستیم.
        </p>
        <p>پرداخت‌ها به‌صورت امن توسط Stripe پردازش می‌شوند. اطلاعات کارت شما ذخیره نمی‌شود.</p>
      </>
    ),
  },
  {
    body: (
      <p>
        حساب‌های جدید ۷ روز آزمایش رایگان با دسترسی کامل به کاتالوگ دریافت می‌کنند. هر شخص فقط یک
        آزمایش رایگان می‌تواند داشته باشد. حق داریم صلاحیت را بررسی کنیم و آزمایش‌های استفاده‌شده
        به روش غیرمنصفانه را لغو کنیم.
      </p>
    ),
  },
  {
    body: (
      <>
        <p>
          از آنجا که محتوای ما به‌صورت دیجیتال و فوری در دسترس قرار می‌گیرد، تمام فروش‌ها قطعی
          هستند. پس از اعطای دسترسی، بازپرداخت ارائه نمی‌دهیم، مگر در مواردی که قانون حاکم آن را
          الزامی کند.
        </p>
        <p>
          اگر فکر می‌کنید اشتباهاً از شما کسر شده، ظرف ۷ روز با{" "}
          <a href="mailto:hello@ir.show" className="text-amber hover:underline">
            hello@ir.show
          </a>{" "}
          تماس بگیرید تا بررسی کنیم.
        </p>
      </>
    ),
  },
  {
    body: (
      <>
        <p>
          تمام فیلم‌ها، تصاویر و متن‌های ir.show تحت حمایت حق مؤلف هستند و متعلق به سازندگان و
          دارندگان مجوز مربوطه‌اند. عضویت شما یک مجوز شخصی، غیرقابل انتقال و غیرانحصاری برای پخش
          محتوا صرفاً برای تماشای خصوصی اعطا می‌کند.
        </p>
        <p>حق ندارید:</p>
        <ul className="list-disc space-y-2 pr-5 text-cream/65 marker:text-amber/60">
          <li>دانلود، کپی یا توزیع مجدد هیچ محتوایی</li>
          <li>استفاده از نرم‌افزار ضبط صفحه برای ضبط جریان</li>
          <li>استفاده از محتوا برای نمایش عمومی یا تجاری</li>
          <li>حذف یا تغییر هرگونه اطلاعیه حق مؤلف</li>
        </ul>
      </>
    ),
  },
  {
    body: (
      <>
        <p>موافقت می‌کنید:</p>
        <ul className="list-disc space-y-2 pr-5 text-cream/65 marker:text-amber/60">
          <li>از پلتفرم برای هیچ هدف غیرقانونی استفاده نکنید</li>
          <li>تلاشی برای مهندسی معکوس، هک یا اختلال در سرویس نکنید</li>
          <li>حساب جعلی نسازید یا محدودیت‌های آزمایش را دور نزنید</li>
          <li>هیچ محتوای مضر یا غیرقانونی بارگذاری، ارسال یا منتقل نکنید</li>
        </ul>
      </>
    ),
  },
  {
    body: (
      <p>
        هدف ما ۹۹.۹٪ آپتایم است اما دسترسی بدون وقفه را تضمین نمی‌کنیم. تعمیر و نگهداری
        برنامه‌ریزی‌شده تا حد امکان از قبل اطلاع‌رسانی می‌شود. در قبال خسارات ناشی از قطعی
        مسئولیتی نداریم.
      </p>
    ),
  },
  {
    body: (
      <p>
        در صورت نقض این شرایط، ممکن است حساب شما تعلیق یا خاتمه یابد. می‌توانید در هر زمان با تماس
        با{" "}
        <a href="mailto:hello@ir.show" className="text-amber hover:underline">
          hello@ir.show
        </a>{" "}
        حساب خود را حذف کنید. خاتمه حساب حقی برای بازپرداخت زمان عضویت استفاده‌نشده ایجاد نمی‌کند.
      </p>
    ),
  },
  {
    body: (
      <p>
        تا حداکثر میزان مجاز قانون، ایران مسئول خسارات غیرمستقیم، تصادفی یا تبعی ناشی از استفاده
        شما از سرویس نیست. مسئولیت کل ما در برابر شما برای هر ادعایی از مبلغی که در ۳ ماه قبل از
        ادعا پرداخت کرده‌اید تجاوز نخواهد کرد.
      </p>
    ),
  },
  {
    body: (
      <p>
        این شرایط تحت قوانین امارات متحده عربی حاکم است. اختلافات در دادگاه‌های دبی، امارات حل و
        فصل خواهند شد.
      </p>
    ),
  },
  {
    body: (
      <p>
        ممکن است این شرایط را به‌روز کنیم. ادامه استفاده از سرویس پس از تغییرات به معنای پذیرش
        آن‌هاست. برای تغییرات اساسی، کاربران ثبت‌نام‌شده را با حداقل ۱۴ روز اطلاع قبلی از طریق
        ایمیل مطلع می‌کنیم.
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

function TermsPage() {
  const { locale, dir } = useLocale();
  const fa = locale === "fa";

  return (
    <div dir={dir} className={`min-h-screen bg-bg-0 text-cream ${fa ? "font-vazir" : ""}`}>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-28 md:py-36">
        <p className="mb-6 text-xs uppercase tracking-[0.35em] text-amber">
          {fa ? "قوانین" : "Terms"}
        </p>
        <h1
          className={`text-4xl leading-[1.05] text-cream-bright md:text-5xl ${fa ? "font-vazir" : "font-display"}`}
        >
          {fa ? "شرایط استفاده" : "Terms of Service"}
        </h1>
        <p className="mt-2 mb-10 text-xs text-cream/45">
          {fa ? "آخرین به‌روزرسانی: ۲۷ ژوئن ۲۰۲۶" : "Last updated: June 27, 2026"}
        </p>

        {fa ? (
          <p className="text-[15px] leading-relaxed text-cream/75">
            این شرایط استفاده («شرایط») نحوه استفاده شما از پلتفرم پخش ایران در ir.show را که توسط
            ایران («ما») اداره می‌شود، تنظیم می‌کند. با ایجاد حساب یا خرید عضویت، با این شرایط
            موافقت می‌کنید.
          </p>
        ) : (
          <p className="text-[15px] leading-relaxed text-cream/75">
            These Terms of Service ("Terms") govern your use of the IRAN streaming platform at{" "}
            <a href="https://ir.show" className="text-amber hover:underline">
              ir.show
            </a>
            , operated by IRAN ("we", "us"). By creating an account or purchasing a membership, you
            agree to these Terms.
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
