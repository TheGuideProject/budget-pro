-- Normalizza le categorie esistenti da output AI a ID frontend

-- Alimentari
UPDATE public.expenses SET category_parent = 'alimentari' WHERE LOWER(category_parent) = 'alimentari';

-- Ristorazione
UPDATE public.expenses SET category_parent = 'ristorazione' WHERE LOWER(category_parent) = 'ristorazione';

-- Trasporti
UPDATE public.expenses SET category_parent = 'trasporti' WHERE LOWER(category_parent) = 'trasporti';

-- Casa/Utenze → casa_utenze
UPDATE public.expenses SET category_parent = 'casa_utenze' WHERE LOWER(category_parent) IN ('casa', 'utenze', 'casa & utenze');

-- Salute
UPDATE public.expenses SET category_parent = 'salute' WHERE LOWER(category_parent) = 'salute';

-- Abbigliamento/Persona → persona_cura
UPDATE public.expenses SET category_parent = 'persona_cura' WHERE LOWER(category_parent) IN ('abbigliamento', 'persona', 'persona & cura');

-- Svago → tempo_libero
UPDATE public.expenses SET category_parent = 'tempo_libero' WHERE LOWER(category_parent) IN ('svago', 'tempo libero');

-- Tecnologia
UPDATE public.expenses SET category_parent = 'tecnologia' WHERE LOWER(category_parent) = 'tecnologia';

-- Animali
UPDATE public.expenses SET category_parent = 'animali' WHERE LOWER(category_parent) = 'animali';

-- Finanza → finanza_obblighi
UPDATE public.expenses SET category_parent = 'finanza_obblighi' WHERE LOWER(category_parent) IN ('finanza', 'finanza & obblighi');

-- Viaggi
UPDATE public.expenses SET category_parent = 'viaggi' WHERE LOWER(category_parent) = 'viaggi';

-- Sport → sport_benessere
UPDATE public.expenses SET category_parent = 'sport_benessere' WHERE LOWER(category_parent) IN ('sport', 'sport & benessere');

-- Auto → auto_veicoli
UPDATE public.expenses SET category_parent = 'auto_veicoli' WHERE LOWER(category_parent) IN ('auto', 'auto & veicoli');

-- Lavoro → lavoro_formazione
UPDATE public.expenses SET category_parent = 'lavoro_formazione' WHERE LOWER(category_parent) IN ('lavoro', 'lavoro & formazione');

-- Abbonamenti → abbonamenti_servizi
UPDATE public.expenses SET category_parent = 'abbonamenti_servizi' WHERE LOWER(category_parent) IN ('abbonamenti', 'abbonamenti & servizi');

-- Regali → regali_donazioni
UPDATE public.expenses SET category_parent = 'regali_donazioni' WHERE LOWER(category_parent) IN ('regali', 'regali & donazioni');

-- Extra → extra_imprevisti
UPDATE public.expenses SET category_parent = 'extra_imprevisti' WHERE LOWER(category_parent) IN ('extra', 'extra & imprevisti');

-- Altro
UPDATE public.expenses SET category_parent = 'altro' WHERE LOWER(category_parent) = 'altro';

-- Normalizza anche subcategorie comuni
UPDATE public.expenses SET category_child = 'supermercato' WHERE LOWER(category_child) = 'supermercato';
UPDATE public.expenses SET category_child = 'bar_caffe' WHERE LOWER(category_child) IN ('bar/caffè', 'bar', 'caffè');
UPDATE public.expenses SET category_child = 'carburante' WHERE LOWER(category_child) = 'carburante';
UPDATE public.expenses SET category_child = 'ristorante' WHERE LOWER(category_child) = 'ristorante';
UPDATE public.expenses SET category_child = 'pizzeria' WHERE LOWER(category_child) = 'pizzeria';
UPDATE public.expenses SET category_child = 'fast_food' WHERE LOWER(category_child) = 'fast food';
UPDATE public.expenses SET category_child = 'pedaggi' WHERE LOWER(category_child) = 'pedaggi';
UPDATE public.expenses SET category_child = 'parcheggi' WHERE LOWER(category_child) = 'parcheggio';

-- Normalizza learned_categories
UPDATE public.learned_categories SET category_parent = 'alimentari' WHERE LOWER(category_parent) = 'alimentari';
UPDATE public.learned_categories SET category_parent = 'ristorazione' WHERE LOWER(category_parent) = 'ristorazione';
UPDATE public.learned_categories SET category_parent = 'trasporti' WHERE LOWER(category_parent) = 'trasporti';
UPDATE public.learned_categories SET category_parent = 'casa_utenze' WHERE LOWER(category_parent) IN ('casa', 'utenze', 'casa & utenze');
UPDATE public.learned_categories SET category_parent = 'salute' WHERE LOWER(category_parent) = 'salute';
UPDATE public.learned_categories SET category_parent = 'persona_cura' WHERE LOWER(category_parent) IN ('abbigliamento', 'persona', 'persona & cura');
UPDATE public.learned_categories SET category_parent = 'tempo_libero' WHERE LOWER(category_parent) IN ('svago', 'tempo libero');
UPDATE public.learned_categories SET category_parent = 'tecnologia' WHERE LOWER(category_parent) = 'tecnologia';
UPDATE public.learned_categories SET category_parent = 'animali' WHERE LOWER(category_parent) = 'animali';
UPDATE public.learned_categories SET category_parent = 'finanza_obblighi' WHERE LOWER(category_parent) IN ('finanza', 'finanza & obblighi');
UPDATE public.learned_categories SET category_parent = 'viaggi' WHERE LOWER(category_parent) = 'viaggi';
UPDATE public.learned_categories SET category_parent = 'altro' WHERE LOWER(category_parent) = 'altro';

-- Normalizza subcategorie learned_categories
UPDATE public.learned_categories SET category_child = 'supermercato' WHERE LOWER(category_child) = 'supermercato';
UPDATE public.learned_categories SET category_child = 'bar_caffe' WHERE LOWER(category_child) IN ('bar/caffè', 'bar', 'caffè');
UPDATE public.learned_categories SET category_child = 'carburante' WHERE LOWER(category_child) = 'carburante';