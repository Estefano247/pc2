-- =============================================
-- Esquema completo de Librería MVP + Mejoras
-- =============================================

-- Tablas
CREATE TABLE autores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    biografia TEXT,
    fecha_nacimiento DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE libros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    isbn TEXT UNIQUE NOT NULL,
    precio DECIMAL(10,2) NOT NULL CHECK (precio >= 0),
    resumen TEXT,
    portada_url TEXT,
    autor_id UUID REFERENCES autores(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE inventario (
    libro_id UUID PRIMARY KEY REFERENCES libros(id) ON DELETE CASCADE,
    stock_actual INTEGER NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    ultima_actualizacion TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE carritos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    libro_id UUID NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    UNIQUE(usuario_id, libro_id)
);

CREATE TABLE historial_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    libro_id UUID NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    stock_anterior INTEGER NOT NULL,
    stock_nuevo INTEGER NOT NULL,
    tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('venta', 'ajuste', 'devolucion', 'creacion')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_historial_inventario_libro ON historial_inventario(libro_id);

CREATE TABLE ordenes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','pagado','enviado','cancelado')),
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    direccion_envio TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE admins (
    usuario_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE orden_detalles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orden_id UUID REFERENCES ordenes(id) ON DELETE CASCADE,
    libro_id UUID REFERENCES libros(id),
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    precio_unitario_historico DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices
CREATE INDEX idx_libros_autor_id ON libros(autor_id);
CREATE INDEX idx_ordenes_usuario_id ON ordenes(usuario_id);
CREATE INDEX idx_orden_detalles_orden_id ON orden_detalles(orden_id);
CREATE INDEX idx_carritos_usuario_id ON carritos(usuario_id);

ALTER TABLE libros ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (to_tsvector('spanish', titulo || ' ' || coalesce(resumen, ''))) STORED;

CREATE INDEX idx_libros_search ON libros USING GIN (search_vector);

-- Triggers
CREATE OR REPLACE FUNCTION crear_inventario_al_insertar_libro()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO inventario (libro_id, stock_actual) VALUES (NEW.id, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_crear_inventario
AFTER INSERT ON libros FOR EACH ROW
EXECUTE FUNCTION crear_inventario_al_insertar_libro();

CREATE OR REPLACE FUNCTION actualizar_stock_post_venta()
RETURNS TRIGGER AS $$
DECLARE
    v_stock INTEGER;
BEGIN
    SELECT stock_actual INTO v_stock FROM inventario
    WHERE libro_id = NEW.libro_id FOR UPDATE;

    IF v_stock < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente';
    END IF;

    UPDATE inventario SET stock_actual = stock_actual - NEW.cantidad, ultima_actualizacion = now()
    WHERE libro_id = NEW.libro_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_descontar_stock
AFTER INSERT ON orden_detalles FOR EACH ROW
EXECUTE FUNCTION actualizar_stock_post_venta();

CREATE OR REPLACE FUNCTION registrar_historial_inventario()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock_actual <> OLD.stock_actual THEN
        INSERT INTO historial_inventario (libro_id, stock_anterior, stock_nuevo, tipo_movimiento)
        VALUES (NEW.libro_id, OLD.stock_actual, NEW.stock_actual,
            CASE WHEN NEW.stock_actual < OLD.stock_actual THEN 'venta' ELSE 'ajuste' END);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_historial_inventario
AFTER UPDATE ON inventario FOR EACH ROW
EXECUTE FUNCTION registrar_historial_inventario();

-- Funciones RPC
CREATE OR REPLACE FUNCTION listar_libros_con_stock(
    p_limit INT DEFAULT 12,
    p_offset INT DEFAULT 0
)
RETURNS TABLE(id UUID, titulo TEXT, isbn TEXT, precio DECIMAL, resumen TEXT, portada_url TEXT, autor_id UUID, autor_nombre TEXT, stock_actual INTEGER)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT l.id, l.titulo, l.isbn, l.precio, l.resumen, l.portada_url, l.autor_id, a.nombre AS autor_nombre, i.stock_actual
    FROM libros l
    LEFT JOIN autores a ON a.id = l.autor_id
    LEFT JOIN inventario i ON i.libro_id = l.id
    WHERE l.deleted_at IS NULL
    ORDER BY l.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
GRANT EXECUTE ON FUNCTION listar_libros_con_stock TO anon, authenticated;

CREATE OR REPLACE FUNCTION buscar_libros(
    p_query TEXT,
    p_limit INT DEFAULT 12,
    p_offset INT DEFAULT 0
)
RETURNS TABLE(id UUID, titulo TEXT, isbn TEXT, precio DECIMAL, resumen TEXT, portada_url TEXT, autor_id UUID, autor_nombre TEXT, stock_actual INTEGER)
LANGUAGE plpgsql STABLE AS $$
BEGIN
    RETURN QUERY
    SELECT l.id, l.titulo, l.isbn, l.precio, l.resumen, l.portada_url, l.autor_id, a.nombre AS autor_nombre, i.stock_actual
    FROM libros l
    LEFT JOIN autores a ON a.id = l.autor_id
    LEFT JOIN inventario i ON i.libro_id = l.id
    WHERE l.search_vector @@ plainto_tsquery('spanish', p_query)
      AND l.deleted_at IS NULL
    ORDER BY l.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
GRANT EXECUTE ON FUNCTION buscar_libros TO anon, authenticated;

CREATE OR REPLACE FUNCTION realizar_checkout(p_direccion_envio TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_usuario_id UUID := auth.uid();
    v_orden_id UUID;
    v_total DECIMAL(10,2);
BEGIN
    IF v_usuario_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    IF length(p_direccion_envio) > 500 THEN
        RAISE EXCEPTION 'direccion_muy_larga';
    END IF;

    -- Lock cart rows to prevent concurrent checkout race conditions
    PERFORM 1 FROM carritos WHERE usuario_id = v_usuario_id FOR UPDATE;

    SELECT COALESCE(SUM(l.precio * c.cantidad), 0) INTO v_total
    FROM carritos c JOIN libros l ON l.id = c.libro_id WHERE c.usuario_id = v_usuario_id;

    INSERT INTO ordenes (usuario_id, total, direccion_envio) VALUES (v_usuario_id, v_total, p_direccion_envio) RETURNING id INTO v_orden_id;

    INSERT INTO orden_detalles (orden_id, libro_id, cantidad, precio_unitario_historico)
    SELECT v_orden_id, c.libro_id, c.cantidad, l.precio FROM carritos c JOIN libros l ON l.id = c.libro_id WHERE c.usuario_id = v_usuario_id;

    DELETE FROM carritos WHERE usuario_id = v_usuario_id;

    RETURN json_build_object('orden_id', v_orden_id, 'total', v_total, 'estado', 'pendiente');
END;
$$;
GRANT EXECUTE ON FUNCTION realizar_checkout TO authenticated;

CREATE OR REPLACE FUNCTION sincronizar_carrito(p_items JSONB)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_item JSONB; v_usuario_id UUID := auth.uid();
BEGIN
    IF v_usuario_id IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    DELETE FROM carritos WHERE usuario_id = v_usuario_id;
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        INSERT INTO carritos (usuario_id, libro_id, cantidad)
        VALUES (v_usuario_id, (v_item->>'id')::UUID, (v_item->>'cantidad')::INTEGER);
    END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION sincronizar_carrito TO authenticated;

-- RLS
ALTER TABLE autores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autores_select" ON autores FOR SELECT USING (true);
CREATE POLICY "autores_insert" ON autores FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "autores_update" ON autores FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "autores_delete" ON autores FOR DELETE USING (auth.role() = 'service_role');

ALTER TABLE libros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "libros_select" ON libros FOR SELECT USING (true);
CREATE POLICY "libros_insert" ON libros FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "libros_update" ON libros FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY "libros_delete" ON libros FOR DELETE USING (auth.role() = 'service_role');

ALTER TABLE inventario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventario_select" ON inventario FOR SELECT USING (true);
CREATE POLICY "inventario_update" ON inventario FOR UPDATE USING (auth.role() = 'service_role');

ALTER TABLE carritos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "carritos_select" ON carritos FOR SELECT USING (auth.uid() = usuario_id);
CREATE POLICY "carritos_insert" ON carritos FOR INSERT WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "carritos_update" ON carritos FOR UPDATE USING (auth.uid() = usuario_id);
CREATE POLICY "carritos_delete" ON carritos FOR DELETE USING (auth.uid() = usuario_id);

ALTER TABLE ordenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ordenes_select" ON ordenes FOR SELECT USING (auth.uid() = usuario_id);
CREATE POLICY "ordenes_insert" ON ordenes FOR INSERT WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "ordenes_update" ON ordenes FOR UPDATE USING (auth.uid() = usuario_id AND estado != 'pagado');

ALTER TABLE orden_detalles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "detalles_select" ON orden_detalles FOR SELECT USING (
    EXISTS (SELECT 1 FROM ordenes WHERE ordenes.id = orden_id AND ordenes.usuario_id = auth.uid())
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_select" ON admins FOR SELECT USING (auth.uid() = usuario_id);
CREATE POLICY "admins_insert" ON admins FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "admins_delete" ON admins FOR DELETE USING (auth.role() = 'service_role');
