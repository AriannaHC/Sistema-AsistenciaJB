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
// api/attendance/index.php
// ============================================================

require_once __DIR__ . '/../../helpers/functions.php';
require_once __DIR__ . '/../../middleware/auth.php';

$method   = $_SERVER['REQUEST_METHOD'];
$action   = $_GET['action'] ?? '';
$authUser = requireAuth();
$db       = getDB();

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

    // Verificar que no haya completado jornada hoy
    $stmt = $db->prepare("
        SELECT id FROM attendance_records 
        WHERE user_id = ? AND date = ? AND check_out IS NOT NULL
    ");
    $stmt->execute([$authUser['id'], $today]);
    if ($stmt->fetch()) {
        respondError('Ya completaste tu jornada hoy. Hasta mañana.');
    }

    $id  = generateUUID();
    $now = date('Y-m-d H:i:s');

    $stmt = $db->prepare("
        INSERT INTO attendance_records (id, user_id, user_name, date, check_in, status)
        VALUES (?, ?, ?, ?, ?, 'Presente')
    ");
    $stmt->execute([$id, $authUser['id'], $authUser['name'], $today, $now]);

    respond(true, [
        'id'       => $id,
        'userId'   => $authUser['id'],
        'userName' => $authUser['name'],
        'date'     => $today,
        'checkIn'  => $now,
        'checkOut' => null,
        'status'   => 'Presente',
    ], 'Entrada registrada correctamente.', 201);
}

// ─── MARCAR SALIDA ───────────────────────────────────────────
if ($method === 'PUT' && $action === 'checkout') {
    $body     = getBody();
    $recordId = $body['id'] ?? null;

    if (!$recordId) respondError('ID de registro requerido.');

    $stmt = $db->prepare("SELECT * FROM attendance_records WHERE id = ? AND check_out IS NULL");
    $stmt->execute([$recordId]);
    $record = $stmt->fetch();

    if (!$record) respondError('Registro no encontrado o ya tiene salida registrada.');

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
        $stmt = $db->prepare("SELECT * FROM attendance_records WHERE date = ? ORDER BY check_in DESC");
        $stmt->execute([$today]);
    } else {
        $stmt = $db->prepare("SELECT * FROM attendance_records WHERE date = ? AND user_id = ? ORDER BY check_in DESC");
        $stmt->execute([$today, $authUser['id']]);
    }

    respond(true, array_map('formatRecord', $stmt->fetchAll()));
}

// ─── LISTAR TODOS (con filtros) ───────────────────────────────
if ($method === 'GET') {
    $userId   = $_GET['userId']   ?? null;
    $dateFrom = $_GET['dateFrom'] ?? null;
    $dateTo   = $_GET['dateTo']   ?? null;
    $search   = $_GET['search']   ?? null;
    $page     = max(1, (int)($_GET['page']  ?? 1));
    $limit    = min(100, (int)($_GET['limit'] ?? 50));
    $offset   = ($page - 1) * $limit;

    $where  = ['1=1'];
    $params = [];

    if ($authUser['role'] !== 'admin') {
        $where[]  = 'user_id = ?';
        $params[] = $authUser['id'];
    } elseif ($userId) {
        $where[]  = 'user_id = ?';
        $params[] = $userId;
    }

    if ($search)   { $where[] = 'user_name LIKE ?'; $params[] = "%$search%"; }
    if ($dateFrom) { $where[] = 'date >= ?';         $params[] = $dateFrom; }
    if ($dateTo)   { $where[] = 'date <= ?';         $params[] = $dateTo; }

    $sql  = "SELECT * FROM attendance_records WHERE " . implode(' AND ', $where) . " ORDER BY check_in DESC LIMIT $limit OFFSET $offset";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);

    $sqlCount = "SELECT COUNT(*) FROM attendance_records WHERE " . implode(' AND ', $where);
    $stmtC    = $db->prepare($sqlCount);
    $stmtC->execute($params);

    respond(true, [
        'records' => array_map('formatRecord', $stmt->fetchAll()),
        'total'   => (int)$stmtC->fetchColumn(),
        'page'    => $page,
        'limit'   => $limit,
    ]);
}

function formatRecord(array $r): array {
    return [
        'id'       => $r['id'],
        'userId'   => $r['user_id'],
        'userName' => $r['user_name'],
        'date'     => $r['date'],
        'checkIn'  => $r['check_in'],
        'checkOut' => $r['check_out'] ?? null,
        'status'   => $r['status'],
        'location' => $r['location'] ?? null,
    ];
}

respondError('Método no permitido.', 405);