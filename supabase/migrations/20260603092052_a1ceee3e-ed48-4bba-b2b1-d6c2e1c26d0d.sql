-- Seed site_content with pages, FAQ, navigation, footer, and settings (EN + FA)

INSERT INTO public.site_content (key, data) VALUES
('pages', '{
  "about": {
    "nameEn": "About", "nameFa": "درباره",
    "en": {
      "kicker": "About IRAN",
      "title": "A home for contemporary Iranian cinema.",
      "body": "<p>IRAN is a streaming platform dedicated to original Iranian short films. Every film is produced in-house — never licensed or imported — and made for audiences connected to Iranian culture around the world.</p><h3>Why short films</h3><p>Short films are where the boldest Iranian storytelling thrives — debut filmmakers, experimental voices, documentary portraits, and hand-crafted animation. We give these films a dedicated home and a meaningful way to be discovered, with artists paid for their work.</p><h3>How it works</h3><p>No subscriptions. No commitments. You buy a ticket for the film you want and stream it in full quality, on your own time. Simple, premium, and designed with respect for both the audience and the filmmaker.</p><h3>Made with care</h3><p>From Tehran to the diaspora, IRAN is a small team dedicated to craft — in the films we produce and in the experience surrounding them.</p>"
    },
    "fa": {
      "kicker": "درباره‌ی ایران",
      "title": "خانه‌ای برای سینمای کوتاه ایران",
      "body": "<p>«ایران» جایی است برای روایت‌های کوتاهِ ایرانی. هر اثر، ساخته‌ی خودِ ماست — نه واردات، نه ترجمه — برای تماشاگرانی که این فرهنگ را، هر کجای جهان، با خود دارند.</p><h3>چرا سینمای کوتاه</h3><p>فیلم کوتاه، میدانِ جسورترین روایت‌هاست؛ جایی برای صداهای تازه، نگاه‌های تجربی، مستند و انیمیشنِ دست‌ساز. ما به این آثار خانه‌ای درخور می‌دهیم تا دیده شوند، آن‌گونه که شایسته‌اند.</p><h3>چگونه کار می‌کند</h3><p>بی‌نیاز به اشتراک. بلیتِ هر فیلمی را که می‌خواهید می‌گیرید و آن را با کیفیت کامل و در فرصتی آسوده تماشا می‌کنید. ساده، باکیفیت، و با احترام به تماشاگر و فیلم‌ساز.</p>"
    }
  },
  "submit": {
    "nameEn": "Submit a film", "nameFa": "ارسال فیلم",
    "en": {
      "kicker": "For filmmakers",
      "title": "Submit your film.",
      "body": "<p>We''re always looking for original Persian short films — fiction, documentary, animation, and experimental work. If your film has a voice, we want to see it.</p><h3>What we look for</h3><ul><li>Original Persian short films, typically under 30 minutes.</li><li>A distinctive directorial voice over polish for its own sake.</li><li>Festival premieres and debut works are very welcome.</li></ul><h3>How to submit</h3><p>Send a private link (Vimeo or similar), a short synopsis, and a note about you to <a class=\"inline\" href=\"mailto:films@iran.example\">films@iran.example</a>. We review every submission and reply within a few weeks.</p>"
    },
    "fa": {
      "kicker": "برای فیلم‌سازان",
      "title": "فیلم خود را معرفی کنید",
      "body": "<p>ما همیشه به دنبال آثار کوتاهِ مستقل ایرانی هستیم؛ از داستانی و مستند تا انیمیشن و تجربی.</p><h3>به دنبال چه آثاری هستیم</h3><ul><li>فیلم‌های کوتاهِ ایرانی، معمولاً زیر ۳۰ دقیقه</li><li>نگاه و امضای شخصی فیلم‌ساز</li><li>از آثار نخست و نمایش‌های اولیه‌ی جشنواره‌ای استقبال می‌کنیم</li></ul><h3>روش ارسال</h3><p>لینک خصوصیِ فیلم، خلاصه‌ای کوتاه و معرفیِ فیلم‌ساز را به <a class=\"inline\" href=\"mailto:films@iran.example\">films@iran.example</a> ارسال کنید.</p>"
    }
  },
  "press": {
    "nameEn": "Press", "nameFa": "رسانه",
    "en": { "kicker": "Press", "title": "Press & media.", "body": "<p>For interviews, assets, or media enquiries, reach our team at <a class=\"inline\" href=\"mailto:press@iran.example\">press@iran.example</a>.</p><p>A full press kit with logos, brand guidelines, and stills is available on request.</p>" },
    "fa": { "kicker": "رسانه", "title": "رسانه", "body": "<p>برای همکاری‌های رسانه‌ای، تصاویر مطبوعاتی و درخواست مصاحبه، با <a class=\"inline\" href=\"mailto:press@iran.example\">press@iran.example</a> تماس بگیرید.</p>" }
  },
  "careers": {
    "nameEn": "Careers", "nameFa": "همکاری",
    "en": { "kicker": "Careers", "title": "Work with us.", "body": "<p>IRAN is a small, ambitious team. We occasionally look for people who care deeply about film, design, and craft — across curation, engineering, and production.</p><p>Even if nothing''s listed, we love hearing from talented people. Write to <a class=\"inline\" href=\"mailto:join@iran.example\">join@iran.example</a>.</p>" },
    "fa": { "kicker": "همکاری", "title": "با ما کار کنید", "body": "<p>«ایران» تیمی کوچک و بلندپرواز است. اگر به سینما، طراحی و کیفیت اهمیت می‌دهید، برایمان به <a class=\"inline\" href=\"mailto:join@iran.example\">join@iran.example</a> بنویسید.</p>" }
  },
  "help": {
    "nameEn": "Help", "nameFa": "راهنما",
    "en": { "kicker": "Help Centre", "title": "How can we help?", "body": "<h3>Popular questions</h3><p>Browse the <a class=\"inline\" href=\"#\" data-page=\"faq\">FAQ</a> for quick answers, or reach us anytime at <a class=\"inline\" href=\"mailto:help@iran.example\">help@iran.example</a>.</p>",
      "cards": [
        {"icon":"account","heading":"Accounts & sign-in","desc":"Create an account, verify your email, reset a forgotten password, or update your details."},
        {"icon":"ticket","heading":"Tickets & playback","desc":"How buying a ticket works, your viewing window, and watching in full HD."},
        {"icon":"billing","heading":"Payments & receipts","desc":"Accepted payment methods, receipts, and how refunds are handled."}
      ]
    },
    "fa": { "kicker": "مرکز راهنما", "title": "چطور می‌توانیم کمک کنیم؟", "body": "<h3>پرسش‌های پرتکرار</h3><p>برای پاسخ سریع <a class=\"inline\" href=\"#\" data-page=\"faq\">پرسش‌های متداول</a> را ببینید یا به <a class=\"inline\" href=\"mailto:help@iran.example\">help@iran.example</a> بنویسید.</p>",
      "cards": [
        {"icon":"account","heading":"حساب و ورود","desc":"ساخت حساب، تأیید ایمیل، بازیابی گذرواژه یا به‌روزرسانی اطلاعات."},
        {"icon":"ticket","heading":"بلیت و پخش","desc":"نحوه‌ی خرید بلیت، بازه‌ی تماشا و تماشا با کیفیت کامل."},
        {"icon":"billing","heading":"پرداخت و رسید","desc":"روش‌های پرداخت، رسیدها و نحوه‌ی بازگشت وجه."}
      ]
    }
  },
  "devices": {
    "nameEn": "Supported devices", "nameFa": "دستگاه‌ها",
    "en": { "kicker": "Supported devices", "title": "Watch anywhere.", "body": "<p>IRAN works in any modern web browser — on your phone, tablet, laptop, or smart TV browser.</p><ul><li><b>Mobile</b> — iOS and Android, latest Safari and Chrome.</li><li><b>Desktop</b> — Chrome, Safari, Firefox, and Edge.</li><li><b>TV</b> — cast from your phone or use your TV''s web browser.</li></ul><p>Dedicated apps for iOS, Android, and TV platforms are on our roadmap.</p>" },
    "fa": { "kicker": "دستگاه‌های پشتیبانی‌شده", "title": "در هر جا تماشا کنید", "body": "<p>«ایران» در هر مرورگر مدرنی کار می‌کند — روی موبایل، تبلت، لپ‌تاپ یا مرورگر تلویزیون هوشمند.</p><ul><li><b>موبایل</b> — iOS و اندروید.</li><li><b>دسکتاپ</b> — کروم، سافاری، فایرفاکس و اج.</li><li><b>تلویزیون</b> — از موبایل کست کنید یا از مرورگر تلویزیون استفاده کنید.</li></ul>" }
  },
  "contact": {
    "nameEn": "Contact", "nameFa": "تماس",
    "en": { "kicker": "Contact", "title": "Get in touch.", "body": "<p>We read everything and reply as quickly as we can. For account or payment issues, email <a class=\"inline\" href=\"mailto:help@iran.example\">help@iran.example</a> and include the email on your account.</p>",
      "cards": [
        {"icon":"help","heading":"Support","address":"help@iran.example"},
        {"icon":"press","heading":"Press","address":"press@iran.example"},
        {"icon":"ticket","heading":"Filmmakers","address":"films@iran.example"}
      ]
    },
    "fa": { "kicker": "تماس", "title": "در تماس باشید", "body": "<p>ما همه‌ی پیام‌ها را می‌خوانیم و در سریع‌ترین زمان پاسخ می‌دهیم.</p>",
      "cards": [
        {"icon":"help","heading":"پشتیبانی","address":"help@iran.example"},
        {"icon":"press","heading":"رسانه","address":"press@iran.example"},
        {"icon":"ticket","heading":"فیلم‌سازان","address":"films@iran.example"}
      ]
    }
  },
  "terms": {
    "nameEn": "Terms", "nameFa": "شرایط",
    "en": { "kicker": "Legal", "title": "Terms of Service.", "body": "<p>Welcome to IRAN. By creating an account or buying a ticket, you agree to these terms. This is a plain-language summary for your launch — replace it with your finalised legal terms before going live.</p><h3>Your account</h3><p>You''re responsible for keeping your account secure and for activity under it. You must provide a valid email and be old enough to enter a contract in your country.</p><h3>Tickets & access</h3><p>A ticket grants you a personal, non-transferable right to stream one film for the stated viewing window. Films may not be downloaded, recorded, or redistributed.</p><h3>Payments</h3><p>Prices are shown before purchase. Payments are processed securely by our payment provider. Refunds are handled as described in our Help Centre.</p><h3>Content</h3><p>All films and brand materials are owned by IRAN or its filmmakers and are protected by copyright.</p>" },
    "fa": { "kicker": "حقوقی", "title": "شرایط استفاده", "body": "<p>به «ایران» خوش آمدید. با ساخت حساب یا خرید بلیت، این شرایط را می‌پذیرید.</p><h3>حساب شما</h3><p>مسئولیت امنیت حساب و فعالیت‌های آن با شماست.</p><h3>بلیت و دسترسی</h3><p>بلیت حق شخصی و غیرقابل‌انتقالِ تماشای یک فیلم را در بازه‌ی اعلام‌شده می‌دهد.</p>" }
  },
  "privacy": {
    "nameEn": "Privacy", "nameFa": "حریم خصوصی",
    "en": { "kicker": "Legal", "title": "Privacy Policy.", "body": "<p>Your privacy matters. This summary explains what we collect and why — replace it with your finalised policy, reviewed for your jurisdiction, before launch.</p><h3>What we collect</h3><ul><li>Your email and name, to run your account.</li><li>Purchase records, to give you access to films you''ve bought.</li><li>Basic technical data (like device and approximate region) to keep the service secure and working.</li></ul><h3>How we use it</h3><p>To provide the service, send essential emails (verification, receipts), and improve IRAN. We never sell your personal data.</p><h3>Your choices</h3><p>You can access, correct, or delete your account data at any time by contacting <a class=\"inline\" href=\"mailto:privacy@iran.example\">privacy@iran.example</a>.</p>" },
    "fa": { "kicker": "حقوقی", "title": "سیاست حریم خصوصی", "body": "<p>حریم خصوصی شما برایمان مهم است. این خلاصه می‌گوید چه چیزی و چرا جمع‌آوری می‌کنیم.</p><h3>چه چیزی جمع می‌کنیم</h3><ul><li>ایمیل و نام، برای اداره‌ی حساب شما.</li><li>سوابق خرید، برای دسترسی به فیلم‌ها.</li></ul><h3>انتخاب‌های شما</h3><p>هر زمان می‌توانید با <a class=\"inline\" href=\"mailto:privacy@iran.example\">privacy@iran.example</a> داده‌های خود را ببینید، اصلاح یا حذف کنید.</p>" }
  },
  "cookies": {
    "nameEn": "Cookies", "nameFa": "کوکی‌ها",
    "en": { "kicker": "Legal", "title": "Cookie Policy.", "body": "<p>IRAN uses a small number of cookies to keep you signed in and to understand how the site is used. This is a starting summary — finalise it for your jurisdiction before launch.</p><h3>Essential cookies</h3><p>Required to sign you in and keep your session secure. The site can''t work without these.</p><h3>Analytics</h3><p>Optional, privacy-respecting analytics help us understand what''s popular so we can improve. You can opt out without losing any functionality.</p>" },
    "fa": { "kicker": "حقوقی", "title": "سیاست کوکی‌ها", "body": "<p>«ایران» از تعداد کمی کوکی برای حفظ ورود شما و درک نحوه‌ی استفاده از سایت بهره می‌برد.</p>" }
  }
}'::jsonb),

