<?php
// ============================================================
// api/users/index.php — CON LUNCH_START_TIME Y LUNCH_LIMIT
// ============================================================

require_once __DIR__ . '/../../helpers/functions.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();
setSecurityHeaders();

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

    if ($status && in_array($status, ['active', 'inactive'], true)) {
        $where[]  = 'status = ?';
        $params[] = $status;
    }
    if ($search) {
        $s        = sanitizarTexto($search);
        $where[]  = '(name LIKE ? OR email LIKE ? OR area LIKE ?)';
        $params[] = "%$s%";
        $params[] = "%$s%";
        $params[] = "%$s%";
    }

    $stmt = $db->prepare("
        SELECT u.id, u.name, u.email, u.role, u.avatar, u.area, u.status,
               u.lunch_limit, u.lunch_start_time, u.schedule_id, u.created_at,
               s.name as schedule_name
        FROM users u
        LEFT JOIN schedules s ON s.id = u.schedule_id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY u.name ASC
    ");
    $stmt->execute($params);

    $users = $stmt->fetchAll();
    // Mapear a camelCase para el frontend
    $result = array_map(function($u) {
        return [
            'id'             => $u['id'],
            'name'           => $u['name'],
            'email'          => $u['email'],
            'role'           => $u['role'],
            'avatar'         => $u['avatar'],
            'area'           => $u['area'],
            'status'         => $u['status'],
            'lunchLimit'     => $u['lunch_limit'],
            'lunchStartTime' => $u['lunch_start_time'],
            'schedule_id'    => $u['schedule_id'],
            'schedule_name'  => $u['schedule_name'],
            'created_at'     => $u['created_at'],
        ];
    }, $users);

    respond(true, $result);
}

