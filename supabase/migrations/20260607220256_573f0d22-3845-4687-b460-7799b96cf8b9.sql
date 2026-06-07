DO $$
DECLARE
  pages_data jsonb;
  faq_data jsonb;
BEGIN
  pages_data := (SELECT data FROM public.site_content WHERE key='pages');
  faq_data := (SELECT data FROM public.site_content WHERE key='faq');

  -- Replace English loanwords in Persian text with native Persian equivalents
  -- (kept English text intact by only operating on Farsi token spans is hard in SQL,
  -- so we do a global string replace; the English copy doesn't contain these tokens.)
  pages_data := replace(pages_data::text,'کاتالوگ','مجموعه‌ی آثار')::jsonb;
  pages_data := replace(pages_data::text,'اوریجینال','اختصاصی')::jsonb;
  pages_data := replace(pages_data::text,'اورجینال','اختصاصی')::jsonb;
  pages_data := replace(pages_data::text,'آنلاین','اینترنتی')::jsonb;
  pages_data := replace(pages_data::text,'آفلاین','برون‌خط')::jsonb;
  pages_data := replace(pages_data::text,'پلتفرم','بستر')::jsonb;
  pages_data := replace(pages_data::text,'اپلیکیشن','برنامه')::jsonb;
  pages_data := replace(pages_data::text,'اکانت','حساب')::jsonb;
  pages_data := replace(pages_data::text,'پروفایل','نمایه')::jsonb;
  pages_data := replace(pages_data::text,'دانلود','بارگیری')::jsonb;
  pages_data := replace(pages_data::text,'آپلود','بارگذاری')::jsonb;
  pages_data := replace(pages_data::text,'لینک','پیوند')::jsonb;
  pages_data := replace(pages_data::text,'ریست','بازنشانی')::jsonb;
  pages_data := replace(pages_data::text,'استریم','پخش')::jsonb;
  pages_data := replace(pages_data::text,'دسکتاپ','رومیزی')::jsonb;
  pages_data := replace(pages_data::text,'اسکرینر','نسخه‌ی نمایشی')::jsonb;
  pages_data := replace(pages_data::text,'فستیوال','جشنواره')::jsonb;
  pages_data := replace(pages_data::text,'دایرکتور','کارگردان')::jsonb;
  pages_data := replace(pages_data::text,'پرمیوم','ویژه')::jsonb;
  pages_data := replace(pages_data::text,'پریمیوم','ویژه')::jsonb;
  pages_data := replace(pages_data::text,'ساپورت','پشتیبانی')::jsonb;
  pages_data := replace(pages_data::text,'سابسکریپشن','اشتراک')::jsonb;
  pages_data := replace(pages_data::text,'کامیونیتی','جامعه')::jsonb;

  faq_data := replace(faq_data::text,'کاتالوگ','مجموعه‌ی آثار')::jsonb;
  faq_data := replace(faq_data::text,'اوریجینال','اختصاصی')::jsonb;
  faq_data := replace(faq_data::text,'اورجینال','اختصاصی')::jsonb;
  faq_data := replace(faq_data::text,'آنلاین','اینترنتی')::jsonb;
  faq_data := replace(faq_data::text,'پلتفرم','بستر')::jsonb;
  faq_data := replace(faq_data::text,'اپلیکیشن','برنامه')::jsonb;
  faq_data := replace(faq_data::text,'پروفایل','نمایه')::jsonb;
  faq_data := replace(faq_data::text,'لینک','پیوند')::jsonb;
  faq_data := replace(faq_data::text,'دانلود','بارگیری')::jsonb;
  faq_data := replace(faq_data::text,'استریم','پخش')::jsonb;

  UPDATE public.site_content SET data = pages_data, updated_at = now() WHERE key='pages';
  UPDATE public.site_content SET data = faq_data,   updated_at = now() WHERE key='faq';
END $$;