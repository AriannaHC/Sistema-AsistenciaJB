<?php
// ============================================================
// helpers/functions.php - Utilidades JWT y respuestas
// ============================================================

require_once __DIR__ . '/../config/database.php';

// ------------------------------------------------------------
// CORS — Lista blanca de dominios permitidos
// ------------------------------------------------------------
$DOMINIOS_PERMITIDOS = [
    'https://asistencia.consultoradeasesoriajb.com',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
];

function setCorsHeaders(): void
{
    global $DOMINIOS_PERMITIDOS;
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (in_array($origin, $DOMINIOS_PERMITIDOS, true)) {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
    } else {
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(403);
            exit();
        }
    }

    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Access-Control-Max-Age: 86400");

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

// ------------------------------------------------------------
// Headers de seguridad HTTP
// ------------------------------------------------------------
function setSecurityHeaders(): void
{
    header("X-Content-Type-Options: nosniff");
    header("X-Frame-Options: DENY");
    header("X-XSS-Protection: 1; mode=block");
    header("Referrer-Policy: strict-origin-when-cross-origin");
    header("Content-Type: application/json; charset=UTF-8");
}

// ------------------------------------------------------------
// Respuestas JSON estandarizadas
// ------------------------------------------------------------
function respond(bool $success, $data = null, string $message = '', int $code = 200): void
{
    http_response_code($code);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data,
    ]);
    exit;
}

function respondError(string $message, int $code = 400): void
{
    respond(false, null, $message, $code);
}

// ------------------------------------------------------------
// JWT Simple (sin librería externa)
// ------------------------------------------------------------
function jwtEncode(array $payload): string
{
    $header = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload['iat'] = time();
    $payload['exp'] = time() + JWT_EXPIRY;
    $pay = base64url_encode(json_encode($payload));
    $sig = base64url_encode(hash_hmac('sha256', "$header.$pay", JWT_SECRET, true));
    return "$header.$pay.$sig";
}

function jwtDecode(string $token): ?array
{
    $parts = explode('.', $token);
    if (count($parts) !== 3)
        return null;

    [$header, $payload, $sig] = $parts;
    $expected = base64url_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));

    if (!hash_equals($expected, $sig))
        return null;

    $data = json_decode(base64url_decode($payload), true);
    if (!$data || $data['exp'] < time())
        return null;

    return $data;
}

function base64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string
{
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 3 - (3 + strlen($data)) % 4));
}

// ------------------------------------------------------------
// Obtener body JSON de la petición
// ------------------------------------------------------------
function getBody(): array
{
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

// ------------------------------------------------------------
// Generar UUID v4 — criptográficamente seguro
// ------------------------------------------------------------
function generateUUID(): string
{
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

// ------------------------------------------------------------
// Validaciones compartidas — auth y users
// ------------------------------------------------------------
$AREAS_PERMITIDAS = [
    'MARKETING DIGITAL',
    'DESARROLLO Y PROGRAMACIÓN WEB',
    'DISEÑO Y PRODUCCIÓN AUDIOVISUAL',
    'SECRETARÍA DE GERENCIA',
    'LEGAL',
    'PLANEAMIENTO ESTRATÉGICO',
    'SOMA',
    'PLANIFICACIÓN Y DESARROLLO DE EMPRESAS',
];

function validarEmail(string $email): bool
{
    return (bool) filter_var($email, FILTER_VALIDATE_EMAIL)
        && preg_match('/\.[a-zA-Z]{2,}$/', explode('@', $email)[1] ?? '');
}

function validarPassword(string $pass): bool
{
    return strlen($pass) >= 8
        && preg_match('/[A-Z]/', $pass)
        && preg_match('/[0-9]/', $pass)
        && preg_match('/[^a-zA-Z0-9]/', $pass);
}

function sanitizarTexto(string $texto): string
{
    return htmlspecialchars(strip_tags(trim($texto)), ENT_QUOTES, 'UTF-8');
}

// ------------------------------------------------------------
// ✅ Utilidades de fecha — centralizadas para todos los archivos
// ------------------------------------------------------------

// Traducir día de la semana al español
function diaEnEspanol(string $dayEnglish): string
{
    $dias = [
        'Monday' => 'Lunes',
        'Tuesday' => 'Martes',
        'Wednesday' => 'Miércoles',
        'Thursday' => 'Jueves',
        'Friday' => 'Viernes',
        'Saturday' => 'Sábado',
        'Sunday' => 'Domingo',
    ];
    return $dias[$dayEnglish] ?? $dayEnglish;
}

// Validar formato YYYY-MM-DD
function validarFecha(string $fecha): bool
{
    return (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha);
}

// Validar formato YYYY-MM
function validarMes(string $mes): bool
{
    return (bool) preg_match('/^\d{4}-\d{2}$/', $mes);
}