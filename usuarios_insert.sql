-- INSERT statements for usuarios table
-- Users from the Balimax system with appropriate permission mapping
-- Based on the permission pattern: ADD,EDIT,DELET,SMT,GER,ADM

-- First, let's create centro de custo records for the departments if they don't exist
INSERT INTO public.centros_custo (
    id,
    codigo,
    descricao,
    ativo,
    created_at,
    updated_at
) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'QUALIDADE', 'QUALIDADE', true, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440002', 'PLANEJAMENTO', 'PLANEJAMENTO', true, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440003', 'PRODUCAO', 'PRODUÇÃO', true, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440004', 'SISTEMA', 'SISTEMA', true, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440005', 'FINANCEIRO', 'FINANCEIRO', true, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440006', 'DIRECAO', 'DIREÇÃO', true, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440007', 'ALMOXARIFADO', 'ALMOXARIFADO', true, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440008', 'RH', 'RH', true, NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440009', 'TI', 'T.I. - TECNOLOGIA DA INFORMAÇÃO', true, NOW(), NOW())
ON CONFLICT (codigo) DO NOTHING;

-- Insert the users
INSERT INTO public.usuarios (
    id,
    email,
    nome,
    perfil,
    centro_custo_id,
    ativo,
    created_at,
    updated_at
) VALUES 
    -- 1. BRIAN LUCAS DA COSTA REIS FONSECA - QUALIDADE (no permissions) → visualizador
    ('11111111-1111-1111-1111-111111111111', 'qualidade@balimax.com.br', 'BRIAN LUCAS DA COSTA REIS FONSECA', 'visualizador', '550e8400-e29b-41d4-a716-446655440001', true, NOW(), NOW()),
    
    -- 2. CHRISTIAN MATEUS DA COSTA REIS FONSECA - PLANEJAMENTO (ADD,EDIT,DELET,SMT,GER,ADM) → administrador  
    ('22222222-2222-2222-2222-222222222222', 'christian.fonseca@balimax.com.br', 'CHRISTIAN MATEUS DA COSTA REIS FONSECA', 'administrador', '550e8400-e29b-41d4-a716-446655440002', true, NOW(), NOW()),
    
    -- 3. EDENILSON DAMASCENO SANTANA - PRODUÇÃO (no permissions) → visualizador
    ('33333333-3333-3333-3333-333333333333', 'edenilson.santana@balimax.com.br', 'EDENILSON DAMASCENO SANTANA', 'visualizador', '550e8400-e29b-41d4-a716-446655440003', true, NOW(), NOW()),
    
    -- 4. JUNIO BARBOSA DA SILVA - SISTEMA (ADD,EDIT,ADM,DELET,SMT,GER) → administrador
    ('44444444-4444-4444-4444-444444444444', 'junio.silva@balimax.com.br', 'JUNIO BARBOSA DA SILVA', 'administrador', '550e8400-e29b-41d4-a716-446655440004', true, NOW(), NOW()),
    
    -- 5. MARCELO BRAGA - FINANCEIRO (no permissions) → visualizador
    ('55555555-5555-5555-5555-555555555555', 'marcelo.braga@balimax.com.br', 'MARCELO BRAGA', 'visualizador', '550e8400-e29b-41d4-a716-446655440005', true, NOW(), NOW()),
    
    -- 6. ORLANDO MAXIMO BALIEIRO - DIREÇÃO (no permissions) → supervisor (direção geralmente tem supervisão)
    ('66666666-6666-6666-6666-666666666666', 'orlando.balieiro@balimax.com.br', 'ORLANDO MAXIMO BALIEIRO', 'supervisor', '550e8400-e29b-41d4-a716-446655440006', true, NOW(), NOW()),
    
    -- 7. PEDRO VEIGA SILVA - ALMOXARIFADO (ADD,EDIT,DELET,SMT,GER) → almoxarife
    ('77777777-7777-7777-7777-777777777777', 'pedro.silva@balimax.com.br', 'PEDRO VEIGA SILVA', 'almoxarife', '550e8400-e29b-41d4-a716-446655440007', true, NOW(), NOW()),
    
    -- 8. TAINARA DA SILVA ANDRADE - ALMOXARIFADO (ADD,EDIT,DELET,SMT,GER,ADM) → administrador
    ('88888888-8888-8888-8888-888888888888', 'tainara.andrade@balimax.com.br', 'TAINARA DA SILVA ANDRADE', 'administrador', '550e8400-e29b-41d4-a716-446655440007', true, NOW(), NOW()),
    
    -- 9. THAYS DOS SANTOS DA CRUZ - RH (no permissions) → visualizador
    ('99999999-9999-9999-9999-999999999999', 'thays.santos@balimax.com.br', 'THAYS DOS SANTOS DA CRUZ', 'visualizador', '550e8400-e29b-41d4-a716-446655440008', true, NOW(), NOW()),
    
    -- 10. VALTENCIR NASCIMENTO DE ASSIS DIAS - T.I. (ADD,EDIT) → solicitante
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ti.balimax@balimax.com.br', 'VALTENCIR NASCIMENTO DE ASSIS DIAS', 'solicitante', '550e8400-e29b-41d4-a716-446655440009', true, NOW(), NOW())

ON CONFLICT (email) DO UPDATE SET
    nome = EXCLUDED.nome,
    perfil = EXCLUDED.perfil,
    centro_custo_id = EXCLUDED.centro_custo_id,
    updated_at = NOW();

-- Update or insert any missing empresa if needed
INSERT INTO public.empresas (
    id,
    razao_social,
    nome_fantasia,
    cnpj,
    ativo,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440100',
    'BALIMAX INDUSTRIA E COMERCIO LTDA',
    'BALIMAX',
    '17255001000134',
    true,
    NOW(),
    NOW()
) ON CONFLICT (cnpj) DO NOTHING;