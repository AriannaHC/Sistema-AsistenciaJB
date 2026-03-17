<?php
// ============================================================
// api/attendance/index.php — VERSIÓN SEGURA
// ============================================================

require_once __DIR__ . '/../../helpers/functions.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();
setSecurityHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$authUser = requireAuth();
$db = getDB();

// ─── MARCAR ENTRADA ──────────────────────────────────────────
if ($method === 'POST' && $action === 'checkin') {
    $today = date('Y-m-d');

    $stmt = $db->prepare("
        SELECT id FROM attendance_records 
        WHERE user_id = ? AND date = ? AND check_out IS NULL
    ");
    $stmt->execute([$authUser['id'], $today]);
    if ($stmt->fetch()) {
        respondError('Ya tienes una jornada activa hoy. Primero registra tu salida.');
    }

    $stmt = $db->prepare("
        SELECT id FROM attendance_records 
        WHERE user_id = ? AND date = ? AND check_out IS NOT NULL
    ");
    $stmt->execute([$authUser['id'], $today]);
    if ($stmt->fetch()) {
        respondError('Ya completaste tu jornada hoy. Hasta mañana.');
    }

    $id = generateUUID();
    $now = date('Y-m-d H:i:s');

    $stmt = $db->prepare("
        INSERT INTO attendance_records (id, user_id, user_name, date, check_in, status)
        VALUES (?, ?, ?, ?, ?, 'Presente')
    ");
    $stmt->execute([$id, $authUser['id'], $authUser['name'], $today, $now]);

    respond(true, [
        'id' => $id,
        'userId' => $authUser['id'],
        'userName' => $authUser['name'],
        'date' => $today,
        'checkIn' => $now,
        'checkOut' => null,
        'status' => 'Presente',
    ], 'Entrada registrada correctamente.', 201);
}

// ─── MARCAR SALIDA ───────────────────────────────────────────
if ($method === 'PUT' && $action === 'checkout') {
    $body = getBody();
    $recordId = trim($body['id'] ?? '');

    if (!$recordId) {
        respondError('ID de registro requerido.');
    }

    // ✅ Validar formato UUID del recordId
    if (!preg_match('/^[0-9a-f\-]{36}$/', $recordId)) {
        respondError('ID de registro inválido.', 400);
    }

    $stmt = $db->prepare("SELECT * FROM attendance_records WHERE id = ? AND check_out IS NULL");
    $stmt->execute([$recordId]);
    $record = $stmt->fetch();

    if (!$record) {
        respondError('Registro no encontrado o ya tiene salida registrada.');
    }

    if ($authUser['role'] !== 'admin' && $record['user_id'] !== $authUser['id']) {
        respondError('No tienes permiso para modificar este registro.', 403);
    }

    $now = date('Y-m-d H:i:s');
    $stmt = $db->prepare("UPDATE attendance_records SET check_out = ? WHERE id = ?");
    $stmt->execute([$now, $recordId]);

    respond(true, array_merge(formatRecord($record), ['checkOut' => $now]), 'Salida registrada correctamente.');
}

// ─── REGISTROS DE HOY ────────────────────────────────────────
if ($method === 'GET' && $action === 'today') {
    $today = date('Y-m-d');

    if ($authUser['role'] === 'admin') {
        $stmt = $db->prepare("
            SELECT * FROM attendance_records 
            WHERE date = ? 
            ORDER BY check_in DESC
        ");
        $stmt->execute([$today]);
    } else {
        $stmt = $db->prepare("
            SELECT * FROM attendance_records 
            WHERE date = ? AND user_id = ? 
            ORDER BY check_in DESC
        ");
        $stmt->execute([$today, $authUser['id']]);
    }

    respond(true, array_map('formatRecord', $stmt->fetchAll()));
}

// ─── LISTAR TODOS (con filtros) ───────────────────────────────
if ($method === 'GET') {
    // ✅ Sanitizar y validar todos los parámetros de entrada
    $userId = trim($_GET['userId'] ?? '');
    $dateFrom = trim($_GET['dateFrom'] ?? '');
    $dateTo = trim($_GET['dateTo'] ?? '');
    $search = trim($_GET['search'] ?? '');
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $limit = min(100, (int) ($_GET['limit'] ?? 50));
    $offset = ($page - 1) * $limit;

    $where = ['1=1'];
    $params = [];

    if ($authUser['role'] !== 'admin') {
        $where[] = 'user_id = ?';
        $params[] = $authUser['id'];
    } elseif ($userId) {
        // ✅ Validar formato UUID del userId del filtro
        if (!preg_match('/^[0-9a-f\-]{36}$/', $userId)) {
            respondError('ID de usuario inválido.', 400);
        }
        $where[] = 'user_id = ?';
        $params[] = $userId;
    }

    if ($search) {
        // ✅ Sanitizar el campo search antes de usarlo en LIKE
        $searchSanitizado = sanitizarTexto($search);
        $where[] = 'user_name LIKE ?';
        $params[] = "%$searchSanitizado%";
    }

    if ($dateFrom) {
        // ✅ Validar formato de fecha
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom)) {
            respondError('Formato de fecha inválido en dateFrom.', 400);
        }
        $where[] = 'date >= ?';
        $params[] = $dateFrom;
    }

    if ($dateTo) {
        // ✅ Validar formato de fecha
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo)) {
            respondError('Formato de fecha inválido en dateTo.', 400);
        }
        $where[] = 'date <= ?';
        $params[] = $dateTo;
    }

    // ✅ LIMIT y OFFSET van directo en la query — son enteros validados arriba
    $whereSQL = implode(' AND ', $where);

    $stmt = $db->prepare("
        SELECT * FROM attendance_records 
        WHERE $whereSQL 
        ORDER BY check_in DESC 
        LIMIT $limit OFFSET $offset
    ");
    $stmt->execute($params);

    $stmtC = $db->prepare("SELECT COUNT(*) FROM attendance_records WHERE $whereSQL");
    $stmtC->execute($params);

    respond(true, [
        'records' => array_map('formatRecord', $stmt->fetchAll()),
        'total' => (int) $stmtC->fetchColumn(),
        'page' => $page,
        'limit' => $limit,
    ]);
}

function formatRecord(array $r): array
{
    return [
        'id' => $r['id'],
        'userId' => $r['user_id'],
        'userName' => $r['user_name'],
        'date' => $r['date'],
        'checkIn' => $r['check_in'],
        'checkOut' => $r['check_out'] ?? null,
        'status' => $r['status'],
        'location' => $r['location'] ?? null,
    ];
}

respondError('Método no permitido.', 405);