<?php
// ============================================================
// api/notifications/index.php
// Módulo de Notificaciones Internas — Sistema Asistencia JB
// ============================================================

require_once __DIR__ . '/../../helpers/functions.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();
setSecurityHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ─── CONFIGURACIÓN DE UPLOADS ────────────────────────────────
define('UPLOAD_BASE', __DIR__ . '/../../uploads/notifications/');
define('UPLOAD_IMAGES', UPLOAD_BASE . 'images/');
define('UPLOAD_PDFS', UPLOAD_BASE . 'pdfs/');

// URL pública base — ajusta si tu dominio cambia
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$scriptDir = str_replace('/api/notifications', '', dirname($_SERVER['SCRIPT_NAME']));
define('UPLOAD_URL_BASE', $protocol . '://' . $host . $scriptDir . '/uploads/notifications/');

// ─── EXTENSIONES Y MIME TYPES PERMITIDOS ─────────────────────
$ALLOWED_IMAGE_TYPES = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
];

$ALLOWED_PDF_TYPES = [
    'application/pdf' => 'pdf',
];

// ============================================================
// GET ?action=unread_count — Contador de no leídas
// ============================================================
if ($method === 'GET' && $action === 'unread_count') {
    $authUser = requireAuth();
    $db = getDB();

    $count = getUnreadCount($db, $authUser);
    respond(true, ['unread_count' => $count]);
}

