<?php
// ============================================================
// api/convenios/index.php — CRUD de Convenios con upload
// ============================================================

require_once __DIR__ . '/../../helpers/functions.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();

$method   = $_SERVER['REQUEST_METHOD'];
$targetId = $_GET['id'] ?? null;
$action   = $_GET['action'] ?? null;
$authUser = requireAuth();
$db       = getDB();

$UPLOAD_DIR = __DIR__ . '/../../uploads/convenios/';
$UPLOAD_URL = 'http://localhost/backend-jb/uploads/convenios/';

// Crear carpeta si no existe
if (!is_dir($UPLOAD_DIR)) {
    mkdir($UPLOAD_DIR, 0755, true);
}

// ─── UPLOAD DE IMAGEN ─────────────────────────────────────────
if ($method === 'POST' && $action === 'upload') {
    if ($authUser['role'] !== 'admin') respondError('Acceso denegado.', 403);

    if (!isset($_FILES['imagen']) || $_FILES['imagen']['error'] !== UPLOAD_ERR_OK) {
        respondError('No se recibió ninguna imagen o hubo un error al subirla.');
    }

    $file     = $_FILES['imagen'];
    $maxSize  = 5 * 1024 * 1024; // 5MB
    $allowed  = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    $finfo    = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if ($file['size'] > $maxSize) respondError('La imagen no debe superar 5MB.');
    if (!in_array($mimeType, $allowed, true)) respondError('Solo se permiten imágenes JPG, PNG, WEBP o GIF.');

    $ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid('conv_', true) . '.' . strtolower($ext);
    $destPath = $UPLOAD_DIR . $filename;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        respondError('Error al guardar la imagen en el servidor.');
    }

    respond(true, ['url' => $UPLOAD_URL . $filename], 'Imagen subida correctamente.');
}

// ─── LISTAR ───────────────────────────────────────────────────
if ($method === 'GET' && !$targetId) {
    $categoria = trim($_GET['categoria'] ?? '');
    $search    = trim($_GET['search'] ?? '');
    $soloActivos = $authUser['role'] !== 'admin';

    $where  = ['1=1'];
    $params = [];

    if ($soloActivos) {
        $where[] = 'activo = 1';
    }
    if ($categoria && $categoria !== 'Todas') {
        $where[]  = 'categoria = ?';
        $params[] = $categoria;
    }
    if ($search) {
        $s        = sanitizarTexto($search);
        $where[]  = '(nombre LIKE ? OR empresa LIKE ? OR descripcion LIKE ?)';
        $params[] = "%$s%";
        $params[] = "%$s%";
        $params[] = "%$s%";
    }

    $whereSQL = implode(' AND ', $where);
    $stmt = $db->prepare("SELECT * FROM convenios WHERE $whereSQL ORDER BY created_at DESC");
    $stmt->execute($params);

    respond(true, $stmt->fetchAll());
}

// ─── VER UNO ──────────────────────────────────────────────────
if ($method === 'GET' && $targetId) {
    $stmt = $db->prepare("SELECT * FROM convenios WHERE id = ?");
    $stmt->execute([$targetId]);
    $conv = $stmt->fetch();
    if (!$conv) respondError('Convenio no encontrado.', 404);
    respond(true, $conv);
}

// Solo admins pueden crear/editar/eliminar
if ($authUser['role'] !== 'admin') respondError('Acceso denegado.', 403);

// ─── CREAR ────────────────────────────────────────────────────
if ($method === 'POST') {
    $body = getBody();

    $nombre      = sanitizarTexto($body['nombre']      ?? '');
    $empresa     = sanitizarTexto($body['empresa']     ?? '');
    $categoria   = sanitizarTexto($body['categoria']   ?? '');
    $descripcion = trim($body['descripcion']  ?? '');
    $beneficios  = trim($body['beneficios']   ?? '');
    $quienes     = trim($body['quienes']      ?? '');
    $comoAcceder = trim($body['como_acceder'] ?? '');
    $vigencia    = trim($body['vigencia']     ?? '');
    $contacto    = trim($body['contacto']     ?? '');
    $descuento   = trim($body['descuento']    ?? '');
    $imagenUrl   = trim($body['imagen_url']   ?? '');
    $activo      = isset($body['activo']) ? (int)$body['activo'] : 1;

    if (!$nombre || !$empresa || !$categoria) {
        respondError('Nombre, empresa y categoría son requeridos.');
    }

    $CATEGORIAS = ['Salud', 'Alimentación', 'Educación', 'Transporte', 'Entretenimiento', 'Moda', 'Finanzas', 'Otros'];
    if (!in_array($categoria, $CATEGORIAS, true)) respondError('Categoría inválida.');

    $id   = generateUUID();
    $stmt = $db->prepare("
        INSERT INTO convenios (id, nombre, empresa, categoria, descripcion, beneficios, quienes, como_acceder, vigencia, contacto, descuento, imagen_url, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$id, $nombre, $empresa, $categoria, $descripcion, $beneficios, $quienes, $comoAcceder, $vigencia, $contacto, $descuento, $imagenUrl, $activo]);

    respond(true, ['id' => $id], 'Convenio creado correctamente.', 201);
}

// ─── EDITAR ───────────────────────────────────────────────────
if ($method === 'PUT' && $targetId) {
    $body    = getBody();
    $fields  = [];
    $params  = [];

    $map = [
        'nombre'      => fn($v) => sanitizarTexto($v),
        'empresa'     => fn($v) => sanitizarTexto($v),
        'categoria'   => fn($v) => sanitizarTexto($v),
        'descripcion' => fn($v) => trim($v),
        'beneficios'  => fn($v) => trim($v),
        'quienes'     => fn($v) => trim($v),
        'como_acceder'=> fn($v) => trim($v),
        'vigencia'    => fn($v) => trim($v),
        'contacto'    => fn($v) => trim($v),
        'descuento'   => fn($v) => trim($v),
        'imagen_url'  => fn($v) => trim($v),
        'activo'      => fn($v) => (int)$v,
    ];

    foreach ($map as $field => $fn) {
        if (isset($body[$field])) {
            $fields[] = "$field = ?";
            $params[] = $fn($body[$field]);
        }
    }

    if (empty($fields)) respondError('No hay campos para actualizar.');

    $params[] = $targetId;
    $stmt = $db->prepare("UPDATE convenios SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($params);

    respond(true, null, 'Convenio actualizado correctamente.');
}

// ─── ELIMINAR ─────────────────────────────────────────────────
if ($method === 'DELETE' && $targetId) {
    // Borrar imagen del servidor si existe
    $stmt = $db->prepare("SELECT imagen_url FROM convenios WHERE id = ?");
    $stmt->execute([$targetId]);
    $conv = $stmt->fetch();
    if ($conv && $conv['imagen_url']) {
        $filePath = __DIR__ . '/../../' . ltrim(str_replace('/backend-jb/', '', $conv['imagen_url']), '/');
        if (file_exists($filePath)) unlink($filePath);
    }

    $stmt = $db->prepare("DELETE FROM convenios WHERE id = ?");
    $stmt->execute([$targetId]);

    respond(true, null, 'Convenio eliminado correctamente.');
}

respondError('Método no permitido.', 405);