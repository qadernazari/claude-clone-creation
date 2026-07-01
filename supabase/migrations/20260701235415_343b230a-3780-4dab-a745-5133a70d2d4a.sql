UPDATE site_content
SET data = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        data,
        '{terms,en,body}',
        to_jsonb(replace(replace(replace(data->'terms'->'en'->>'body',
          '7-day free trial', '90-day free trial'),
          'for 48 hours from the moment you press play (or another window stated at checkout)',
          'permanently — once purchased, the film is yours to stream anytime, forever'),
          'Tickets are non-refundable once playback starts, unless a fault on our side stopped you from watching.',
          'Tickets are non-refundable once playback starts, unless a fault on our side stopped you from watching.'))
      ),
      '{terms,fa,body}',
      to_jsonb(replace(replace(
        data->'terms'->'fa'->>'body',
        '۷ روز آزمایش رایگان', '۹۰ روز آزمایش رایگان'),
        'به‌صورت شخصی به مدت ۴۸ ساعت از لحظه‌ی شروع پخش (یا بازه‌ای که هنگام خرید اعلام شده)',
        'به‌صورت دائمی — پس از خرید، فیلم برای همیشه در دسترس شماست و هر زمان می‌توانید تماشا کنید'))
    ),
    '{terms,en,body}',
    to_jsonb(replace(data->'terms'->'en'->>'body', '7-day free trial', '90-day free trial'))
  ),
  '{terms,en,body}',
  to_jsonb(
    replace(
      replace(
        data->'terms'->'en'->>'body',
        '7-day free trial', '90-day free trial'),
      'for 48 hours from the moment you press play (or another window stated at checkout)',
      'permanently — once purchased, the film is yours to stream anytime, forever'
    )
  )
)
WHERE key = 'pages';