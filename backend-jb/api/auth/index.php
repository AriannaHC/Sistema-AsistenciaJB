<?php
// ============================================================
// api/auth/index.php — VERSIÓN SEGURA
// ============================================================

require_once __DIR__ . '/../../helpers/functions.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();
setSecurityHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ============================================================
// RATE LIMITING — máx 5 intentos fallidos por IP en 15 minutos
// Usa archivos temporales, no requiere Redis ni memcached
// ============================================================
function getRateLimitFile(string $ip): string
{
    $safe = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $ip);
    return sys_get_temp_dir() . '/jb_rl_' . $safe . '.json';
}

function checkRateLimit(string $ip): void
{
    $file = getRateLimitFile($ip);
    $maxIntentos = 5;
    $ventana = 5 * 60; // 5 minutos en segundos

    $data = ['intentos' => 0, 'primer_intento' => time(), 'bloqueado_hasta' => 0];

    if (file_exists($file)) {
        $data = json_decode(file_get_contents($file), true) ?? $data;
    }

    // Si está bloqueado, verificar si ya expiró el bloqueo
    if ($data['bloqueado_hasta'] > time()) {
        $restante = ceil(($data['bloqueado_hasta'] - time()) / 60);
        respondError("Demasiados intentos fallidos. Intente nuevamente en {$restante} minuto(s).", 429);
    }

    // Si la ventana de tiempo ya expiró, reiniciar contadores
    if ((time() - $data['primer_intento']) > $ventana) {
        $data = ['intentos' => 0, 'primer_intento' => time(), 'bloqueado_hasta' => 0];
        file_put_contents($file, json_encode($data));
    }
}

function registerFailedAttempt(string $ip): void
{
    $file = getRateLimitFile($ip);
    $maxIntentos = 5;
    $ventana = 15 * 60;

    $data = ['intentos' => 0, 'primer_intento' => time(), 'bloqueado_hasta' => 0];

    if (file_exists($file)) {
        $data = json_decode(file_get_contents($file), true) ?? $data;
    }

    $data['intentos']++;

    if ($data['intentos'] >= $maxIntentos) {
        $data['bloqueado_hasta'] = time() + $ventana;
    }

    file_put_contents($file, json_encode($data));
}

function clearRateLimit(string $ip): void
{
    $file = getRateLimitFile($ip);
    if (file_exists($file)) {
        unlink($file);
    }
}


// ─── LOGIN ───────────────────────────────────────────────────
if ($method === 'POST' && $action === 'login') {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';

    // ✅ Verificar rate limit antes de procesar
    checkRateLimit($ip);

    $body = getBody();
    $identifier = sanitizarTexto($body['email'] ?? '');
    $password = trim($body['password'] ?? '');

    if (!$identifier || !$password) {
        respondError('Usuario y contraseña son requeridos.');
    }

    // ✅ Limitar longitud para evitar ataques de payload gigante
    if (strlen($identifier) > 150 || strlen($password) > 255) {
        respondError('Datos inválidos.');
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE (email = ? OR name = ?) AND status = 'active'");
    $stmt->execute([$identifier, $identifier]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        // ✅ Registrar intento fallido
        registerFailedAttempt($ip);
        // ✅ Mensaje genérico — no revelar si el usuario existe o no
        respondError('Credenciales incorrectas. Verifique sus datos.', 401);
    }

    // ✅ Login exitoso — limpiar rate limit
    clearRateLimit($ip);

    $token = jwtEncode([
        'id' => $user['id'],
        'role' => $user['role'],
    ]);

    unset($user['password_hash']);
    respond(true, ['user' => $user, 'token' => $token], 'Inicio de sesión exitoso.');
}

// ─── REGISTER ────────────────────────────────────────────────
if ($method === 'POST' && $action === 'register') {
    $body = getBody();
    $name = sanitizarTexto($body['name'] ?? '');
    $email = strtolower(trim($body['email'] ?? ''));
    $pass = trim($body['password'] ?? '');
    $area = trim($body['area'] ?? '');

    // ✅ Validar campos requeridos
    if (!$name || !$email || !$pass || !$area) {
        respondError('Todos los campos son requeridos.');
    }

    // ✅ Validar longitudes máximas
    if (strlen($name) < 3 || strlen($name) > 150) {
        respondError('El nombre debe tener entre 3 y 150 caracteres.');
    }

    // ✅ Validar formato de email en el backend
    if (!validarEmail($email)) {
        respondError('El correo electrónico no tiene un formato válido.');
    }

    // ✅ Validar fuerza de contraseña en el backend
    if (!validarPassword($pass)) {
        respondError('La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo.');
    }

    // ✅ Validar área contra lista permitida
    global $AREAS_PERMITIDAS;
    if (!in_array($area, $AREAS_PERMITIDAS, true)) {
        respondError('El área seleccionada no es válida.');
    }

    $db = getDB();

    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        respondError('Este correo ya está registrado.');
    }

    $id = generateUUID();
    $hash = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);
    $avatar = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

    $scheduleId = 'default-schedule-id'; // Asegúrate de que este ID coincida con el que tienes en tu BD

    $stmt = $db->prepare("
        INSERT INTO users (id, name, email, password_hash, role, avatar, area, schedule_id, status)
        VALUES (?, ?, ?, ?, 'employee', ?, ?, ?, 'active')
    ");
    $stmt->execute([$id, $name, $email, $hash, $avatar, $area, $scheduleId]);

    // ✅ Al registrar NO devolvemos token — el usuario debe hacer login
    respond(true, [
        'user' => [
            'id' => $id,
            'name' => $name,
            'email' => $email,
            'role' => 'employee',
            'avatar' => $avatar,
            'area' => $area,
            'schedule_id' => $scheduleId,
            'status' => 'active',
        ],
    ], 'Cuenta creada exitosamente. Inicia sesión para continuar.', 201);
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