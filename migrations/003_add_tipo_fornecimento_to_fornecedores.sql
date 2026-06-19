ALTER TABLE public.fornecedores
ADD COLUMN IF NOT EXISTS tipo_fornecimento TEXT;

COMMENT ON COLUMN public.fornecedores.tipo_fornecimento IS
  'Categoria ou tipo principal de fornecimento do fornecedor, ex.: Ferramentas, EPIs, Material de construcao.';

CREATE INDEX IF NOT EXISTS idx_fornecedores_tipo_fornecimento
ON public.fornecedores (tipo_fornecimento);
