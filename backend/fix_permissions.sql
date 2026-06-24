-- =============================================================
-- Script de correção de permissões — banco: antifraude
-- Executar conectado como superuser ou como cesar.junior
-- =============================================================

-- 1. Garante acesso ao schema public
GRANT ALL ON SCHEMA public TO "leonardo.mudrik";

-- 2. Todas as tabelas existentes
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "leonardo.mudrik";

-- 3. Todas as sequences existentes (para INSERT com serial/bigserial)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "leonardo.mudrik";

-- 4. Tabelas futuras criadas por qualquer usuário
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL PRIVILEGES ON TABLES TO "leonardo.mudrik";

ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT ALL PRIVILEGES ON SEQUENCES TO "leonardo.mudrik";

-- 5. Garantias individuais nas tabelas críticas da aplicação
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users           TO "leonardo.mudrik";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.banks           TO "leonardo.mudrik";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.convenios       TO "leonardo.mudrik";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.brokers         TO "leonardo.mudrik";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.broker_groups   TO "leonardo.mudrik";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.proposals       TO "leonardo.mudrik";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products        TO "leonardo.mudrik";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.audit_logs      TO "leonardo.mudrik";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.blacklist_entries TO "leonardo.mudrik";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.integrations    TO "leonardo.mudrik";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pipeline_configs TO "leonardo.mudrik";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.antifraud_rules TO "leonardo.mudrik";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.antifraud_analyses TO "leonardo.mudrik";
