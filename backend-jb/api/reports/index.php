<?php
// ============================================================
// api/reports/index.php — VERSIÓN SEGURA
// ============================================================

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
    $mes = date('Y-m');

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

    // Tardanzas de hoy
    $stmt = $db->prepare("SELECT COUNT(*) FROM attendance_records WHERE date = ? AND status = 'Tardanza'");
    $stmt->execute([$today]);
    $tardanzasHoy = (int) $stmt->fetchColumn();

    // Tardanzas del mes
    $stmt = $db->prepare("SELECT COUNT(*) FROM attendance_records WHERE DATE_FORMAT(date, '%Y-%m') = ? AND status = 'Tardanza'");
    $stmt->execute([$mes]);
    $tardanzasMes = (int) $stmt->fetchColumn();

    // Faltas del mes
    $stmt = $db->prepare("SELECT COUNT(*) FROM attendance_records WHERE DATE_FORMAT(date, '%Y-%m') = ? AND status = 'Falta'");
    $stmt->execute([$mes]);
    $faltasMes = (int) $stmt->fetchColumn();

    // attendanceRate corregido
    $stmt = $db->prepare("SELECT COUNT(*) FROM attendance_records WHERE DATE_FORMAT(date, '%Y-%m') = ?");
    $stmt->execute([$mes]);
    $totalMes = (int) $stmt->fetchColumn();

    $stmt = $db->prepare("SELECT COUNT(*) FROM attendance_records WHERE DATE_FORMAT(date, '%Y-%m') = ? AND status IN ('Presente', 'Tardanza')");
    $stmt->execute([$mes]);
    $asistenciaMes = (int) $stmt->fetchColumn();

    $attendanceRate = $totalMes > 0
        ? round(($asistenciaMes / $totalMes) * 100, 1)
        : 0;

    // Distribución de estados hoy
    $stmt = $db->prepare("SELECT status, COUNT(*) as total FROM attendance_records WHERE date = ? GROUP BY status");
    $stmt->execute([$today]);
    $estadosHoy = [];
    foreach ($stmt->fetchAll() as $row) {
        $estadosHoy[$row['status']] = (int) $row['total'];
    }

    // Últimas 6 marcaciones
    $stmt = $db->prepare("SELECT * FROM attendance_records ORDER BY check_in DESC LIMIT 6");
    $stmt->execute([]);
    $recent = array_map('formatRecord', $stmt->fetchAll());

    // Colaboradores por área
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
        'attendanceRate' => $attendanceRate,
        'tardanzasHoy' => $tardanzasHoy,
        'tardanzasMes' => $tardanzasMes,
        'faltasMes' => $faltasMes,
        'estadosHoy' => [
            'Presente' => $estadosHoy['Presente'] ?? 0,
            'Tardanza' => $estadosHoy['Tardanza'] ?? 0,
            'Falta' => $estadosHoy['Falta'] ?? 0,
        ],
    ]);
}

// ─── EXPORT CSV ──────────────────────────────────────────────
if ($method === 'GET' && $action === 'export') {
    $dateFrom = $_GET['dateFrom'] ?? date('Y-m-01');
    $dateTo = $_GET['dateTo'] ?? date('Y-m-d');

    // ✅ Ambas usan validarFecha() centralizada
    if (!validarFecha($dateFrom))
        $dateFrom = date('Y-m-01');
    if (!validarFecha($dateTo))
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

    // ✅ Usa validarMes() centralizada
    if (!validarMes($month))
        $month = date('Y-m');

    $stmt = $db->prepare("
        SELECT u.area,
               COUNT(ar.id)                as registros,
               COUNT(DISTINCT ar.user_id)  as colaboradores,
               SUM(ar.status = 'Tardanza') as tardanzas,
               SUM(ar.status = 'Falta')    as faltas
        FROM attendance_records ar
        JOIN users u ON u.id = ar.user_id
        WHERE DATE_FORMAT(ar.date, '%Y-%m') = ?
        GROUP BY u.area
        ORDER BY registros DESC
    ");
    $stmt->execute([$month]);
    respond(true, $stmt->fetchAll());
}

// ─── HELPER ──────────────────────────────────────────────────
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