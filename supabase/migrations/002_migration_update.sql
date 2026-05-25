-- =============================================
-- Migración 002: Mejoras (paginación, soft-delete,
-- checkout idempotente, historial inventario)
-- Ejecutar DESPUÉS de 001_schema_clean.sql
-- =============================================

-- Soft-delete: columnas deleted_at
ALTER TABLE autores ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE libros ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Historial de inventario
CREATE TABLE IF NOT EXISTS historial_inventario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    libro_id UUID NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    stock_anterior INTEGER NOT NULL,
    stock_nuevo INTEGER NOT NULL,
    tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('venta', 'ajuste', 'devolucion', 'creacion')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historial_inventario_libro ON historial_inventario(libro_id);

ALTER TABLE historial_inventario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "historial_select" ON historial_inventario FOR SELECT USING (true);

-- Función de paginación: listar_libros_con_stock
DROP FUNCTION IF EXISTS listar_libros_con_stock();
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

-- Función de búsqueda con paginación
DROP FUNCTION IF EXISTS buscar_libros(TEXT);
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

-- Checkout idempotente (FOR UPDATE + validación dirección)
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

-- Trigger de stock con FOR UPDATE
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

-- Trigger de historial de inventario
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

DROP TRIGGER IF EXISTS tr_historial_inventario ON inventario;
CREATE TRIGGER tr_historial_inventario
AFTER UPDATE ON inventario FOR EACH ROW
EXECUTE FUNCTION registrar_historial_inventario();
