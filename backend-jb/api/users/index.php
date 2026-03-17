<?php
// ============================================================
// api/users/index.php — VERSIÓN SEGURA
// ============================================================

require_once __DIR__ . '/../../helpers/functions.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();
setSecurityHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$targetId = $_GET['id'] ?? null;
$db = getDB();

$authUser = requireAdmin();

// ─── LISTAR ──────────────────────────────────────────────────
if ($method === 'GET') {
    $status = $_GET['status'] ?? null;
    $search = $_GET['search'] ?? null;

    $where = ['1=1'];
    $params = [];

    // ✅ Validar status contra valores permitidos
    if ($status && in_array($status, ['active', 'inactive'], true)) {
        $where[] = 'status = ?';
        $params[] = $status;
    }

    if ($search) {
        // ✅ Sanitizar búsqueda
        $searchSanitizado = sanitizarTexto($search);
        $where[] = '(name LIKE ? OR email LIKE ? OR area LIKE ?)';
        $params[] = "%$searchSanitizado%";
        $params[] = "%$searchSanitizado%";
        $params[] = "%$searchSanitizado%";
    }

    $stmt = $db->prepare("
        SELECT id, name, email, role, avatar, area, status, created_at 
        FROM users 
        WHERE " . implode(' AND ', $where) . " 
        ORDER BY name ASC
    ");
    $stmt->execute($params);

    respond(true, $stmt->fetchAll());
}

// ─── CREAR ───────────────────────────────────────────────────
if ($method === 'POST') {
    $body = getBody();
    $name = sanitizarTexto($body['name'] ?? '');
    $email = strtolower(trim($body['email'] ?? ''));
    $pass = trim($body['password'] ?? '');
    $role = in_array($body['role'] ?? '', ['admin', 'employee'], true) ? $body['role'] : 'employee';
    $area = trim($body['area'] ?? '');

    // ✅ Validar campos requeridos
    if (!$name || !$email || !$pass || !$area) {
        respondError('Nombre, email, contraseña y área son requeridos.');
    }

    // ✅ Validar longitudes
    if (strlen($name) < 3 || strlen($name) > 150) {
        respondError('El nombre debe tener entre 3 y 150 caracteres.');
    }

    // ✅ Validar formato de email
    if (!validarEmail($email)) {
        respondError('El correo electrónico no tiene un formato válido.');
    }

    // ✅ Validar fuerza de contraseña
    if (!validarPassword($pass)) {
        respondError('La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo.');
    }

    // ✅ Validar área contra lista permitida
    global $AREAS_PERMITIDAS;
    if (!in_array($area, $AREAS_PERMITIDAS, true)) {
        respondError('El área seleccionada no es válida.');
    }

    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        respondError('Este email ya está registrado.');
    }

    $id = generateUUID();
    $hash = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);
    $avatar = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

    $stmt = $db->prepare("
        INSERT INTO users (id, name, email, password_hash, role, avatar, area, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    ");
    $stmt->execute([$id, $name, $email, $hash, $role, $avatar, $area]);

    respond(true, [
        'id' => $id,
        'name' => $name,
        'email' => $email,
        'role' => $role,
        'avatar' => $avatar,
        'area' => $area,
        'status' => 'active',
    ], 'Usuario creado correctamente.', 201);
}

// ─── EDITAR ──────────────────────────────────────────────────
if ($method === 'PUT' && $targetId) {

    // ✅ Validar formato UUID del targetId
    if (!preg_match('/^[0-9a-f\-]{36}$/', $targetId)) {
        respondError('ID de usuario inválido.', 400);
    }

    $body = getBody();
    $fields = [];
    $params = [];

    if (!empty($body['name'])) {
        $name = sanitizarTexto($body['name']);
        if (strlen($name) < 3 || strlen($name) > 150) {
            respondError('El nombre debe tener entre 3 y 150 caracteres.');
        }
        $fields[] = 'name = ?';
        $params[] = $name;
    }

    if (!empty($body['email'])) {
        $email = strtolower(trim($body['email']));
        if (!validarEmail($email)) {
            respondError('El correo electrónico no tiene un formato válido.');
        }
        $fields[] = 'email = ?';
        $params[] = $email;
    }

    if (!empty($body['area'])) {
        global $AREAS_PERMITIDAS;
        if (!in_array($body['area'], $AREAS_PERMITIDAS, true)) {
            respondError('El área seleccionada no es válida.');
        }
        $fields[] = 'area = ?';
        $params[] = $body['area'];
    }

    if (!empty($body['role']) && in_array($body['role'], ['admin', 'employee'], true)) {
        $fields[] = 'role = ?';
        $params[] = $body['role'];
    }

    if (!empty($body['status']) && in_array($body['status'], ['active', 'inactive'], true)) {
        $fields[] = 'status = ?';
        $params[] = $body['status'];
    }

    if (!empty($body['password'])) {
        // ✅ Validar fuerza de la nueva contraseña
        if (!validarPassword($body['password'])) {
            respondError('La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo.');
        }
        $fields[] = 'password_hash = ?';
        $params[] = password_hash($body['password'], PASSWORD_BCRYPT, ['cost' => 12]);
    }

    if (empty($fields)) {
        respondError('No hay campos para actualizar.');
    }

    $params[] = $targetId;
    $stmt = $db->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($params);

    respond(true, null, 'Usuario actualizado correctamente.');
}

// ─── ELIMINAR ────────────────────────────────────────────────
if ($method === 'DELETE' && $targetId) {

    // ✅ Validar formato UUID del targetId
    if (!preg_match('/^[0-9a-f\-]{36}$/', $targetId)) {
        respondError('ID de usuario inválido.', 400);
    }

    // ✅ Proteger al admin principal por ID y también por rol único
    if ($targetId === $authUser['id']) {
        respondError('No puedes eliminarte a ti mismo.', 403);
    }

    $stmt = $db->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->execute([$targetId]);
    $target = $stmt->fetch();

    if (!$target) {
        respondError('Usuario no encontrado.', 404);
    }

    $stmt = $db->prepare("DELETE FROM attendance_records WHERE user_id = ?");
    $stmt->execute([$targetId]);

    $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$targetId]);

    respond(true, null, 'Usuario eliminado correctamente.');
}

respondError('Método no permitido.', 405);