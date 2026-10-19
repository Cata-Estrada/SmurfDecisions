-- ==============================================================================
-- CORRECCIÓN DE POLÍTICAS DE SEGURIDAD (RLS) PARA SMURFDECISIONS EN SUPABASE
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase:
-- https://supabase.com/dashboard/project/yzgbigrqoodyvmbhiuxz/sql
-- ==============================================================================

-- 1. Deshabilitar RLS en las 6 tablas del prototipo (Alcance oficial Documento Maestro)
ALTER TABLE IF EXISTS public.fuentes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.indicadores DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.valores_indicador DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reglas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.alertas DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ejecuciones DISABLE ROW LEVEL SECURITY;

-- 2. Otorgar permisos explícitos de lectura, inserción y actualización a los roles anon y authenticated
GRANT ALL ON TABLE public.fuentes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.indicadores TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.valores_indicador TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.reglas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.alertas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ejecuciones TO anon, authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
