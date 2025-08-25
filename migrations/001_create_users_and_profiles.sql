-- Criar tabela de usuários personalizada
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  nome VARCHAR(255) NOT NULL,
  perfil VARCHAR(50) NOT NULL CHECK (perfil IN ('administrador', 'almoxarife', 'supervisor', 'solicitante', 'visualizador')),
  centro_custo_id UUID REFERENCES centros_custo(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  ultimo_acesso TIMESTAMP WITH TIME ZONE
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil ON public.usuarios(perfil);
CREATE INDEX IF NOT EXISTS idx_usuarios_centro_custo ON public.usuarios(centro_custo_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON public.usuarios(ativo);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_usuarios_updated_at ON public.usuarios;
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Usuários podem ver próprio perfil" ON public.usuarios;
DROP POLICY IF EXISTS "Administradores podem ver todos os usuários" ON public.usuarios;
DROP POLICY IF EXISTS "Administradores podem gerenciar usuários" ON public.usuarios;

-- Políticas RLS básicas
CREATE POLICY "Usuários podem ver próprio perfil" ON public.usuarios
FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "Administradores podem ver todos os usuários" ON public.usuarios
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.usuarios u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.perfil = 'administrador' 
    AND u.ativo = true
  )
);

CREATE POLICY "Administradores podem gerenciar usuários" ON public.usuarios
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.usuarios u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.perfil = 'administrador' 
    AND u.ativo = true
  )
);

-- Criar função para inserir usuário após registro no auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (auth_user_id, email, nome, perfil)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'perfil', 'solicitante')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar usuário automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar último acesso
CREATE OR REPLACE FUNCTION public.update_user_last_access(user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.usuarios 
  SET ultimo_acesso = TIMEZONE('utc'::text, NOW())
  WHERE auth_user_id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inserir usuário administrador padrão se não existir
INSERT INTO public.usuarios (email, nome, perfil, ativo)
VALUES ('admin@almoxarifado.com', 'Administrador', 'administrador', true)
ON CONFLICT (email) DO NOTHING;