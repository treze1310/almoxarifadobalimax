-- Migração para atualizar formulário de Material/Equipamento
-- Adiciona novos campos e modifica existentes conforme especificação

-- Adicionar campo 'alugado' (destaque especial)
ALTER TABLE materiais_equipamentos 
ADD COLUMN IF NOT EXISTS alugado BOOLEAN DEFAULT FALSE;

-- Adicionar campo para certificado de calibração
ALTER TABLE materiais_equipamentos 
ADD COLUMN IF NOT EXISTS certificado_calibracao_url TEXT;

-- Adicionar campos de calibração (se ainda não existirem)
ALTER TABLE materiais_equipamentos 
ADD COLUMN IF NOT EXISTS requer_calibracao BOOLEAN DEFAULT FALSE;

ALTER TABLE materiais_equipamentos 
ADD COLUMN IF NOT EXISTS frequencia_calibracao_meses INTEGER;

ALTER TABLE materiais_equipamentos 
ADD COLUMN IF NOT EXISTS ultima_calibracao DATE;

ALTER TABLE materiais_equipamentos 
ADD COLUMN IF NOT EXISTS proxima_calibracao DATE;

ALTER TABLE materiais_equipamentos 
ADD COLUMN IF NOT EXISTS observacoes_calibracao TEXT;

-- Tornar campos opcionais (alterar para nullable)
-- Estes campos eram obrigatórios e agora são opcionais conforme solicitação:

-- Código será auto-gerado, não precisa ser obrigatório
ALTER TABLE materiais_equipamentos 
ALTER COLUMN codigo DROP NOT NULL;

-- Tipo não é mais obrigatório
ALTER TABLE materiais_equipamentos 
ALTER COLUMN tipo DROP NOT NULL;

-- Unidade de medida não é mais obrigatória
ALTER TABLE materiais_equipamentos 
ALTER COLUMN unidade_medida DROP NOT NULL;

-- Comentários explicativos
COMMENT ON COLUMN materiais_equipamentos.alugado IS 'Indica se o item está em regime de aluguel/locação';
COMMENT ON COLUMN materiais_equipamentos.certificado_calibracao_url IS 'URL ou link para o certificado de calibração/aferição';
COMMENT ON COLUMN materiais_equipamentos.requer_calibracao IS 'Indica se o equipamento requer calibração periódica';
COMMENT ON COLUMN materiais_equipamentos.frequencia_calibracao_meses IS 'Frequência de calibração em meses';
COMMENT ON COLUMN materiais_equipamentos.ultima_calibracao IS 'Data da última calibração realizada';
COMMENT ON COLUMN materiais_equipamentos.proxima_calibracao IS 'Data prevista para próxima calibração';
COMMENT ON COLUMN materiais_equipamentos.observacoes_calibracao IS 'Observações sobre o processo de calibração';

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_materiais_equipamentos_alugado ON materiais_equipamentos(alugado) WHERE alugado = TRUE;
CREATE INDEX IF NOT EXISTS idx_materiais_equipamentos_requer_calibracao ON materiais_equipamentos(requer_calibracao) WHERE requer_calibracao = TRUE;
CREATE INDEX IF NOT EXISTS idx_materiais_equipamentos_proxima_calibracao ON materiais_equipamentos(proxima_calibracao) WHERE proxima_calibracao IS NOT NULL;
