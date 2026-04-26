-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'garcom', 'cozinha', 'caixa');
CREATE TYPE public.tamanho_item AS ENUM ('M', 'G', 'UNICO');
CREATE TYPE public.status_mesa AS ENUM ('livre', 'ocupada', 'aguardando_pagamento');
CREATE TYPE public.status_pedido AS ENUM ('aberto', 'fechado', 'cancelado');
CREATE TYPE public.status_item AS ENUM ('pendente', 'preparando', 'pronto', 'entregue', 'cancelado');
CREATE TYPE public.forma_pagamento AS ENUM ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'outro');

-- =========================================
-- FUNÇÃO de timestamp
-- =========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- USER_ROLES (segurança crítica - tabela separada)
-- =========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função SECURITY DEFINER para checar papel sem recursão
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =========================================
-- TRIGGER: criar profile + tornar primeiro usuário admin
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_users INTEGER;
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );

  SELECT COUNT(*) INTO total_users FROM public.user_roles;
  IF total_users = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- POLÍTICAS profiles
-- =========================================
CREATE POLICY "Usuários autenticados veem todos os perfis"
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuário atualiza seu próprio perfil"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admin atualiza qualquer perfil"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- POLÍTICAS user_roles
-- =========================================
CREATE POLICY "Usuário vê seus próprios papéis"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admin vê todos os papéis"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin gerencia papéis"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- CATEGORIAS
-- =========================================
CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_categorias_updated_at
BEFORE UPDATE ON public.categorias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Autenticados veem categorias"
ON public.categorias FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin gerencia categorias"
ON public.categorias FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- PRODUTOS
-- =========================================
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_m NUMERIC(10,2),
  preco_g NUMERIC(10,2),
  preco_unico NUMERIC(10,2),
  foto_url TEXT,
  disponivel BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_produtos_updated_at
BEFORE UPDATE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Autenticados veem produtos"
ON public.produtos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin gerencia produtos"
ON public.produtos FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- MESAS
-- =========================================
CREATE TABLE public.mesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INTEGER NOT NULL UNIQUE,
  capacidade INTEGER NOT NULL DEFAULT 4,
  status public.status_mesa NOT NULL DEFAULT 'livre',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mesas ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_mesas_updated_at
BEFORE UPDATE ON public.mesas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Autenticados veem mesas"
ON public.mesas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin gerencia mesas"
ON public.mesas FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Operação atualiza status da mesa"
ON public.mesas FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'garcom') OR
  public.has_role(auth.uid(), 'caixa') OR
  public.has_role(auth.uid(), 'admin')
);

-- =========================================
-- PEDIDOS (comandas)
-- =========================================
CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa_id UUID NOT NULL REFERENCES public.mesas(id) ON DELETE RESTRICT,
  garcom_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.status_pedido NOT NULL DEFAULT 'aberto',
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  observacao TEXT,
  aberto_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  fechado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pedidos_mesa ON public.pedidos(mesa_id);
CREATE INDEX idx_pedidos_status ON public.pedidos(status);

CREATE TRIGGER trg_pedidos_updated_at
BEFORE UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Autenticados veem pedidos"
ON public.pedidos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operação cria pedidos"
ON public.pedidos FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'garcom') OR
  public.has_role(auth.uid(), 'caixa') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Operação atualiza pedidos"
ON public.pedidos FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'garcom') OR
  public.has_role(auth.uid(), 'caixa') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admin remove pedidos"
ON public.pedidos FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- ITENS DO PEDIDO
-- =========================================
CREATE TABLE public.itens_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  nome_produto TEXT NOT NULL,
  tamanho public.tamanho_item NOT NULL DEFAULT 'UNICO',
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(10,2) NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  observacao TEXT,
  status public.status_item NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_itens_pedido ON public.itens_pedido(pedido_id);
CREATE INDEX idx_itens_status ON public.itens_pedido(status);

CREATE TRIGGER trg_itens_pedido_updated_at
BEFORE UPDATE ON public.itens_pedido
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Autenticados veem itens"
ON public.itens_pedido FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operação cria itens"
ON public.itens_pedido FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'garcom') OR
  public.has_role(auth.uid(), 'caixa') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Operação e cozinha atualizam itens"
ON public.itens_pedido FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'garcom') OR
  public.has_role(auth.uid(), 'caixa') OR
  public.has_role(auth.uid(), 'cozinha') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Operação remove itens"
ON public.itens_pedido FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'garcom') OR
  public.has_role(auth.uid(), 'caixa') OR
  public.has_role(auth.uid(), 'admin')
);

-- =========================================
-- TRIGGER: recalcula total do pedido
-- =========================================
CREATE OR REPLACE FUNCTION public.recalcular_total_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid UUID;
BEGIN
  pid := COALESCE(NEW.pedido_id, OLD.pedido_id);
  UPDATE public.pedidos
  SET total = COALESCE((
    SELECT SUM(subtotal) FROM public.itens_pedido
    WHERE pedido_id = pid AND status <> 'cancelado'
  ), 0)
  WHERE id = pid;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_recalcular_total_ins
AFTER INSERT ON public.itens_pedido
FOR EACH ROW EXECUTE FUNCTION public.recalcular_total_pedido();

CREATE TRIGGER trg_recalcular_total_upd
AFTER UPDATE ON public.itens_pedido
FOR EACH ROW EXECUTE FUNCTION public.recalcular_total_pedido();

CREATE TRIGGER trg_recalcular_total_del
AFTER DELETE ON public.itens_pedido
FOR EACH ROW EXECUTE FUNCTION public.recalcular_total_pedido();

-- =========================================
-- PAGAMENTOS
-- =========================================
CREATE TABLE public.pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  forma public.forma_pagamento NOT NULL,
  valor NUMERIC(10,2) NOT NULL,
  registrado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pagamentos_pedido ON public.pagamentos(pedido_id);
CREATE INDEX idx_pagamentos_data ON public.pagamentos(created_at);

CREATE POLICY "Autenticados veem pagamentos"
ON public.pagamentos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Caixa e admin registram pagamentos"
ON public.pagamentos FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'caixa') OR
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admin gerencia pagamentos"
ON public.pagamentos FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin remove pagamentos"
ON public.pagamentos FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- DADOS INICIAIS: 12 mesas e categorias base
-- =========================================
INSERT INTO public.mesas (numero, capacidade) 
SELECT n, 4 FROM generate_series(1, 12) AS n;

INSERT INTO public.categorias (nome, ordem) VALUES
  ('Entradas', 1),
  ('Pizzas', 2),
  ('Massas', 3),
  ('Pratos Principais', 4),
  ('Bebidas', 5),
  ('Sobremesas', 6);