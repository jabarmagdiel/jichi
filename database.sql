-- Esquema de Base de Datos para "El JiCHI" - Santa Cruz de la Sierra
-- Para ejecutar en el editor SQL de Supabase

-- Habilitar extensión PostGIS si se requiere en el futuro (opcional por ahora, usaremos lat/lon para simplicidad del MVP)
-- create extension if not exists postgis;

-- 1. Tabla de Camiones
CREATE TABLE public.camiones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    placa VARCHAR(20) NOT NULL UNIQUE,
    capacidad_kg NUMERIC NOT NULL DEFAULT 5000, -- Capacidad del camión en kg
    latitud_actual DOUBLE PRECISION,
    longitud_actual DOUBLE PRECISION,
    estado VARCHAR(20) DEFAULT 'inactivo', -- inactivo, en_ruta, mantenimiento
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabla de Contenedores (Enfocado en Santa Cruz de la Sierra)
CREATE TABLE public.contenedores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo_referencia VARCHAR(50) UNIQUE, -- Ej: CNT-URBARI-01
    direccion TEXT NOT NULL, -- Ej: Av. Piraí y 2do Anillo
    barrio VARCHAR(100), -- Ej: Equipetrol, Urbarí, Plan 3000
    distrito_municipal INTEGER, -- Ej: DM 1 al 15 en Santa Cruz
    latitud DOUBLE PRECISION NOT NULL, -- Coordenadas de Santa Cruz: ~ -17.78...
    longitud DOUBLE PRECISION NOT NULL, -- Coordenadas de Santa Cruz: ~ -63.18...
    capacidad_kg NUMERIC NOT NULL DEFAULT 1000, -- Capacidad del contenedor
    porcentaje_llenado INTEGER DEFAULT 0 CHECK (porcentaje_llenado >= 0 AND porcentaje_llenado <= 100),
    ultima_actualizacion_llenado TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabla de Rutas Generadas (Diarias)
CREATE TABLE public.rutas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    camion_id UUID REFERENCES public.camiones(id) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, en_progreso, completada
    distancia_total_km NUMERIC,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Detalle de Puntos a Visitar en cada Ruta
CREATE TABLE public.ruta_puntos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ruta_id UUID REFERENCES public.rutas(id) ON DELETE CASCADE,
    contenedor_id UUID REFERENCES public.contenedores(id) ON DELETE CASCADE,
    orden_visita INTEGER NOT NULL, -- El orden en el que el camión debe visitar este punto
    estado_recoleccion VARCHAR(20) DEFAULT 'pendiente', -- pendiente, recogido, omitido
    hora_estimada_llegada TIMESTAMP WITH TIME ZONE,
    hora_real_recoleccion TIMESTAMP WITH TIME ZONE
);

-- Añadir políticas de seguridad (RLS) básicas - Opcional para MVP pero recomendado en Supabase
ALTER TABLE public.camiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contenedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rutas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruta_puntos ENABLE ROW LEVEL SECURITY;

-- Políticas para desarrollo (Permitir lectura/escritura anónima temporalmente para el MVP)
CREATE POLICY "Permitir todo a anónimos en camiones" ON public.camiones FOR ALL USING (true);
CREATE POLICY "Permitir todo a anónimos en contenedores" ON public.contenedores FOR ALL USING (true);
CREATE POLICY "Permitir todo a anónimos en rutas" ON public.rutas FOR ALL USING (true);
CREATE POLICY "Permitir todo a anónimos en ruta_puntos" ON public.ruta_puntos FOR ALL USING (true);
