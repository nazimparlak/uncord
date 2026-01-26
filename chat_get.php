<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS, POST");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

$chatFile = 'chat_messages.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $messages = [];
    
    if (file_exists($chatFile)) {
        $content = file_get_contents($chatFile);
        $messages = json_decode($content, true) ?: [];
    }

    echo json_encode($messages);
    exit;
}

echo json_encode([]);
?>

