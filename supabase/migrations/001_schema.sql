-- =============================================
-- Librería MVP - Backend Completo en Supabase
-- =============================================

-- 1. Autores
CREATE TABLE autores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    biografia TEXT,
    fecha_nacimiento DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Libros
CREATE TABLE libros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    isbn TEXT UNIQUE NOT NULL,
    precio DECIMAL(10, 2) NOT NULL CHECK (precio >= 0),
    resumen TEXT,
    portada_url TEXT,
    autor_id UUID REFERENCES autores(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Inventario
CREATE TABLE inventario (
    libro_id UUID PRIMARY KEY REFERENCES libros(id) ON DELETE CASCADE,
    stock_actual INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    ultima_actualizacion TIMESTAMPTZ DEFAULT now()
);

-- 4. Carrito
CREATE TABLE carritos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    libro_id UUID NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    UNIQUE(usuario_id, libro_id)
);

-- 5. Órdenes
CREATE TABLE ordenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'enviado', 'cancelado')),
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    direccion_envio TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Detalles de Orden
CREATE TABLE orden_detalles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id UUID REFERENCES ordenes(id) ON DELETE CASCADE,
    libro_id UUID REFERENCES libros(id),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario_historico DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Índices
-- =============================================
CREATE INDEX idx_libros_autor_id ON libros(autor_id);
CREATE INDEX idx_ordenes_usuario_id ON ordenes(usuario_id);
CREATE INDEX idx_orden_detalles_orden_id ON orden_detalles(orden_id);
CREATE INDEX idx_carritos_usuario_id ON carritos(usuario_id);

-- =============================================
-- Full Text Search
-- =============================================
ALTER TABLE libros
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
    to_tsvector('spanish', titulo || ' ' || coalesce(resumen, ''))
) STORED;

CREATE INDEX idx_libros_search ON libros USING GIN (search_vector);

-- =============================================
-- Trigger: auto-crear inventario al insertar libro
-- =============================================
CREATE OR REPLACE FUNCTION public.crear_inventario_al_insertar_libro()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.inventario (libro_id, stock_actual)
    VALUES (NEW.id, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_crear_inventario
AFTER INSERT ON public.libros
FOR EACH ROW EXECUTE FUNCTION public.crear_inventario_al_insertar_libro();

-- =============================================
-- Trigger: descontar stock al crear detalle de orden
-- =============================================
CREATE OR REPLACE FUNCTION public.actualizar_stock_post_venta()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT stock_actual FROM public.inventario WHERE libro_id = NEW.libro_id) < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para el libro con ID %', NEW.libro_id;
    END IF;

    UPDATE public.inventario
    SET stock_actual = stock_actual - NEW.cantidad,
        ultima_actualizacion = now()
    WHERE libro_id = NEW.libro_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_descontar_stock
AFTER INSERT ON public.orden_detalles
FOR EACH ROW EXECUTE FUNCTION public.actualizar_stock_post_venta();

