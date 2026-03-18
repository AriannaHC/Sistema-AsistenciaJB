<?php
// ============================================================
// api/schedules/index.php — CRUD de Horarios
// ============================================================

require_once __DIR__ . '/../../helpers/functions.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();
setSecurityHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$targetId = $_GET['id'] ?? null;
$db = getDB();

// Solo admins pueden gestionar horarios
// Empleados pueden hacer GET para ver su horario asignado
$authUser = requireAuth();

// ─── LISTAR / VER ────────────────────────────────────────────
if ($method === 'GET') {

    // GET con ?id=xxx — devuelve un horario específico
    if ($targetId) {
        if (!preg_match('/^[a-zA-Z0-9\-]{5,36}$/', $targetId)) {
            respondError('ID de horario inválido.', 400);
        }

        $stmt = $db->prepare("SELECT * FROM schedules WHERE id = ?");
        $stmt->execute([$targetId]);
        $schedule = $stmt->fetch();

        if (!$schedule) {
            respondError('Horario no encontrado.', 404);
        }

        // Decodificar blocks si existe
        $schedule['blocks'] = $schedule['blocks']
            ? json_decode($schedule['blocks'], true)
            : null;

        respond(true, $schedule);
    }

    // GET sin id — lista todos (solo admin) o el propio horario (employee)
    if ($authUser['role'] === 'admin') {
        $stmt = $db->prepare("SELECT * FROM schedules ORDER BY name ASC");
        $stmt->execute([]);
        $schedules = $stmt->fetchAll();

        // Decodificar blocks en cada registro
        foreach ($schedules as &$s) {
            $s['blocks'] = $s['blocks'] ? json_decode($s['blocks'], true) : null;
        }

        respond(true, $schedules);
    }

    // Employee: devuelve solo su horario asignado
    $stmt = $db->prepare("
        SELECT s.* FROM schedules s
        INNER JOIN users u ON u.schedule_id = s.id
        WHERE u.id = ?
    ");
    $stmt->execute([$authUser['id']]);
    $schedule = $stmt->fetch();

    if (!$schedule) {
        respondError('No tienes un horario asignado.', 404);
    }

    $schedule['blocks'] = $schedule['blocks']
        ? json_decode($schedule['blocks'], true)
        : null;

    respond(true, $schedule);
}

// A partir de aquí solo admins
if ($authUser['role'] !== 'admin') {
    respondError('Acceso denegado. Se requiere rol de administrador.', 403);
}

// ─── CREAR ───────────────────────────────────────────────────
if ($method === 'POST') {
    $body = getBody();
    $name = sanitizarTexto($body['name'] ?? '');
    $type = trim($body['type'] ?? '');
    $tolerance = (int) ($body['tolerance_minutes'] ?? 10);

    // Validar campos base
    if (!$name) {
        respondError('El nombre del horario es requerido.');
    }

    if (strlen($name) < 3 || strlen($name) > 100) {
        respondError('El nombre debe tener entre 3 y 100 caracteres.');
    }

    if (!in_array($type, ['simple', 'bloques'], true)) {
        respondError('El tipo debe ser "simple" o "bloques".');
    }

    if ($tolerance < 0 || $tolerance > 120) {
        respondError('La tolerancia debe estar entre 0 y 120 minutos.');
    }

    $timeIn = null;
    $timeOut = null;
    $blocks = null;

    if ($type === 'simple') {
        // Validar time_in y time_out obligatorios
        $timeIn = trim($body['time_in'] ?? '');
        $timeOut = trim($body['time_out'] ?? '');

        if (!$timeIn || !$timeOut) {
            respondError('Para horario simple, time_in y time_out son obligatorios.');
        }

        // Validar formato HH:MM o HH:MM:SS
        if (
            !preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $timeIn) ||
            !preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $timeOut)
        ) {
            respondError('Formato de hora inválido. Use HH:MM o HH:MM:SS.');
        }

    } elseif ($type === 'bloques') {
        // Validar que blocks sea un JSON válido
        $blocksRaw = $body['blocks'] ?? null;

        if (!$blocksRaw || !is_array($blocksRaw)) {
            respondError('Para horario por bloques, el campo "blocks" (array) es obligatorio.');
        }

        // Validar estructura mínima de cada bloque
        foreach ($blocksRaw as $bloque) {
            if (!isset($bloque['day'])) {
                respondError('Cada bloque debe tener al menos el campo "day".');
            }
        }

        $blocks = json_encode($blocksRaw);
    }

    // Genera un ID corto de 6 caracteres aleatorios, ej: SCH-4F9A2B
    $id = 'SCH-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
    $stmt = $db->prepare("
        INSERT INTO schedules (id, name, type, time_in, time_out, tolerance_minutes, blocks)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$id, $name, $type, $timeIn, $timeOut, $tolerance, $blocks]);

    respond(true, [
        'id' => $id,
        'name' => $name,
        'type' => $type,
        'time_in' => $timeIn,
        'time_out' => $timeOut,
        'tolerance_minutes' => $tolerance,
        'blocks' => $blocksRaw ?? null,
    ], 'Horario creado correctamente.', 201);
}

