import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/lib/i18n";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Mail, MapPin, Send } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — IRAN" },
      {
        name: "description",
        content:
          "Get in touch with IRAN. Questions, partnerships, or feedback welcome.",
      },
      { property: "og:title", content: "Contact — IRAN" },
      {
        property: "og:description",
        content: "Get in touch with IRAN.",
      },
      { property: "og:url", content: "https://ir.show/contact" },
    ],
    links: [{ rel: "canonical", href: "https://ir.show/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { locale, dir } = useLocale();
  const fa = locale === "fa";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const t = {
    title: fa ? "تماس با ما" : "Contact",
    subtitle: fa
      ? "سؤال، پیشنهاد، یا همکاری دارید؟ پیام شما مستقیم به تیم ما می‌رسد."
      : "Questions, partnerships, or feedback? Your message goes straight to our team.",
    formTitle: fa ? "فرم تماس" : "Send a message",
    nameLabel: fa ? "نام" : "Name",
    emailLabel: fa ? "ایمیل" : "Email",
    messageLabel: fa ? "پیام" : "Message",
    submit: fa ? "ارسال پیام" : "Send message",
    sending: fa ? "در حال ارسال…" : "Sending…",
    successTitle: fa ? "پیام شما ارسال شد" : "Message sent",
    successBody: fa
      ? "از تماس شما سپاسگزاریم. به‌زودی پاسخ می‌دهیم."
      : "Thank you for reaching out. We will get back to you soon.",
    sendAnother: fa ? "ارسال پیام دیگر" : "Send another",
    infoTitle: fa ? "اطلاعات تماس" : "Contact info",
    emailTitle: fa ? "ایمیل" : "Email",
    emailValue: "hello@iran.film",
    locationTitle: fa ? "موقعیت" : "Location",
    locationValue: fa ? "جهانی — اینترنتی" : "Global — Online",
    required: fa ? "اجباری" : "Required",
    invalidEmail: fa ? "ایمیل معتبر نیست" : "Invalid email",
    tooLong: fa ? "بیش از حد طولانی" : "Too long",
  };

  function validate() {
    const n = name.trim();
    const e = email.trim();
    const m = message.trim();
    if (!n || n.length > 100) return false;
    if (!e || e.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false;
    if (!m || m.length > 2000) return false;
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const { error } = await supabase.from("contact_submissions").insert({
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast.error(fa ? "خطا در ارسال. لطفاً دوباره امتحان کنید." : "Failed to send. Please try again.");
      return;
    }
    setSent(true);
    toast.success(t.successTitle);
  }

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground">
      <SiteHeader />


      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, oklch(0.35 0.06 60 / 0.55), transparent 60%), radial-gradient(ellipse at 70% 80%, oklch(0.40 0.10 75 / 0.45), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <h1 className={`text-4xl md:text-6xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
            {t.title}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-cream/70">{t.subtitle}</p>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-6xl px-6 pb-24 grid gap-12 md:grid-cols-[1fr_320px]">
        {/* Form */}
        <div>
          <h2 className={`text-2xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
            {t.formTitle}
          </h2>

          {sent ? (
            <div className="mt-8 hairline rounded-xl border bg-bg-1/60 p-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber/20 text-amber">
                <Send className="h-5 w-5" />
              </div>
              <h3 className={`text-xl text-cream-bright ${fa ? "font-vazir" : "font-display"}`}>
                {t.successTitle}
              </h3>
              <p className="mt-2 text-sm text-cream/70">{t.successBody}</p>
              <button
                type="button"
                onClick={() => { setSent(false); setName(""); setEmail(""); setMessage(""); }}
                className="mt-6 rounded-md border border-cream/20 px-4 py-2 text-sm text-cream/90 hover:bg-cream/10 transition-colors"
              >
                {t.sendAnother}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-widest text-cream/55 mb-2">
                  {t.nameLabel}
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-cream/15 bg-bg-0 px-4 py-2.5 text-cream-bright outline-none focus:border-amber"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-cream/55 mb-2">
                  {t.emailLabel}
                </label>
                <input
                  type="email"
                  required
                  maxLength={255}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-cream/15 bg-bg-0 px-4 py-2.5 text-cream-bright outline-none focus:border-amber"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-cream/55 mb-2">
                  {t.messageLabel}
                </label>
                <textarea
                  required
                  maxLength={2000}
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full rounded-md border border-cream/15 bg-bg-0 px-4 py-2.5 text-cream-bright outline-none focus:border-amber resize-y"
                />
                <p className="mt-1 text-[11px] text-cream/40 text-end">
                  {message.length}/2000
                </p>
              </div>
              <button
                type="submit"
                disabled={submitting || !validate()}
                className="inline-flex items-center gap-2 rounded-md bg-amber px-5 py-2.5 text-sm font-medium text-bg-0 hover:bg-amber/90 disabled:opacity-50 transition-colors"
              >
                {submitting ? t.sending : t.submit}
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>

        {/* Info sidebar */}
        <aside className="space-y-8 md:pt-2">
          <div>
            <h3 className="text-xs uppercase tracking-widest text-cream/55 mb-3">{t.infoTitle}</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-cream/50 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs uppercase tracking-widest text-cream/55">{t.emailTitle}</div>
                  <a href="mailto:hello@iran.film" className="text-sm text-cream-bright hover:text-amber transition-colors">
                    {t.emailValue}
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-cream/50 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs uppercase tracking-widest text-cream/55">{t.locationTitle}</div>
                  <div className="text-sm text-cream/80">{t.locationValue}</div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <SiteFooter />

    </div>
  );
}
