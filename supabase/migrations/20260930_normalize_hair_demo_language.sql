-- Early private hair-salon demos used Albanian editor fallbacks. Their public
-- market-facing default is German; customised or published sites are untouched.

update public.company_profiles profile
set
  website_locale = 'de',
  description = 'Individuelle Haarschnitte, Farbe und Styling in entspannter Atmosphäre.',
  hero_eyebrow = 'Hair & Beauty Studio',
  hero_title = 'Haare, die sich nach Ihnen anfühlen.',
  hero_subtitle = 'Individuelle Beratung, sorgfältige Technik und ein Look, der zu Ihnen passt.',
  about_title = 'Schönheit mit Blick fürs Detail.',
  about_body = 'Wir nehmen uns Zeit für ehrliche Beratung, sorgfältige Arbeit und einen entspannten Besuch im Studio.',
  services_title = 'Für Ihren persönlichen Look',
  service_one_title = 'Schnitt & Styling',
  service_one_description = 'Ein Schnitt, der im Alltag funktioniert und zu Ihnen passt.',
  service_two_title = 'Farbe & Highlights',
  service_two_description = 'Dimension, Glanz und eine Farbe mit natürlichem Ausdruck.',
  service_three_title = 'Pflege & Finish',
  service_three_description = 'Pflege, die Ihr Haar stärkt, und ein Finish mit Haltung.',
  gallery_title = 'Aus unserem Studio',
  gallery_subtitle = 'Looks, die mit Sorgfalt entstehen.',
  contact_title = 'Ihren Termin anfragen',
  contact_body = 'Senden Sie uns Ihren Wunschtermin. Wir bestätigen den passenden Zeitpunkt persönlich.'
from public.companies company
where profile.company_id = company.id
  and company.product_surface = 'business_site'
  and company.industry_key = 'hair_beauty'
  and company.lifecycle_status = 'demo_trial'
  and profile.is_public = false
  and (
    profile.hero_title is null
    or profile.hero_title = 'Flokë që ndihen si ti.'
  );

notify pgrst, 'reload schema';
