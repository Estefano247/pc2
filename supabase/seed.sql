-- =============================================
-- Datos de Prueba para Librería MVP
-- =============================================

-- Autores
INSERT INTO autores (nombre, biografia) VALUES
    ('Gabriel García Márquez', 'Escritor colombiano, premio Nobel de Literatura 1982'),
    ('Isabel Allende', 'Escritora chilena, conocida por La casa de los espíritus'),
    ('Julio Cortázar', 'Escritor argentino, figura del Boom Latinoamericano'),
    ('Mario Vargas Llosa', 'Escritor peruano, premio Nobel de Literatura 2010');

-- Libros
INSERT INTO libros (titulo, isbn, precio, resumen, autor_id) VALUES
    ('Cien años de soledad', '978-84-376-0494-7', 19.99, 'La historia de la familia Buendía en Macondo', (SELECT id FROM autores WHERE nombre = 'Gabriel García Márquez')),
    ('El amor en los tiempos del cólera', '978-84-376-0495-4', 16.50, 'Una historia de amor que espera más de medio siglo', (SELECT id FROM autores WHERE nombre = 'Gabriel García Márquez')),
    ('La casa de los espíritus', '978-84-376-0496-1', 18.00, 'La saga de la familia Trueba', (SELECT id FROM autores WHERE nombre = 'Isabel Allende')),
    ('Rayuela', '978-84-376-0497-8', 15.75, 'Una novela que se puede leer de múltiples maneras', (SELECT id FROM autores WHERE nombre = 'Julio Cortázar')),
    ('La ciudad y los perros', '978-84-376-0498-5', 14.99, 'La vida en un colegio militar', (SELECT id FROM autores WHERE nombre = 'Mario Vargas Llosa'));

-- Inventario (stock inicial)
INSERT INTO inventario (libro_id, stock_actual) VALUES
    ((SELECT id FROM libros WHERE isbn = '978-84-376-0494-7'), 10),
    ((SELECT id FROM libros WHERE isbn = '978-84-376-0495-4'), 5),
    ((SELECT id FROM libros WHERE isbn = '978-84-376-0496-1'), 8),
    ((SELECT id FROM libros WHERE isbn = '978-84-376-0497-8'), 3),
    ((SELECT id FROM libros WHERE isbn = '978-84-376-0498-5'), 12)
ON CONFLICT (libro_id) DO UPDATE SET stock_actual = EXCLUDED.stock_actual;
