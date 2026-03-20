<?php
// ============================================================
// api/attendance/index.php — HORARIOS + ALMUERZO COMPLETO
// ============================================================

require_once __DIR__ . '/../../helpers/functions.php';
require_once __DIR__ . '/../../middleware/auth.php';

error_reporting(E_ERROR | E_PARSE);

setCorsHeaders();
setSecurityHeaders();

$method   = $_SERVER['REQUEST_METHOD'];
$action   = $_GET['action'] ?? '';
$authUser = requireAuth();
$db       = getDB();

function getDiaEspanol($dateString = 'now'): string
{
    $dias = [
        'Monday'    => 'Lunes',    'Tuesday'  => 'Martes',
        'Wednesday' => 'Miércoles','Thursday' => 'Jueves',
        'Friday'    => 'Viernes',  'Saturday' => 'Sábado',
        'Sunday'    => 'Domingo',
    ];
    return $dias[date('l', strtotime($dateString))] ?? date('l', strtotime($dateString));
}

// ─── MARCAR ENTRADA ──────────────────────────────────────────
if ($method === 'POST' && $action === 'checkin') {
    $today   = date('Y-m-d');
    $nowTime = new DateTime();

    $stmtSch = $db->prepare("
        SELECT s.id, s.type, s.time_in, s.time_out, s.tolerance_minutes, s.blocks
        FROM users u
        LEFT JOIN schedules s ON s.id = u.schedule_id
        WHERE u.id = ?
    ");
    $stmtSch->execute([$authUser['id']]);
    $schedule      = $stmtSch->fetch();
    $tieneHorario  = $schedule && !empty($schedule['id']) && $schedule['id'] !== 'default-schedule-id';
    $diaActualES   = getDiaEspanol('now');

    $stmt = $db->prepare("SELECT id, date FROM attendance_records WHERE user_id = ? AND check_out IS NULL ORDER BY check_in DESC LIMIT 1");
    $stmt->execute([$authUser['id']]);
    $jornadaActiva = $stmt->fetch();
    if ($jornadaActiva) {
        if ($jornadaActiva['date'] === $today) {
            respondError('Ya tienes una jornada activa hoy. Primero registra tu salida.');
        } else {
            respondError('Tienes una jornada sin cerrar del ' . $jornadaActiva['date'] . '. Primero registra tu salida pendiente.');
        }
    }

    $stmtC = $db->prepare("SELECT COUNT(*) FROM attendance_records WHERE user_id = ? AND date = ? AND check_out IS NOT NULL");
    $stmtC->execute([$authUser['id'], $today]);
    $turnosCompletados = (int) $stmtC->fetchColumn();

    $status = 'Presente';

    if ($tieneHorario) {
        $turnoAplica = null;
        if ($schedule['type'] === 'simple') {
            if ($turnosCompletados === 0 && !empty($schedule['time_in'])) {
                $turnoAplica = ['ingreso' => substr($schedule['time_in'], 0, 5)];
            }
        } elseif ($schedule['type'] === 'bloques') {
            $blocks = [];
            if (!empty($schedule['blocks'])) {
                $parsed = is_string($schedule['blocks']) ? json_decode($schedule['blocks'], true) : $schedule['blocks'];
                if (is_array($parsed)) $blocks = $parsed;
            }
            foreach ($blocks as $b) {
                if (isset($b['day']) && $b['day'] === $diaActualES) {
                    if (isset($b['turnos'], $b['turnos'][$turnosCompletados])) {
                        $turnoAplica = $b['turnos'][$turnosCompletados];
                    }
                    break;
                }
            }
        }

        if (!$turnoAplica || empty($turnoAplica['ingreso'])) {
            respondError('Ya has completado todos tus turnos programados para hoy o es tu día libre.');
        }

        $horaIngreso = DateTime::createFromFormat('Y-m-d H:i', $today . ' ' . $turnoAplica['ingreso']);
        if ($horaIngreso) {
            $limiteApertura = clone $horaIngreso;
            $limiteApertura->modify('-5 minutes');
            if ($nowTime < $limiteApertura) {
                respondError("Aún no puedes entrar. El botón se habilitará a las " . $limiteApertura->format('h:i A') . ".");
            }
            $tolerancia     = (int) ($schedule['tolerance_minutes'] ?? 0);
            $limiteTardanza = clone $horaIngreso;
            $limiteTardanza->modify("+{$tolerancia} minutes");
            if ($nowTime > $limiteTardanza) $status = 'Tardanza';
        }
    }

    // Traer lunch_limit y lunch_start_time del usuario
    $stmtU = $db->prepare("SELECT lunch_limit, lunch_start_time FROM users WHERE id = ?");
    $stmtU->execute([$authUser['id']]);
    $userRow        = $stmtU->fetch();
    $lunchLimit     = $userRow['lunch_limit']      ?? '13:00';
    $lunchStartTime = $userRow['lunch_start_time'] ?? '12:00';

    $id  = generateUUID();
    $now = $nowTime->format('Y-m-d H:i:s');

    $stmt = $db->prepare("
        INSERT INTO attendance_records (id, user_id, user_name, date, check_in, status, lunch_limit, lunch_start_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$id, $authUser['id'], $authUser['name'], $today, $now, $status, $lunchLimit, $lunchStartTime]);

    respond(true, [
        'id'             => $id,
        'userId'         => $authUser['id'],
        'userName'       => $authUser['name'],
        'date'           => $today,
        'checkIn'        => $now,
        'checkOut'       => null,
        'status'         => $status,
        'lunchStart'     => null,
        'lunchEnd'       => null,
        'lunchLimit'     => $lunchLimit,
        'lunchStartTime' => $lunchStartTime,
    ], $status === 'Tardanza' ? 'Entrada registrada con tardanza.' : 'Entrada registrada correctamente.', 201);
}

// ─── MARCAR SALIDA ───────────────────────────────────────────
if ($method === 'PUT' && $action === 'checkout') {
    $body     = getBody();
    $recordId = trim($body['id'] ?? '');
    if (!$recordId) respondError('ID de registro requerido.');

    $stmt = $db->prepare("SELECT * FROM attendance_records WHERE id = ? AND check_out IS NULL");
    $stmt->execute([$recordId]);
    $record = $stmt->fetch();
    if (!$record) respondError('Registro no encontrado o ya tiene salida registrada.');
    if ($record['lunch_start'] && !$record['lunch_end']) {
        respondError('Debes registrar el regreso del almuerzo antes de marcar la salida.');
    }

    $stmtSch = $db->prepare("SELECT s.id, s.type, s.time_out, s.blocks FROM users u LEFT JOIN schedules s ON s.id = u.schedule_id WHERE u.id = ?");
    $stmtSch->execute([$record['user_id']]);
    $schedule     = $stmtSch->fetch();
    $tieneHorario = $schedule && !empty($schedule['id']) && $schedule['id'] !== 'default-schedule-id';

    if ($tieneHorario) {
        $dateRec = $record['date'];
        if ($dateRec !== date('Y-m-d')) {
            $now  = date('Y-m-d H:i:s');
            $stmt = $db->prepare("UPDATE attendance_records SET check_out = ? WHERE id = ?");
            $stmt->execute([$now, $recordId]);
            respond(true, array_merge(formatRecord($record), ['checkOut' => $now]), 'Salida registrada correctamente.');
        }

        $diaActualES = getDiaEspanol($dateRec);
        $stmtC       = $db->prepare("SELECT COUNT(*) FROM attendance_records WHERE user_id = ? AND date = ? AND check_out IS NOT NULL");
        $stmtC->execute([$record['user_id'], $dateRec]);
        $turnosCompletados = (int) $stmtC->fetchColumn();

        $turnoAplica = null;
        if ($schedule['type'] === 'simple') {
            $turnoAplica = ['salida' => substr($schedule['time_out'], 0, 5)];
        } elseif ($schedule['type'] === 'bloques') {
            $blocks = [];
            if (!empty($schedule['blocks'])) {
                $parsed = is_string($schedule['blocks']) ? json_decode($schedule['blocks'], true) : $schedule['blocks'];
                if (is_array($parsed)) $blocks = $parsed;
            }
            foreach ($blocks as $b) {
                if (isset($b['day']) && $b['day'] === $diaActualES) {
                    if (isset($b['turnos'], $b['turnos'][$turnosCompletados])) {
                        $turnoAplica = $b['turnos'][$turnosCompletados];
                    }
                    break;
                }
            }
        }

        if ($turnoAplica && !empty($turnoAplica['salida'])) {
            $horaSalida = DateTime::createFromFormat('Y-m-d H:i', $dateRec . ' ' . $turnoAplica['salida']);
            if ($horaSalida) {
                $nowTime = new DateTime();
                if ($nowTime >= $horaSalida) {
                    $now  = date('Y-m-d H:i:s');
                    $stmt = $db->prepare("UPDATE attendance_records SET check_out = ? WHERE id = ?");
                    $stmt->execute([$now, $recordId]);
                    respond(true, array_merge(formatRecord($record), ['checkOut' => $now]), 'Salida registrada correctamente.');
                }
                $limiteSalida = clone $horaSalida;
                $limiteSalida->modify('-5 minutes');
                if ($nowTime < $limiteSalida) {
                    respondError("Aún no puedes salir. El botón se habilitará a las " . $limiteSalida->format('h:i A') . ".");
                }
            }
        }
    }

    $now  = date('Y-m-d H:i:s');
    $stmt = $db->prepare("UPDATE attendance_records SET check_out = ? WHERE id = ?");
    $stmt->execute([$now, $recordId]);
    respond(true, array_merge(formatRecord($record), ['checkOut' => $now]), 'Salida registrada correctamente.');
}

// ─── INICIAR ALMUERZO ─────────────────────────────────────────
if ($method === 'POST' && $action === 'lunch_start') {
    $today   = date('Y-m-d');
    $nowTime = new DateTime();

    $stmt = $db->prepare("SELECT * FROM attendance_records WHERE user_id = ? AND date = ? AND check_out IS NULL");
    $stmt->execute([$authUser['id'], $today]);
    $record = $stmt->fetch();

    if (!$record) respondError('No tienes una jornada activa hoy. Registra tu entrada primero.');
    if ($record['lunch_start']) respondError('El almuerzo ya fue iniciado hoy.');

    // Validar hora de inicio de almuerzo
    $lunchStartTime = $record['lunch_start_time'] ?? '12:00';
    if ($lunchStartTime) {
        $horaInicioAlmuerzo = DateTime::createFromFormat('Y-m-d H:i', $today . ' ' . $lunchStartTime);
        if ($horaInicioAlmuerzo && $nowTime < $horaInicioAlmuerzo) {
            respondError("Aún no es hora de almuerzo. Tu almuerzo comienza a las " . $horaInicioAlmuerzo->format('h:i A') . ".");
        }
    }

    $now  = date('Y-m-d H:i:s');
    $stmt = $db->prepare("UPDATE attendance_records SET lunch_start = ? WHERE id = ?");
    $stmt->execute([$now, $record['id']]);

    respond(true, [
        'id'             => $record['id'],
        'lunchStart'     => $now,
        'lunchLimit'     => $record['lunch_limit']      ?? '13:00',
        'lunchStartTime' => $record['lunch_start_time'] ?? '12:00',
    ], 'Almuerzo iniciado.');
}

// ─── FINALIZAR ALMUERZO ───────────────────────────────────────
if ($method === 'POST' && $action === 'lunch_end') {
    $today = date('Y-m-d');
    $stmt  = $db->prepare("SELECT * FROM attendance_records WHERE user_id = ? AND date = ? AND check_out IS NULL");
    $stmt->execute([$authUser['id'], $today]);
    $record = $stmt->fetch();

    if (!$record) respondError('No tienes una jornada activa hoy.');
    if (!$record['lunch_start']) respondError('No has iniciado el almuerzo aún.');
    if ($record['lunch_end']) respondError('El almuerzo ya fue finalizado hoy.');

    $now      = date('Y-m-d H:i:s');
    $tardanza = false;
    if (!empty($record['lunch_limit'])) {
        $limitDT  = date('Y-m-d') . ' ' . $record['lunch_limit'] . ':00';
        $tardanza = strtotime($now) > strtotime($limitDT);
    }

    $stmt = $db->prepare("UPDATE attendance_records SET lunch_end = ? WHERE id = ?");
    $stmt->execute([$now, $record['id']]);

    respond(true, [
        'id'             => $record['id'],
        'lunchStart'     => $record['lunch_start'],
        'lunchEnd'       => $now,
        'lunchLimit'     => $record['lunch_limit'],
        'lunchStartTime' => $record['lunch_start_time'] ?? '12:00',
        'tardanza'       => $tardanza,
    ], $tardanza ? 'Regresaste tarde del almuerzo.' : 'Regresaste a tiempo del almuerzo.');
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
    $userId   = trim($_GET['userId'] ?? '');
    $dateFrom = trim($_GET['dateFrom'] ?? '');
    $dateTo   = trim($_GET['dateTo'] ?? '');
    $search   = trim($_GET['search'] ?? '');
    $page     = max(1, (int)($_GET['page'] ?? 1));
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
    if ($search) {
        $s = sanitizarTexto($search); $where[] = 'user_name LIKE ?'; $params[] = "%$s%";
    }
    if ($dateFrom) {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom)) respondError('Formato de fecha inválido.', 400);
        $where[] = 'date >= ?'; $params[] = $dateFrom;
    }
    if ($dateTo) {
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo)) respondError('Formato de fecha inválido.', 400);
        $where[] = 'date <= ?'; $params[] = $dateTo;
    }

    $whereSQL = implode(' AND ', $where);
    $stmt     = $db->prepare("SELECT * FROM attendance_records WHERE $whereSQL ORDER BY check_in DESC LIMIT $limit OFFSET $offset");
    $stmt->execute($params);
    $stmtC = $db->prepare("SELECT COUNT(*) FROM attendance_records WHERE $whereSQL");
    $stmtC->execute($params);

    respond(true, [
        'records' => array_map('formatRecord', $stmt->fetchAll()),
        'total'   => (int)$stmtC->fetchColumn(),
        'page'    => $page,
        'limit'   => $limit,
    ]);
}

function formatRecord(array $r): array
{
    return [
        'id'             => $r['id'],
        'userId'         => $r['user_id'],
        'userName'       => $r['user_name'],
        'date'           => $r['date'],
        'checkIn'        => $r['check_in'],
        'checkOut'       => $r['check_out']        ?? null,
        'status'         => $r['status'],
        'location'       => $r['location']         ?? null,
        'lunchStart'     => $r['lunch_start']       ?? null,
        'lunchEnd'       => $r['lunch_end']         ?? null,
        'lunchLimit'     => $r['lunch_limit']       ?? null,
        'lunchStartTime' => $r['lunch_start_time']  ?? null,
    ];
}

respondError('Método no permitido.', 405);