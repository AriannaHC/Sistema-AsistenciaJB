<?php
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    http_response_code(200);
    exit();
}
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
// ============================================================
// api/users/index.php
// ============================================================

require_once __DIR__ . '/../../helpers/functions.php';
require_once __DIR__ . '/../../middleware/auth.php';

$method   = $_SERVER['REQUEST_METHOD'];
$targetId = $_GET['id'] ?? null;
$db       = getDB();

$authUser = requireAdmin();

// ─── LISTAR ──────────────────────────────────────────────────
if ($method === 'GET') {
    $status = $_GET['status'] ?? null;
    $search = $_GET['search'] ?? null;

    $where  = ['1=1'];
    $params = [];

    if ($status) { $where[] = 'status = ?'; $params[] = $status; }
    if ($search) {
        $where[]  = '(name LIKE ? OR email LIKE ? OR area LIKE ?)';
        $params[] = "%$search%";
        $params[] = "%$search%";
        $params[] = "%$search%";
    }

    $stmt = $db->prepare("SELECT id, name, email, role, avatar, area, status, created_at FROM users WHERE " . implode(' AND ', $where) . " ORDER BY name ASC");
    $stmt->execute($params);
    $users = $stmt->fetchAll();

    respond(true, $users);
}

// ─── CREAR ───────────────────────────────────────────────────
if ($method === 'POST') {
    $body  = getBody();
    $name  = trim($body['name'] ?? '');
    $email = trim($body['email'] ?? '');
    $pass  = trim($body['password'] ?? '');
    $role  = in_array($body['role'] ?? '', ['admin','employee']) ? $body['role'] : 'employee';
    $area  = trim($body['area'] ?? '');

    if (!$name || !$email || !$pass || !$area) {
        respondError('Nombre, email, contraseña y área son requeridos.');
    }

    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) respondError('Este email/usuario ya está registrado.');

    $id     = generateUUID();
    $hash   = password_hash($pass, PASSWORD_BCRYPT);
    $avatar = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

    $stmt = $db->prepare("
        INSERT INTO users (id, name, email, password_hash, role, avatar, area, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    ");
    $stmt->execute([$id, $name, $email, $hash, $role, $avatar, $area]);

    respond(true, [
        'id' => $id, 'name' => $name, 'email' => $email,
        'role' => $role, 'avatar' => $avatar, 'area' => $area, 'status' => 'active',
    ], 'Usuario creado correctamente.', 201);
}

// ─── EDITAR ──────────────────────────────────────────────────
if ($method === 'PUT' && $targetId) {
    $body   = getBody();
    $fields = [];
    $params = [];

    if (!empty($body['name']))   { $fields[] = 'name = ?';   $params[] = $body['name']; }
    if (!empty($body['email']))  { $fields[] = 'email = ?';  $params[] = $body['email']; }
    if (!empty($body['area']))   { $fields[] = 'area = ?';   $params[] = $body['area']; }
    if (!empty($body['role']) && in_array($body['role'], ['admin','employee'])) {
        $fields[] = 'role = ?'; $params[] = $body['role'];
    }
    if (!empty($body['status']) && in_array($body['status'], ['active','inactive'])) {
        $fields[] = 'status = ?'; $params[] = $body['status'];
    }
    if (!empty($body['password'])) {
        $fields[] = 'password_hash = ?';
        $params[] = password_hash($body['password'], PASSWORD_BCRYPT);
    }

    if (empty($fields)) respondError('No hay campos para actualizar.');

    $params[] = $targetId;
    $stmt = $db->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($params);

    respond(true, null, 'Usuario actualizado correctamente.');
}

// ─── ELIMINAR (permanente) ────────────────────────────────────
if ($method === 'DELETE' && $targetId) {
    if ($targetId === 'u-admin-jb-001') {
        respondError('No se puede eliminar al administrador principal.', 403);
    }

    // Eliminar registros de asistencia del usuario primero
    $stmt = $db->prepare("DELETE FROM attendance_records WHERE user_id = ?");
    $stmt->execute([$targetId]);

    // Eliminar el usuario
    $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$targetId]);

    respond(true, null, 'Usuario eliminado correctamente.');
}

respondError('Método no permitido.', 405);