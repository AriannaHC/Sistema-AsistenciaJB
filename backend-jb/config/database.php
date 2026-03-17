<?php
date_default_timezone_set('America/Lima');
define('DB_HOST', 'localhost');
define('DB_NAME', 'asistencia_jb');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');
define('JWT_SECRET', 'asistencia-jb-clave-super-secreta-2024');
define('JWT_EXPIRY', 86400);

define('FRONTEND_URL', 'https://asistencia.consultoradeasesoriajb.com');

function getDB(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['success' => false, 'message' => 'Error de conexión a la base de datos.']));
        }
    }
    return $pdo;
}