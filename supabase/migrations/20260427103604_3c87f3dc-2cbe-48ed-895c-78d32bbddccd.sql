
-- Enum de status da reserva
CREATE TYPE public.status_reserva AS ENUM ('confirmada', 'cancelada', 'concluida', 'no_show');

-- Tabela de reservas
CREATE TABLE public.reservas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mesa_id UUID NOT NULL REFERENCES public.mesas(id) ON DELETE CASCADE,
  cliente_nome TEXT NOT NULL,
  cliente_telefone TEXT,
  pessoas INTEGER NOT NULL DEFAULT 2 CHECK (pessoas > 0),
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  duracao_minutos INTEGER NOT NULL DEFAULT 90 CHECK (duracao_minutos > 0),
  observacao TEXT,
  status status_reserva NOT NULL DEFAULT 'confirmada',
  criado_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservas_data_hora ON public.reservas(data_hora);
CREATE INDEX idx_reservas_mesa_data ON public.reservas(mesa_id, data_hora);
CREATE INDEX idx_reservas_status ON public.reservas(status);

-- RLS
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem reservas"
ON public.reservas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin gerencia reservas"
ON public.reservas FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
CREATE TRIGGER trg_reservas_updated_at
BEFORE UPDATE ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validação: impede sobreposição de reservas confirmadas na mesma mesa
CREATE OR REPLACE FUNCTION public.validar_reserva_sem_conflito()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conflito INTEGER;
BEGIN
  IF NEW.status <> 'confirmada' THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO conflito
  FROM public.reservas r
  WHERE r.mesa_id = NEW.mesa_id
    AND r.status = 'confirmada'
    AND r.id <> COALESCE(NEW.id, gen_random_uuid())
    AND tstzrange(NEW.data_hora, NEW.data_hora + (NEW.duracao_minutos || ' minutes')::interval, '[)')
        && tstzrange(r.data_hora, r.data_hora + (r.duracao_minutos || ' minutes')::interval, '[)');

  IF conflito > 0 THEN
    RAISE EXCEPTION 'Já existe reserva confirmada para esta mesa nesse horário';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reservas_sem_conflito
BEFORE INSERT OR UPDATE ON public.reservas
FOR EACH ROW EXECUTE FUNCTION public.validar_reserva_sem_conflito();