// ─── EDITAR ──────────────────────────────────────────────────
if ($method === 'PUT' && $targetId) {

    if (!preg_match('/^[a-zA-Z0-9\-]{5,36}$/', $targetId)) {
        respondError('ID de horario inválido.', 400);
    }

    // Verificar que el horario existe
    $stmt = $db->prepare("SELECT * FROM schedules WHERE id = ?");
    $stmt->execute([$targetId]);
    $existing = $stmt->fetch();

    if (!$existing) {
        respondError('Horario no encontrado.', 404);
    }

    $body = getBody();
    $fields = [];
    $params = [];

    if (!empty($body['name'])) {
        $name = sanitizarTexto($body['name']);
        if (strlen($name) < 3 || strlen($name) > 100) {
            respondError('El nombre debe tener entre 3 y 100 caracteres.');
        }
        $fields[] = 'name = ?';
        $params[] = $name;
    }

    if (isset($body['tolerance_minutes'])) {
        $tolerance = (int) $body['tolerance_minutes'];
        if ($tolerance < 0 || $tolerance > 120) {
            respondError('La tolerancia debe estar entre 0 y 120 minutos.');
        }
        $fields[] = 'tolerance_minutes = ?';
        $params[] = $tolerance;
    }

    // Actualizar tipo y campos relacionados
    $type = $body['type'] ?? $existing['type'];

    if (isset($body['type'])) {
        if (!in_array($body['type'], ['simple', 'bloques'], true)) {
            respondError('El tipo debe ser "simple" o "bloques".');
        }
        $fields[] = 'type = ?';
        $params[] = $body['type'];
    }

    if ($type === 'simple') {
        if (!empty($body['time_in'])) {
            if (!preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $body['time_in'])) {
                respondError('Formato de time_in inválido.');
            }
            $fields[] = 'time_in = ?';
            $params[] = $body['time_in'];
        }
        if (!empty($body['time_out'])) {
            if (!preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $body['time_out'])) {
                respondError('Formato de time_out inválido.');
            }
            $fields[] = 'time_out = ?';
            $params[] = $body['time_out'];
        }
    }

    if ($type === 'bloques' && isset($body['blocks'])) {
        if (!is_array($body['blocks'])) {
            respondError('El campo "blocks" debe ser un array.');
        }
        foreach ($body['blocks'] as $bloque) {
            if (!isset($bloque['day'])) {
                respondError('Cada bloque debe tener al menos el campo "day".');
            }
        }
        $fields[] = 'blocks = ?';
        $params[] = json_encode($body['blocks']);
    }

    if (empty($fields)) {
        respondError('No hay campos para actualizar.');
    }

    $params[] = $targetId;
    $stmt = $db->prepare("UPDATE schedules SET " . implode(', ', $fields) . " WHERE id = ?");
    $stmt->execute($params);

    respond(true, null, 'Horario actualizado correctamente.');
}

// ─── ELIMINAR ────────────────────────────────────────────────
if ($method === 'DELETE' && $targetId) {

    if (!preg_match('/^[a-zA-Z0-9\-]{5,36}$/', $targetId)) {
        respondError('ID de horario inválido.', 400);
    }

    // Proteger el horario predeterminado
    if ($targetId === 'default-schedule-id') {
        respondError('No se puede eliminar el horario predeterminado.', 403);
    }

    // Verificar que existe
    $stmt = $db->prepare("SELECT id FROM schedules WHERE id = ?");
    $stmt->execute([$targetId]);
    if (!$stmt->fetch()) {
        respondError('Horario no encontrado.', 404);
    }

    // Reasignar usuarios al horario predeterminado antes de eliminar
    $stmt = $db->prepare("
        UPDATE users SET schedule_id = 'default-schedule-id'
        WHERE schedule_id = ?
    ");
    $stmt->execute([$targetId]);

    $stmt = $db->prepare("DELETE FROM schedules WHERE id = ?");
    $stmt->execute([$targetId]);

    respond(true, null, 'Horario eliminado correctamente. Los usuarios asignados fueron movidos al horario predeterminado.');
}

respondError('Método no permitido.', 405);