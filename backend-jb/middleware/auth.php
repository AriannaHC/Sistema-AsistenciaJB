<?php
// ============================================================
// middleware/auth.php
// ============================================================

require_once __DIR__ . '/../helpers/functions.php';

function getAuthToken(): string
{
    if (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
        return trim($_SERVER['HTTP_AUTHORIZATION']);
    }
    if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        return trim($_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
    }
    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (!empty($headers['Authorization'])) {
            return trim($headers['Authorization']);
        }
        if (!empty($headers['authorization'])) {
            return trim($headers['authorization']);
        }
    }
    return '';
}

function requireAuth(): array
{
    $header = getAuthToken();

    if (!$header || !str_starts_with($header, 'Bearer ')) {
        respondError('Token no proporcionado.', 401);
    }

    $token = substr($header, 7);

    if (strlen($token) > 2048) {
        respondError('Token inválido.', 401);
    }

    if (!preg_match('/^[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+$/', $token)) {
        respondError('Token inválido.', 401);
    }

    $payload = jwtDecode($token);

    if (!$payload) {
        respondError('Token inválido o expirado.', 401);
    }

    if (empty($payload['id']) || !is_string($payload['id'])) {
        respondError('Token inválido.', 401);
    }

    if (!preg_match('/^[a-zA-Z0-9\-]{5,36}$/', $payload['id'])) {
        respondError('Token inválido.', 401);
    }

    $db = getDB();
    $stmt = $db->prepare("
        SELECT id, name, email, role, area, status, avatar, schedule_id
        FROM users
        WHERE id = ? AND status = 'active'
    ");
    $stmt->execute([$payload['id']]);
    $user = $stmt->fetch();

    if (!$user) {
        respondError('Usuario no encontrado o inactivo.', 401);
    }

    return $user;
}

function requireAdmin(): array
{
    $user = requireAuth();
    if ($user['role'] !== 'admin') {
        respondError('Acceso denegado. Se requiere rol de administrador.', 403);
    }
    return $user;
}