// ─── CREAR ───────────────────────────────────────────────────
if ($method === 'POST') {
    $body = getBody();
    $name           = sanitizarTexto($body['name']     ?? '');
    $email          = strtolower(trim($body['email']   ?? ''));
    $pass           = trim($body['password']           ?? '');
    $role           = in_array($body['role'] ?? '', ['admin', 'employee'], true) ? $body['role'] : 'employee';
    $area           = trim($body['area']               ?? '');
    $scheduleId     = trim($body['schedule_id']        ?? 'default-schedule-id');
    $lunchLimit     = trim($body['lunchLimit']         ?? '13:00');
    $lunchStartTime = trim($body['lunchStartTime']     ?? '12:00');

    if (!$name || !$email || !$pass || !$area) respondError('Nombre, email, contraseña y área son requeridos.');
    if (strlen($name) < 3 || strlen($name) > 150) respondError('El nombre debe tener entre 3 y 150 caracteres.');
    if (!validarEmail($email)) respondError('El correo electrónico no tiene un formato válido.');
    if (!validarPassword($pass)) respondError('La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo.');

    global $AREAS_PERMITIDAS;
    if (!in_array($area, $AREAS_PERMITIDAS, true)) respondError('El área seleccionada no es válida.');
    if (!preg_match('/^\d{2}:\d{2}$/', $lunchLimit)) $lunchLimit = '13:00';
    if (!preg_match('/^\d{2}:\d{2}$/', $lunchStartTime)) $lunchStartTime = '12:00';

    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) respondError('Este email ya está registrado.');

    $id     = generateUUID();
    $hash   = password_hash($pass, PASSWORD_BCRYPT, ['cost' => 12]);
    $avatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=" . urlencode($name);

    $stmt = $db->prepare("
        INSERT INTO users (id, name, email, password_hash, role, avatar, area, schedule_id, lunch_limit, lunch_start_time, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    ");
    $stmt->execute([$id, $name, $email, $hash, $role, $avatar, $area, $scheduleId, $lunchLimit, $lunchStartTime]);

    respond(true, [
        'id'             => $id,
        'name'           => $name,
        'email'          => $email,
        'role'           => $role,
        'avatar'         => $avatar,
        'area'           => $area,
        'status'         => 'active',
        'lunchLimit'     => $lunchLimit,
        'lunchStartTime' => $lunchStartTime,
        'schedule_id'    => $scheduleId,
    ], 'Usuario creado correctamente.', 201);
}

// ─── EDITAR ──────────────────────────────────────────────────
if ($method === 'PUT' && $targetId) {
    if (!preg_match('/^[0-9a-zA-Z\-]{5,36}$/', $targetId)) respondError('ID de usuario inválido.', 400);

    $body   = getBody();
    $fields = [];
    $params = [];

    if (!empty($body['name'])) {
        $name = sanitizarTexto($body['name']);
        if (strlen($name) < 3 || strlen($name) > 150) respondError('El nombre debe tener entre 3 y 150 caracteres.');
        $fields[] = 'name = ?'; $params[] = $name;
    }
    if (!empty($body['email'])) {
        $email = strtolower(trim($body['email']));
        if (!validarEmail($email)) respondError('El correo electrónico no tiene un formato válido.');
        $fields[] = 'email = ?'; $params[] = $email;
    }
    if (!empty($body['area'])) {
        global $AREAS_PERMITIDAS;
        if (!in_array($body['area'], $AREAS_PERMITIDAS, true)) respondError('El área seleccionada no es válida.');
        $fields[] = 'area = ?'; $params[] = $body['area'];
    }
    if (!empty($body['role']) && in_array($body['role'], ['admin', 'employee'], true)) {
        $fields[] = 'role = ?'; $params[] = $body['role'];
    }
    if (!empty($body['status']) && in_array($body['status'], ['active', 'inactive'], true)) {
        $fields[] = 'status = ?'; $params[] = $body['status'];
    }
    if (isset($body['schedule_id'])) {
        $fields[] = 'schedule_id = ?'; $params[] = trim($body['schedule_id']);
    }
    if (isset($body['lunchLimit']) && $body['lunchLimit'] !== '') {
        $ll = trim($body['lunchLimit']);
        if (!preg_match('/^\d{2}:\d{2}$/', $ll)) respondError('Formato de hora inválido para límite de almuerzo.');
        $fields[] = 'lunch_limit = ?'; $params[] = $ll;
    }
    if (isset($body['lunchStartTime']) && $body['lunchStartTime'] !== '') {
        $lst = trim($body['lunchStartTime']);
        if (!preg_match('/^\d{2}:\d{2}$/', $lst)) respondError('Formato de hora inválido para inicio de almuerzo.');
        $fields[] = 'lunch_start_time = ?'; $params[] = $lst;
    }
    if (!empty($body['password'])) {
        if (!validarPassword($body['password'])) respondError('La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo.');
        $fields[] = 'password_hash = ?'; $params[] = password_hash($body['password'], PASSWORD_BCRYPT, ['cost' => 12]);
    }

    if (empty($fields)) respondError('No hay campos para actualizar.');

    $params[] = $targetId;
    $stmt = $db->prepare("UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($params);

    respond(true, null, 'Usuario actualizado correctamente.');
}

// ─── ELIMINAR ────────────────────────────────────────────────
if ($method === 'DELETE' && $targetId) {
    if (!preg_match('/^[0-9a-zA-Z\-]{5,36}$/', $targetId)) respondError('ID de usuario inválido.', 400);
    if ($targetId === $authUser['id']) respondError('No puedes eliminarte a ti mismo.', 403);

    $stmt = $db->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->execute([$targetId]);
    $target = $stmt->fetch();
    if (!$target) respondError('Usuario no encontrado.', 404);

    $stmt = $db->prepare("UPDATE users SET status = 'inactive' WHERE id = ?");
    $stmt->execute([$targetId]);

    respond(true, null, 'Usuario desactivado correctamente.');
}

respondError('Método no permitido.', 405);