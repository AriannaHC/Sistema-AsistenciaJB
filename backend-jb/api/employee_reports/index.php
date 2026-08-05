<?php
// ============================================================
// api/employee_reports/index.php
// ============================================================

require_once __DIR__ . '/../../helpers/functions.php';
require_once __DIR__ . '/../../middleware/auth.php';

setCorsHeaders();
setSecurityHeaders();

$method   = $_SERVER['REQUEST_METHOD'];
$authUser = requireAuth();
$db       = getDB();

// ─── GET: LISTAR REPORTES (ADMIN) ─────────────────────────────
if ($method === 'GET') {
    if ($authUser['role'] !== 'admin') {
        respondError('Acceso denegado. Se requiere rol de administrador.', 403);
    }

    $page   = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $limit  = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 10;
    $search = $_GET['search'] ?? '';
    $estado = $_GET['estado'] ?? '';
    
    $offset = ($page - 1) * $limit;
    
    $where = [];
    $params = [];
    
    if (!empty($search)) {
        $where[] = "(user_name LIKE ? OR area LIKE ? OR categoria LIKE ?)";
        $searchParam = "%{$search}%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }
    
    if (!empty($estado)) {
        $where[] = "estado = ?";
        $params[] = $estado;
    }
    
    $whereClause = count($where) > 0 ? 'WHERE ' . implode(' AND ', $where) : '';
    
    // Total count
    $stmtTotal = $db->prepare("SELECT COUNT(*) FROM employee_reports $whereClause");
    $stmtTotal->execute($params);
    $total = (int)$stmtTotal->fetchColumn();
    
    // Fetch records
    $query = "SELECT * FROM employee_reports $whereClause ORDER BY created_at DESC LIMIT $limit OFFSET $offset";
    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    
    $reports = [];
    foreach ($rows as $row) {
        $reports[] = [
            'id'          => $row['id'],
            'userId'      => $row['user_id'],
            'userName'    => $row['user_name'],
            'area'        => $row['area'],
            'categoria'   => $row['categoria'],
            'descripcion' => $row['descripcion'],
            'foto1'       => $row['foto1'],
            'foto2'       => $row['foto2'],
            'foto3'       => $row['foto3'],
            'estado'      => $row['estado'],
            'notaAdmin'   => $row['nota_admin'],
            'createdAt'   => $row['created_at'],
            'updatedAt'   => $row['updated_at']
        ];
    }
    
    respond(true, [
        'reports' => $reports,
        'total'   => $total
    ]);
}

// ─── POST: CREAR REPORTE (COLABORADOR) ────────────────────────
if ($method === 'POST') {
    $categoria = $_POST['categoria'] ?? '';
    $descripcion = $_POST['descripcion'] ?? '';
    
    if (empty($categoria) || empty($descripcion)) {
        respondError('La categoría y la descripción son obligatorias.', 400);
    }
    
    $id = generateUUID();
    $fotos = [null, null, null];
    
    $uploadDir = __DIR__ . '/../../uploads/reports/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $scriptName = $_SERVER['SCRIPT_NAME']; 
    $basePath = explode('/api/', $scriptName)[0]; 
    
    for ($i = 1; $i <= 3; $i++) {
        $key = 'foto' . $i;
        if (isset($_FILES[$key]) && $_FILES[$key]['error'] === UPLOAD_ERR_OK) {
            $tmpPath = $_FILES[$key]['tmp_name'];
            $ext = pathinfo($_FILES[$key]['name'], PATHINFO_EXTENSION);
            $fileName = generateUUID() . '.' . $ext;
            $destPath = $uploadDir . $fileName;
            
            if (move_uploaded_file($tmpPath, $destPath)) {
                $fotos[$i - 1] = $protocol . '://' . $host . $basePath . '/uploads/reports/' . $fileName;
            }
        }
    }
    
    $stmt = $db->prepare("
        INSERT INTO employee_reports 
        (id, user_id, user_name, area, categoria, descripcion, foto1, foto2, foto3, estado, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', NOW(), NOW())
    ");
    
    $success = $stmt->execute([
        $id,
        $authUser['id'],
        $authUser['name'],
        $authUser['area'],
        $categoria,
        $descripcion,
        $fotos[0],
        $fotos[1],
        $fotos[2]
    ]);
    
    if ($success) {
        respond(true, ['id' => $id], 'Reporte enviado correctamente.');
    } else {
        respondError('No se pudo guardar el reporte.', 500);
    }
}

// ─── PUT: ACTUALIZAR REPORTE (ADMIN) ──────────────────────────
if ($method === 'PUT') {
    if ($authUser['role'] !== 'admin') {
        respondError('Acceso denegado.', 403);
    }
    
    $data = getBody();
    
    if (!isset($data['id'], $data['estado'])) {
        respondError('Faltan datos obligatorios.', 400);
    }
    
    $id = $data['id'];
    $estado = $data['estado'];
    $nota_admin = $data['nota_admin'] ?? null;
    
    $stmt = $db->prepare("UPDATE employee_reports SET estado = ?, nota_admin = ?, updated_at = NOW() WHERE id = ?");
    $success = $stmt->execute([$estado, $nota_admin, $id]);
    
    if ($success) {
        respond(true, ['message' => 'Reporte actualizado correctamente.']);
    } else {
        respondError('No se pudo actualizar el reporte.', 500);
    }
}

respondError('Método no soportado.', 405);
