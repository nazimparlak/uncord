<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS, GET");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

$chatFile = 'chat_messages.json';
$maxMessages = 100;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['username']) || !isset($input['message'])) {
        echo json_encode(["status" => "error", "message" => "Eksik parametreler"]);
        exit;
    }

    $username = trim($input['username']);
    $message = trim($input['message']);

    if (empty($username) || empty($message)) {
        echo json_encode(["status" => "error", "message" => "Kullanıcı adı ve mesaj boş olamaz"]);
        exit;
    }

    if (strlen($username) > 20) {
        echo json_encode(["status" => "error", "message" => "Kullanıcı adı çok uzun"]);
        exit;
    }

    if (strlen($message) > 200) {
        echo json_encode(["status" => "error", "message" => "Mesaj çok uzun"]);
        exit;
    }

    // Mevcut mesajları oku
    $messages = [];
    if (file_exists($chatFile)) {
        $content = file_get_contents($chatFile);
        $messages = json_decode($content, true) ?: [];
    }

    // Yeni mesaj ekle
    $newMessage = [
        "id" => time() . '_' . uniqid(),
        "username" => htmlspecialchars($username, ENT_QUOTES, 'UTF-8'),
        "message" => htmlspecialchars($message, ENT_QUOTES, 'UTF-8'),
        "timestamp" => date('H:i')
    ];

    $messages[] = $newMessage;

    // Eski mesajları temizle (MAX_MESSAGES'den fazla olursa)
    if (count($messages) > $maxMessages) {
        $messages = array_slice($messages, -$maxMessages);
    }

    // Dosyaya kaydet
    file_put_contents($chatFile, json_encode($messages, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    echo json_encode(["status" => "success", "message" => $newMessage]);
    exit;
}

echo json_encode(["status" => "error", "message" => "Geçersiz istek"]);
?>

