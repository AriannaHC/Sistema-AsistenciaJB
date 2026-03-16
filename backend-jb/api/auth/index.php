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
// api/auth/index.php
// ============================================================

require_once __DIR__ . '/../../helpers/functions.php';
require_once __DIR__ . '/../../middleware/auth.php';

// setCorsHeaders(); ← comentado para evitar duplicado

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ─── LOGIN ───────────────────────────────────────────────────
if ($method === 'POST' && $action === 'login') {
   $body = getBody();
$identifier = trim($body['email'] ?? '');
$password   = trim($body['password'] ?? '');

if (!$identifier || !$password) {
    respondError('Usuario y contraseña son requeridos.');
}

$db   = getDB();
$stmt = $db->prepare("SELECT * FROM users WHERE (email = ? OR name = ?) AND status = 'active'");
$stmt->execute([$identifier, $identifier]);
$user = $stmt->fetch();
    if (!$user || !password_verify($password, $user['password_hash'])) {
        respondError('Credenciales incorrectas. Verifique sus datos.', 401);
    }

    $token = jwtEncode([
        'id'   => $user['id'],
        'role' => $user['role'],
    ]);

    unset($user['password_hash']);
    respond(true, ['user' => $user, 'token' => $token], 'Inicio de sesión exitoso.');
}

// ─── REGISTER ────────────────────────────────────────────────
if ($method === 'POST' && $action === 'register') {
    $body  = getBody();
    $name  = trim($body['name'] ?? '');
    $email = trim($body['email'] ?? '');
    $pass  = trim($body['password'] ?? '');
    $area  = trim($body['area'] ?? '');

    if (!$name || !$email || !$pass || !$area) {
        respondError('Todos los campos son requeridos.');
    }

    $db = getDB();

    // Verificar si ya existe
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        respondError('Este identificador ya está registrado.');
    }

    $id     = generateUUID();
    $hash   = password_hash($pass, PASSWORD_BCRYPT);
$avatar = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

    $stmt = $db->prepare("
        INSERT INTO users (id, name, email, password_hash, role, avatar, area, status)
        VALUES (?, ?, ?, ?, 'employee', ?, ?, 'active')
    ");
    $stmt->execute([$id, $name, $email, $hash, $avatar, $area]);

    $token = jwtEncode(['id' => $id, 'role' => 'employee']);

    respond(true, [
        'user'  => ['id' => $id, 'name' => $name, 'email' => $email, 'role' => 'employee', 'avatar' => $avatar, 'area' => $area, 'status' => 'active'],
        'token' => $token,
    ], 'Cuenta creada exitosamente.', 201);
}

// ─── ME ──────────────────────────────────────────────────────
if ($method === 'GET' && $action === 'me') {
    $user = requireAuth();
    respond(true, $user);
}

// ─── LOGOUT ──────────────────────────────────────────────────
if ($method === 'POST' && $action === 'logout') {
    respond(true, null, 'Sesión cerrada.');
}

respondError('Acción no encontrada.', 404);
