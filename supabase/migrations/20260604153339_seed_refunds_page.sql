UPDATE site_content SET data = data || jsonb_build_object('refunds', jsonb_build_object(
  'nameEn','Refunds',
  'nameFa','بازگشت وجه',
  'en', jsonb_build_object(
    'kicker','Legal',
    'title','Refunds & cancellations.',
    'body','<p>We want every viewer to enjoy what they pay for. This policy explains when refunds apply and how to request one.</p>
<h3>Membership trial</h3>
<p>The 7-day free trial is free. You can cancel any time during the trial from <strong>Account → Manage subscription</strong> and you will not be charged.</p>
<h3>Membership renewals</h3>
<p>If you forget to cancel and are charged for a renewal you did not intend to use, write to us within 14 days and we will refund the renewal in full, provided you have not streamed more than 60 minutes of premium content in that billing period.</p>
<h3>Pay-per-view tickets</h3>
<p>Tickets are non-refundable once playback has started. If a technical fault on our side prevented you from finishing the film, we will issue a full refund or a free re-rental — whichever you prefer.</p>
<h3>Filmmaker support / tips</h3>
<p>Support payments to filmmakers are non-refundable, as the funds are paid out to the artist.</p>
<h3>How to request a refund</h3>
<p>Email <a class="inline" href="mailto:info@ir.show">info@ir.show</a> with your account email and the order or ticket reference. Most refunds are processed within 5 business days.</p>'
  ),
  'fa', jsonb_build_object(
    'kicker','حقوقی',
    'title','بازگشت وجه و لغو.',
    'body','<p>می‌خواهیم هر تماشاگر از آنچه پرداخت کرده لذت ببرد. این صفحه توضیح می‌دهد چه زمانی بازگشت وجه ممکن است و چگونه درخواست دهید.</p>
<h3>دوره‌ی آزمایشی اشتراک</h3>
<p>دوره‌ی آزمایشی ۷ روزه رایگان است. در هر زمانِ این دوره می‌توانید از مسیرِ <strong>حساب کاربری ← مدیریت اشتراک</strong> لغو کنید و هیچ مبلغی کسر نمی‌شود.</p>
<h3>تمدید اشتراک</h3>
<p>اگر فراموش کردید پیش از تمدید لغو کنید و مبلغی بدونِ استفاده کسر شد، تا ۱۴ روز فرصت دارید برای ما بنویسید؛ به‌شرطِ آن‌که در این دوره بیش از ۶۰ دقیقه از محتوای ویژه را تماشا نکرده باشید، مبلغ به‌طور کامل بازگردانده می‌شود.</p>
<h3>بلیت‌های تک‌فیلم</h3>
<p>پس از شروعِ پخش، بلیت قابلِ بازگشت نیست. اگر خرابیِ فنی از سمتِ ما مانعِ اتمامِ تماشا شد، به انتخابِ شما مبلغ به‌طور کامل بازگردانده می‌شود یا اجاره‌ی رایگانِ دوباره ارائه می‌گردد.</p>
<h3>حمایت از فیلم‌ساز</h3>
<p>مبالغِ حمایت از فیلم‌ساز قابلِ بازگشت نیستند، چون مستقیماً به هنرمند پرداخت می‌شوند.</p>
<h3>چگونه درخواست دهید</h3>
<p>به نشانیِ <a class="inline" href="mailto:info@ir.show">info@ir.show</a> با ایمیلِ حسابِ خود و شماره‌ی سفارش یا بلیت بنویسید. بیشترِ درخواست‌ها تا ۵ روزِ کاری بررسی و پرداخت می‌شوند.</p>'
  )
)) WHERE key='pages';