// ============================================================
// GET ?action=mark_read — PUT para marcar como leída
// (también aceptamos PUT para semantica REST correcta)
// ============================================================
if (($method === 'PUT' || $method === 'POST') && $action === 'mark_read') {
    $authUser = requireAuth();
    $db = getDB();

    $body = getBody();
    $notificationId = trim($body['notification_id'] ?? '');

    if (!$notificationId || !preg_match('/^[a-zA-Z0-9\-]{5,36}$/', $notificationId)) {
        respondError('ID de notificación inválido.', 400);
    }

    // Verificar que la notificación existe y le pertenece al usuario
    if (!notificationBelongsToUser($db, $notificationId, $authUser)) {
        respondError('Notificación no encontrada.', 404);
    }

    // INSERT OR IGNORE — idempotente, no falla si ya estaba leída
    $stmt = $db->prepare("
        INSERT IGNORE INTO notification_reads (notification_id, user_id)
        VALUES (?, ?)
    ");
    $stmt->execute([$notificationId, $authUser['id']]);

    respond(true, [
        'unread_count' => getUnreadCount($db, $authUser),
    ], 'Notificación marcada como leída.');
}

// ============================================================
// GET — Listar notificaciones del usuario logueado
// ============================================================
if ($method === 'GET') {
    $authUser = requireAuth();
    $db = getDB();

    $page = max(1, (int) ($_GET['page'] ?? 1));
    $limit = min(50, (int) ($_GET['limit'] ?? 20));
    $offset = ($page - 1) * $limit;

    // Trae notificaciones que apliquen al usuario:
    // 1. Globales (all)
    // 2. De su área (area + audience_value = su área)
    // 3. Dirigidas a él (user + audience_value = su id)
    $stmt = $db->prepare("
        SELECT
            n.id,
            n.title,
            n.body,
            n.image_url,
            n.pdf_url,
            n.audience,
            n.audience_value,
            n.created_by,
            n.created_at,
            CASE WHEN nr.user_id IS NOT NULL THEN 1 ELSE 0 END AS is_read
        FROM notifications n
        LEFT JOIN notification_reads nr
            ON nr.notification_id = n.id AND nr.user_id = ?
        WHERE
            n.audience = 'all'
            OR (n.audience = 'area' AND n.audience_value = ?)
            OR (n.audience = 'user' AND n.audience_value = ?)
        ORDER BY n.created_at DESC
        LIMIT $limit OFFSET $offset
    ");
    $stmt->execute([$authUser['id'], $authUser['area'], $authUser['id']]);
    $notifications = $stmt->fetchAll();

    // Count total para paginación
    $stmtC = $db->prepare("
        SELECT COUNT(*) FROM notifications n
        WHERE
            n.audience = 'all'
            OR (n.audience = 'area' AND n.audience_value = ?)
            OR (n.audience = 'user' AND n.audience_value = ?)
    ");
    $stmtC->execute([$authUser['area'], $authUser['id']]);
    $total = (int) $stmtC->fetchColumn();

    // Formatear is_read a booleano
    $notifications = array_map(function ($n) {
        $n['is_read'] = (bool) $n['is_read'];
        return $n;
    }, $notifications);

    respond(true, [
        'notifications' => $notifications,
        'total' => $total,
        'page' => $page,
        'limit' => $limit,
        'unread_count' => getUnreadCount($db, $authUser),
    ]);
}

// ============================================================
// POST — Crear notificación (solo admin)
// ============================================================

if ($method === 'POST') {
    $authUser = requireAdmin();
    $db = getDB();

    // ── Leer campos de texto del multipart/form-data ──────────
    $title = sanitizarTexto($_POST['title'] ?? '');
    $body = sanitizarTexto($_POST['body'] ?? '');
    $audience = trim($_POST['audience'] ?? 'all');
    $audienceValue = trim($_POST['audience_value'] ?? '');

    // ── Idempotencia ─────────────────────────────────────────
    $idempotencyKey = trim($_POST['idempotency_key'] ?? '');
    if ($idempotencyKey) {
        $idempotencyKey = substr(preg_replace('/[^a-zA-Z0-9\-_]/', '', $idempotencyKey), 0, 64);
        $stmtCheck = $db->prepare("SELECT id FROM notifications WHERE idempotency_key = ?");
        $stmtCheck->execute([$idempotencyKey]);
        if ($existing = $stmtCheck->fetch()) {
            respond(true, ['id' => $existing['id']], 'Notificación ya registrada (idempotente).', 200);
        }
    }

    // ── Validaciones ─────────────────────────────────────────
    if (!$title) {
        respondError('El título de la notificación es requerido.');
    }

    if (strlen($title) > 200) {
        respondError('El título no puede exceder 200 caracteres.');
    }

    if (!in_array($audience, ['all', 'area', 'user'], true)) {
        respondError('Audiencia inválida. Use: all, area o user.');
    }

    if ($audience === 'area') {
        global $AREAS_PERMITIDAS;
        if (!in_array($audienceValue, $AREAS_PERMITIDAS, true)) {
            respondError('Área inválida para la segmentación.');
        }
    }

    if ($audience === 'user') {
        if (!$audienceValue || !preg_match('/^[a-zA-Z0-9\-]{5,36}$/', $audienceValue)) {
            respondError('ID de usuario inválido para la segmentación.');
        }
        $stmtU = $db->prepare("SELECT id FROM users WHERE id = ? AND status = 'active'");
        $stmtU->execute([$audienceValue]);
        if (!$stmtU->fetch()) {
            respondError('El usuario destinatario no existe o está inactivo.', 404);
        }
    }

    if ($audience === 'all') {
        $audienceValue = null;
    }

    // ── Procesar imagen ───────────────────────────────────────
    $imageUrl = null;
    if (!empty($_FILES['image']) && $_FILES['image']['error'] !== UPLOAD_ERR_NO_FILE) {
        $imageUrl = procesarArchivo(
            $_FILES['image'],
            UPLOAD_IMAGES,
            UPLOAD_URL_BASE . 'images/',
            $ALLOWED_IMAGE_TYPES,
            5 * 1024 * 1024,
            'imagen'
        );
    }

    // ── Procesar PDF ──────────────────────────────────────────
    $pdfUrl = null;
    if (!empty($_FILES['pdf']) && $_FILES['pdf']['error'] !== UPLOAD_ERR_NO_FILE) {
        $pdfUrl = procesarArchivo(
            $_FILES['pdf'],
            UPLOAD_PDFS,
            UPLOAD_URL_BASE . 'pdfs/',
            $ALLOWED_PDF_TYPES,
            10 * 1024 * 1024,
            'PDF'
        );
    }

    if (!$body && !$imageUrl && !$pdfUrl) {
        respondError('La notificación debe tener al menos texto, imagen o PDF.');
    }

    // ── Generar ID secuencial not-00001, not-00002, etc. ──────
    $stmtLastId = $db->prepare("
        SELECT id FROM notifications
        WHERE id LIKE 'not-%'
        ORDER BY id DESC
        LIMIT 1
    ");
    $stmtLastId->execute();
    $lastId = $stmtLastId->fetchColumn();

    if ($lastId) {
        // Extrae el número del último ID (ej: "not-00007" → 7)
        $lastNumber = (int) substr($lastId, 4); // quita "not-"
        $nextNumber = $lastNumber + 1;
    } else {
        // Primera notificación
        $nextNumber = 1;
    }

    $id = 'not-' . str_pad($nextNumber, 5, '0', STR_PAD_LEFT);
    // Resultado: not-00001, not-00002, ... not-00099, ... not-10000

    // ── Insertar ──────────────────────────────────────────────
    $stmt = $db->prepare("
        INSERT INTO notifications
            (id, title, body, image_url, pdf_url, audience, audience_value, created_by, idempotency_key)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $id,
        $title,
        $body ?: null,
        $imageUrl,
        $pdfUrl,
        $audience,
        $audienceValue,
        $authUser['id'],
        $idempotencyKey ?: null,
    ]);

    respond(true, [
        'id' => $id,
        'title' => $title,
        'image_url' => $imageUrl,
        'pdf_url' => $pdfUrl,
        'audience' => $audience,
    ], 'Notificación creada correctamente.', 201);
}

respondError('Método o acción no permitida.', 405);

// ============================================================
// HELPERS LOCALES
// ============================================================

/**
 * Verifica que la notificación le corresponda al usuario autenticado.
 */
function notificationBelongsToUser(PDO $db, string $notificationId, array $user): bool
{
    $stmt = $db->prepare("
        SELECT id FROM notifications
        WHERE id = ?
          AND (
              audience = 'all'
              OR (audience = 'area' AND audience_value = ?)
              OR (audience = 'user' AND audience_value = ?)
          )
    ");
    $stmt->execute([$notificationId, $user['area'], $user['id']]);
    return (bool) $stmt->fetch();
}

/**
 * Devuelve el contador de notificaciones no leídas del usuario.
 */
function getUnreadCount(PDO $db, array $user): int
{
    $stmt = $db->prepare("
        SELECT COUNT(*) FROM notifications n
        LEFT JOIN notification_reads nr
            ON nr.notification_id = n.id AND nr.user_id = ?
        WHERE
            nr.user_id IS NULL
            AND (
                n.audience = 'all'
                OR (n.audience = 'area' AND n.audience_value = ?)
                OR (n.audience = 'user' AND n.audience_value = ?)
            )
    ");
    $stmt->execute([$user['id'], $user['area'], $user['id']]);
    return (int) $stmt->fetchColumn();
}

/**
 * Procesa y guarda un archivo subido de forma segura.
 * Retorna la URL pública del archivo o llama a respondError().
 */
function procesarArchivo(
    array $file,
    string $destDir,
    string $destUrl,
    array $allowedTypes,
    int $maxBytes,
    string $tipoLabel
): string {
    // Error de subida
    if ($file['error'] !== UPLOAD_ERR_OK) {
        respondError("Error al subir el archivo $tipoLabel. Código: {$file['error']}");
    }

    // Tamaño máximo
    if ($file['size'] > $maxBytes) {
        $mb = $maxBytes / 1024 / 1024;
        respondError("El $tipoLabel excede el tamaño máximo de {$mb} MB.");
    }

    // Validar MIME type real (no el que reporta el cliente)
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeReal = $finfo->file($file['tmp_name']);

    if (!array_key_exists($mimeReal, $allowedTypes)) {
        $permitidos = implode(', ', array_keys($allowedTypes));
        respondError("Tipo de archivo no permitido para $tipoLabel. Permitidos: $permitidos");
    }

    $extension = $allowedTypes[$mimeReal];

    // Nombre único — imposible de adivinar
    $nombreUnico = 'notif_' . bin2hex(random_bytes(10)) . '.' . $extension;

    // Crear directorio si no existe
    if (!is_dir($destDir)) {
        mkdir($destDir, 0755, true);
    }

    $destPath = $destDir . $nombreUnico;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        respondError("No se pudo guardar el archivo $tipoLabel en el servidor.");
    }

    return $destUrl . $nombreUnico;
}