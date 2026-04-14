
-- Make title optional
ALTER TABLE public.lp_sections ALTER COLUMN title DROP NOT NULL;

-- Add video_url column
ALTER TABLE public.lp_sections ADD COLUMN IF NOT EXISTS video_url text;

-- Delete existing sections
DELETE FROM public.lp_sections;

-- Insert 8 fixed sections
INSERT INTO public.lp_sections (section_type, title, content, display_order, is_active, layout, bg_color, text_color) VALUES
('hero', 'Troque ou venda seu aparelho', 'Descubra o valor do seu aparelho em segundos e ganhe um cupom de desconto exclusivo.', 1, true, 'text-only', '#ffffff', '#000000'),
('steps', 'Como funciona', NULL, 2, true, 'text-only', '#ffffff', '#000000'),
('how-to-sell', 'Saiba como vender para Pollicell', NULL, 3, true, 'text-image', '#f8f9fa', '#000000'),
('benefits', 'Nunca foi tão fácil vender seu aparelho', NULL, 4, true, 'text-only', '#ffffff', '#000000'),
('testimonials', 'O que nossos clientes dizem', NULL, 5, true, 'text-only', '#f8f9fa', '#000000'),
('faq', 'Dúvidas frequentes', NULL, 6, true, 'text-only', '#ffffff', '#000000'),
('mega-footer', NULL, NULL, 7, true, 'text-only', '#1a1a2e', '#ffffff'),
('footer', NULL, '© 2025 Pollicell. Todos os direitos reservados.', 8, true, 'text-only', '#111111', '#999999');