('faq', '{
  "headingEn": "Frequently asked questions",
  "headingFa": "پرسش‌های متداول",
  "en": [
    ["Do I need a subscription?", "No. IRAN is ticket-based — you pay once for the film you want to watch, with no recurring subscription."],
    ["How long can I watch after buying?", "A ticket unlocks the film in full HD for a generous viewing window (48 hours by default) from the moment you start watching."],
    ["What languages are available?", "Films are in Persian with English subtitles, and the whole site is available in both English and Persian."],
    ["Can I get a refund?", "If something went wrong with playback or a purchase, contact us at help@iran.example and we''ll make it right."],
    ["Will you add new films?", "Yes. Subscribe with your email and we''ll notify you the moment a new Persian original is added — no fixed schedule, just quality."]
  ],
  "fa": [
    ["آیا به اشتراک نیاز دارم؟", "خیر. «ایران» مبتنی بر بلیت است — یک‌بار برای فیلمی که می‌خواهید پرداخت می‌کنید، بدون اشتراک دوره‌ای."],
    ["پس از خرید چه مدت می‌توانم تماشا کنم؟", "یک بلیت فیلم را تا یک بازه‌ی مناسب (به‌طور پیش‌فرض ۴۸ ساعت) از لحظه‌ی شروع تماشا با کیفیت کامل باز می‌کند."],
    ["چه زبان‌هایی در دسترس است؟", "فیلم‌ها به فارسی با زیرنویس انگلیسی هستند و کل سایت به دو زبان فارسی و انگلیسی در دسترس است."],
    ["آیا امکان بازگشت وجه هست؟", "اگر در پخش یا خرید مشکلی پیش آمد، با help@iran.example تماس بگیرید."],
    ["آیا فیلم‌های تازه اضافه می‌کنید؟", "بله. با ایمیل خود مشترک شوید تا لحظه‌ی افزوده‌شدن هر اثر تازه باخبر شوید."]
  ]
}'::jsonb),

