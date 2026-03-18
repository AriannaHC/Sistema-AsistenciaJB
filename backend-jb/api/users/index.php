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

    if ($status && in_array($status, ['active', 'inactive'], true)) {
        $where[] = 'u.status = ?';
        $params[] = $status;
    }

    if ($search) {
        $searchSanitizado = sanitizarTexto($search);
        $where[] = '(u.name LIKE ? OR u.email LIKE ? OR u.area LIKE ?)';
        $params[] = "%$searchSanitizado%";
        $params[] = "%$searchSanitizado%";
        $params[] = "%$searchSanitizado%";
    }

    $stmt = $db->prepare("
        SELECT
            u.id, u.name, u.email, u.role, u.avatar,
            u.area, u.status, u.created_at,
            u.schedule_id,
            s.name AS schedule_name
        FROM users u
        LEFT JOIN schedules s ON s.id = u.schedule_id
        WHERE " . implode(' AND ', $where) . "
        ORDER BY u.name ASC
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
    $scheduleId = trim($body['schedule_id'] ?? 'default-schedule-id');

    if (!$name || !$email || !$pass || !$area) {
        respondError('Nombre, email, contraseña y área son requeridos.');
    }

    if (strlen($name) < 3 || strlen($name) > 150) {
        respondError('El nombre debe tener entre 3 y 150 caracteres.');
    }

    if (!validarEmail($email)) {
        respondError('El correo electrónico no tiene un formato válido.');
    }

    if (!validarPassword($pass)) {
        respondError('La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo.');
    }

    global $AREAS_PERMITIDAS;
    if (!in_array($area, $AREAS_PERMITIDAS, true)) {
        respondError('El área seleccionada no es válida.');
    }

    $stmtSch = $db->prepare("SELECT id FROM schedules WHERE id = ?");
    $stmtSch->execute([$scheduleId]);
    if (!$stmtSch->fetch()) {
        respondError('El horario especificado no existe.', 404);
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
        INSERT INTO users (id, name, email, password_hash, role, avatar, area, schedule_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    ");
    $stmt->execute([$id, $name, $email, $hash, $role, $avatar, $area, $scheduleId]);

    respond(true, [
        'id' => $id,
        'name' => $name,
        'email' => $email,
        'role' => $role,
        'avatar' => $avatar,
        'area' => $area,
        'schedule_id' => $scheduleId,
        'status' => 'active',
    ], 'Usuario creado correctamente.', 201);
}

// ─── EDITAR ──────────────────────────────────────────────────
if ($method === 'PUT' && $targetId) {

    // ✅ Acepta UUID estándar e IDs legacy como u-admin-jb-001
    if (!preg_match('/^[a-zA-Z0-9\-]{5,36}$/', $targetId)) {
        respondError('ID de usuario inválido.', 400);
    }

    // ✅ Verificar que el usuario objetivo existe
    $stmtTarget = $db->prepare("SELECT id, role FROM users WHERE id = ?");
    $stmtTarget->execute([$targetId]);
    $targetUser = $stmtTarget->fetch();

    if (!$targetUser) {
        respondError('Usuario no encontrado.', 404);
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

    // ✅ Rol: un admin NO puede cambiarse su propio rol
    if (!empty($body['role']) && in_array($body['role'], ['admin', 'employee'], true)) {
        if ($targetId === $authUser['id']) {
            respondError('No puedes cambiar tu propio rol.', 403);
        }
        $fields[] = 'role = ?';
        $params[] = $body['role'];
    }

    // ✅ Status: un admin NO puede desactivarse a sí mismo
    if (!empty($body['status']) && in_array($body['status'], ['active', 'inactive'], true)) {
        if ($targetId === $authUser['id'] && $body['status'] === 'inactive') {
            respondError('No puedes desactivar tu propia cuenta.', 403);
        }
        $fields[] = 'status = ?';
        $params[] = $body['status'];
    }

    if (!empty($body['password'])) {
        if (!validarPassword($body['password'])) {
            respondError('La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo.');
        }
        $fields[] = 'password_hash = ?';
        $params[] = password_hash($body['password'], PASSWORD_BCRYPT, ['cost' => 12]);
    }

    // ✅ schedule_id — cualquier admin puede cambiar el horario de cualquier usuario
    //    incluyendo el suyo propio o el de otro admin
    if (!empty($body['schedule_id'])) {
        $stmtSch = $db->prepare("SELECT id FROM schedules WHERE id = ?");
        $stmtSch->execute([$body['schedule_id']]);
        if (!$stmtSch->fetch()) {
            respondError('El horario especificado no existe.', 404);
        }
        $fields[] = 'schedule_id = ?';
        $params[] = $body['schedule_id'];
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

    if (!preg_match('/^[a-zA-Z0-9\-]{5,36}$/', $targetId)) {
        respondError('ID de usuario inválido.', 400);
    }

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