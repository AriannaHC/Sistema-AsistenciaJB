<?php

require_once __DIR__ . '/../../helpers/functions.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();
setSecurityHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'dashboard';

$authUser = requireAuth();
$db = getDB();

if ($action === 'dashboard' && $authUser['role'] !== 'admin') {
    respondError('Acceso denegado. Se requiere rol de administrador.', 403);
}

// ─── DASHBOARD ───────────────────────────────────────────────
if ($method === 'GET' && $action === 'dashboard') {
    $today = date('Y-m-d');

    // ✅ CORREGIDO: prepared statements en todas las queries
    $stmt = $db->prepare("SELECT COUNT(*) FROM attendance_records WHERE date = ? AND check_out IS NULL");
    $stmt->execute([$today]);
    $activeNow = (int) $stmt->fetchColumn();

    $stmt = $db->prepare("SELECT COUNT(*) FROM attendance_records WHERE date = ?");
    $stmt->execute([$today]);
    $todayCount = (int) $stmt->fetchColumn();

    $stmt = $db->prepare("SELECT COUNT(*) FROM attendance_records");
    $stmt->execute([]);
    $totalRecords = (int) $stmt->fetchColumn();

    $stmt = $db->prepare("SELECT COUNT(*) FROM users WHERE status = 'active'");
    $stmt->execute([]);
    $totalUsers = (int) $stmt->fetchColumn();

    $stmt = $db->prepare("SELECT * FROM attendance_records ORDER BY check_in DESC LIMIT 6");
    $stmt->execute([]);
    $recent = array_map('formatRecord', $stmt->fetchAll());

    $stmt = $db->prepare("SELECT area, COUNT(*) as count FROM users WHERE status = 'active' GROUP BY area ORDER BY count DESC");
    $stmt->execute([]);
    $byArea = $stmt->fetchAll();

    respond(true, [
        'activeNow' => $activeNow,
        'todayCount' => $todayCount,
        'totalRecords' => $totalRecords,
        'totalUsers' => $totalUsers,
        'recentRecords' => $recent,
        'byArea' => $byArea,
        'attendanceRate' => $totalRecords > 0 ? 100 : 0,
    ]);
}

// ─── EXPORT CSV ──────────────────────────────────────────────
if ($method === 'GET' && $action === 'export') {
    $dateFrom = $_GET['dateFrom'] ?? date('Y-m-01');
    $dateTo = $_GET['dateTo'] ?? date('Y-m-d');

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom))
        $dateFrom = date('Y-m-01');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo))
        $dateTo = date('Y-m-d');

    if ($authUser['role'] === 'admin') {
        $stmt = $db->prepare("
            SELECT ar.*, u.area
            FROM attendance_records ar
            JOIN users u ON u.id = ar.user_id
            WHERE ar.date BETWEEN ? AND ?
            ORDER BY ar.date DESC, ar.check_in DESC
        ");
        $stmt->execute([$dateFrom, $dateTo]);
    } else {
        $stmt = $db->prepare("
            SELECT ar.*, u.area
            FROM attendance_records ar
            JOIN users u ON u.id = ar.user_id
            WHERE ar.date BETWEEN ? AND ? AND ar.user_id = ?
            ORDER BY ar.date DESC, ar.check_in DESC
        ");
        $stmt->execute([$dateFrom, $dateTo, $authUser['id']]);
    }
    $records = $stmt->fetchAll();

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="asistencia_jb_' . date('Y-m-d') . '.csv"');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('Pragma: no-cache');

    $out = fopen('php://output', 'w');
    fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF));
    fputcsv($out, ['ID', 'Colaborador', 'Área', 'Fecha', 'Entrada', 'Salida', 'Estado'], ';');

    foreach ($records as $r) {
        fputcsv($out, [
            $r['id'],
            $r['user_name'],
            $r['area'],
            $r['date'],
            $r['check_in'] ? date('H:i', strtotime($r['check_in'])) : '-',
            $r['check_out'] ? date('H:i', strtotime($r['check_out'])) : 'En curso',
            $r['status'],
        ], ';');
    }

    fclose($out);
    exit;
}

// ─── AREAS ───────────────────────────────────────────────────
if ($method === 'GET' && $action === 'areas') {
    $month = $_GET['month'] ?? date('Y-m');
    if (!preg_match('/^\d{4}-\d{2}$/', $month))
        $month = date('Y-m');

    $stmt = $db->prepare("
        SELECT u.area, COUNT(ar.id) as registros, COUNT(DISTINCT ar.user_id) as colaboradores
        FROM attendance_records ar
        JOIN users u ON u.id = ar.user_id
        WHERE DATE_FORMAT(ar.date, '%Y-%m') = ?
        GROUP BY u.area
        ORDER BY registros DESC
    ");
    $stmt->execute([$month]);
    respond(true, $stmt->fetchAll());
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
    ];
}

respondError('Acción no encontrada.', 404);