-- =============================================
-- Función: realizar_checkout (transacción completa)
-- Reemplaza toda la lógica del controller Express
-- =============================================
CREATE OR REPLACE FUNCTION public.realizar_checkout(
    p_direccion_envio TEXT
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_usuario_id UUID := auth.uid();
    v_orden_id UUID;
    v_total DECIMAL(10,2);
    v_cart_count INTEGER;
BEGIN
    IF v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    IF p_direccion_envio IS NULL OR p_direccion_envio = '' THEN
        RAISE EXCEPTION 'Dirección de envío requerida';
    END IF;

    SELECT COUNT(*) INTO v_cart_count
    FROM carritos WHERE usuario_id = v_usuario_id;

    IF v_cart_count = 0 THEN
        RAISE EXCEPTION 'Carrito vacío';
    END IF;

    SELECT COALESCE(SUM(l.precio * c.cantidad), 0) INTO v_total
    FROM carritos c
    JOIN libros l ON l.id = c.libro_id
    WHERE c.usuario_id = v_usuario_id;

    INSERT INTO ordenes (usuario_id, total, direccion_envio, estado)
    VALUES (v_usuario_id, v_total, p_direccion_envio, 'pendiente')
    RETURNING id INTO v_orden_id;

    INSERT INTO orden_detalles (orden_id, libro_id, cantidad, precio_unitario_historico)
    SELECT v_orden_id, c.libro_id, c.cantidad, l.precio
    FROM carritos c
    JOIN libros l ON l.id = c.libro_id
    WHERE c.usuario_id = v_usuario_id;

    DELETE FROM carritos WHERE usuario_id = v_usuario_id;

    RETURN json_build_object(
        'orden_id', v_orden_id,
        'total', v_total,
        'estado', 'pendiente'
    );
END;
$$;

-- =============================================
-- Función: buscar_libros (full-text search)
-- =============================================
CREATE OR REPLACE FUNCTION public.buscar_libros(p_query TEXT)
RETURNS TABLE(
    id UUID, titulo TEXT, isbn TEXT, precio DECIMAL,
    resumen TEXT, portada_url TEXT, autor_id UUID,
    autor_nombre TEXT, stock_actual INTEGER
) LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.id, l.titulo, l.isbn, l.precio,
        l.resumen, l.portada_url, l.autor_id,
        a.nombre AS autor_nombre,
        i.stock_actual
    FROM libros l
    LEFT JOIN autores a ON a.id = l.autor_id
    LEFT JOIN inventario i ON i.libro_id = l.id
    WHERE l.search_vector @@ plainto_tsquery('spanish', p_query)
    ORDER BY ts_rank(l.search_vector, plainto_tsquery('spanish', p_query)) DESC;
END;
$$;

-- =============================================
-- Función: listar_libros_con_stock
-- =============================================
CREATE OR REPLACE FUNCTION public.listar_libros_con_stock()
RETURNS TABLE(
    id UUID, titulo TEXT, isbn TEXT, precio DECIMAL,
    resumen TEXT, portada_url TEXT, autor_id UUID,
    autor_nombre TEXT, stock_actual INTEGER
) LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.id, l.titulo, l.isbn, l.precio,
        l.resumen, l.portada_url, l.autor_id,
        a.nombre AS autor_nombre,
        i.stock_actual
    FROM libros l
    LEFT JOIN autores a ON a.id = l.autor_id
    LEFT JOIN inventario i ON i.libro_id = l.id
    ORDER BY l.created_at DESC;
END;
$$;

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Autores: solo admins insert/update/delete, todos pueden leer
ALTER TABLE autores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autores visible para todos"
ON autores FOR SELECT
USING (true);

CREATE POLICY "Solo admin gestiona autores"
ON autores FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Solo admin actualiza autores"
ON autores FOR UPDATE
USING (auth.role() = 'service_role');

CREATE POLICY "Solo admin elimina autores"
ON autores FOR DELETE
USING (auth.role() = 'service_role');

-- Libros: solo admins insert/update/delete, todos pueden leer
ALTER TABLE libros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Libros visible para todos"
ON libros FOR SELECT
USING (true);

CREATE POLICY "Solo admin gestiona libros"
ON libros FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Solo admin actualiza libros"
ON libros FOR UPDATE
USING (auth.role() = 'service_role');

CREATE POLICY "Solo admin elimina libros"
ON libros FOR DELETE
USING (auth.role() = 'service_role');

-- Inventario: todos pueden ver, solo admin modifica
ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventario visible para todos"
ON inventario FOR SELECT
USING (true);

CREATE POLICY "Solo admin modifica inventario"
ON inventario FOR UPDATE
USING (auth.role() = 'service_role');

-- Carrito: cada usuario solo ve/maneja su propio carrito
ALTER TABLE carritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven su propio carrito"
ON carritos FOR SELECT
USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios insertan su propio carrito"
ON carritos FOR INSERT
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuarios actualizan su propio carrito"
ON carritos FOR UPDATE
USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios eliminan su propio carrito"
ON carritos FOR DELETE
USING (auth.uid() = usuario_id);

-- Órdenes: cada usuario solo ve sus órdenes
ALTER TABLE ordenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus propias órdenes"
ON ordenes FOR SELECT
USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios crean sus propias órdenes"
ON ordenes FOR INSERT
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "No modificar órdenes pagadas"
ON ordenes FOR UPDATE
USING (auth.uid() = usuario_id AND estado != 'pagado');

-- Detalles de Órdenes: acceso via la orden padre
ALTER TABLE orden_detalles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven detalles de sus órdenes"
ON orden_detalles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM ordenes
        WHERE ordenes.id = orden_id
        AND ordenes.usuario_id = auth.uid()
    )
);