('nav', '{
  "primary": [
    {"slug":"home","en":"Home","fa":"خانه","href":"/"},
    {"slug":"originals","en":"Originals","fa":"آثار اختصاصی","href":"/originals"},
    {"slug":"about","en":"About","fa":"درباره","href":"/about"}
  ],
  "footer": [
    {"slug":"about","en":"About","fa":"درباره"},
    {"slug":"submit","en":"Submit a film","fa":"ارسال فیلم"},
    {"slug":"press","en":"Press","fa":"رسانه"},
    {"slug":"careers","en":"Careers","fa":"همکاری"},
    {"slug":"help","en":"Help","fa":"راهنما"},
    {"slug":"devices","en":"Supported devices","fa":"دستگاه‌ها"},
    {"slug":"contact","en":"Contact","fa":"تماس"},
    {"slug":"faq","en":"FAQ","fa":"پرسش‌های متداول"},
    {"slug":"terms","en":"Terms","fa":"شرایط"},
    {"slug":"privacy","en":"Privacy","fa":"حریم خصوصی"},
    {"slug":"cookies","en":"Cookies","fa":"کوکی‌ها"}
  ]
}'::jsonb),

('settings', '{
  "site_default_access": "paid",
  "announcement": {"en":"", "fa":"", "visible": false},
  "hero": {
    "en": {"kicker": "Original Iranian short films", "title": "Cinema, in its true voice.", "subtitle": "A curated home for premium Persian shorts. No subscription — pay only for what you watch."},
    "fa": {"kicker": "آثار کوتاه اختصاصی ایرانی", "title": "سینما، با صدای واقعی‌اش.", "subtitle": "خانه‌ای منتخب برای فیلم‌های کوتاه فارسی. بدون اشتراک — فقط بلیت همان اثری که می‌خواهید ببینید."}
  },
  "support_cfg": {
    "intl": {"amounts": [3, 4, 6, 9], "currency": "usd"},
    "iran": {"amounts": [50000, 100000, 200000, 500000], "currency": "toman"}
  }
}'::jsonb);

-- Seed default categories (bilingual)
INSERT INTO public.categories (id, name_en, name_fa, sort_order) VALUES
('drama', 'Drama', 'درام', 1),
('documentary', 'Documentary', 'مستند', 2),
('animation', 'Animation', 'انیمیشن', 3),
('experimental', 'Experimental', 'تجربی', 4);
