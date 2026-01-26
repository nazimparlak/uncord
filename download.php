<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Content-Type: application/json");

$save_dir = 'temp_mp3s/';
if (!file_exists($save_dir)) { mkdir($save_dir, 0777, true); }

if (isset($_GET['url'])) {
    $youtubeUrl = $_GET['url'];
    
    preg_match('%(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)([^"&?/ ]{11})%i', $youtubeUrl, $match);
    $videoId = $match[1] ?? null;

    if (!$videoId) {
        echo json_encode(["status" => "error", "message" => "Gecersiz link."]);
        exit;
    }

    $apiKey = "beff8b6756msh2c143afe9d9bdbbp1ac222jsn043bc116a0b0";
    $apiHost = "youtube-mp3-2025.p.rapidapi.com";

    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => "https://youtube-mp3-2025.p.rapidapi.com/v1/social/youtube/audio",
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => "POST",
        CURLOPT_POSTFIELDS => json_encode(["id" => $videoId]),
        CURLOPT_HTTPHEADER => [
            "Content-Type: application/json",
            "x-rapidapi-host: " . $apiHost,
            "x-rapidapi-key: " . $apiKey
        ],
    ]);

    $response = curl_exec($curl);
    $data = json_decode($response, true);
    curl_close($curl);

    // DEBUG ÇIKTISINA GÖRE GÜNCELLENEN KISIM:
    // API 'linkDownload' anahtarını kullanıyor
    $download_link = $data['linkDownload'] ?? $data['link'] ?? null;

    if ($download_link) {
        $file_name = "pixel_" . time() . ".mp3"; // Uzantı mp3 kalsa da olur, player oynatır.
        $local_path = $save_dir . $file_name;

        // İndirme işlemi
        $ch = curl_init($download_link);
        $fp = fopen($local_path, 'wb');
        curl_setopt($ch, CURLOPT_FILE, $fp);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // Bazı sunucularda SSL hatasını önlemek için
        curl_exec($ch);
        curl_close($ch);
        fclose($fp);

        // Meta bilgileri
        $title = $data['title'] ?? "YouTube Music";
        // Thumbnail varsa en sonuncusunu al
        $cover = null;
        if (isset($data['thumbnail']['thumbnails']) && is_array($data['thumbnail']['thumbnails'])) {
            $thumbs = $data['thumbnail']['thumbnails'];
            $cover = end($thumbs)['url'] ?? null;
        } elseif (isset($data['thumbnail'])) {
            $cover = is_string($data['thumbnail']) ? $data['thumbnail'] : null;
        }

        if (file_exists($local_path) && filesize($local_path) > 0) {
            $publicUrl = "https://pixelamca.com/" . $local_path;

            // Yan meta dosyası
            $meta = [
                "id" => $file_name,
                "title" => $title,
                "url" => $publicUrl,
                "cover" => $cover
            ];
            file_put_contents($save_dir . $file_name . ".json", json_encode($meta));

            // Müzik limiti kontrolü: 10'dan fazla olunca en eskisini sil (yeni indirilen dosya korunur)
            $allMp3s = glob($save_dir . "*.mp3");
            
            // Sadece .mp3 uzantılı dosyaları filtrele (diğer dosyaları ve dizinleri hariç tut)
            $allMp3s = array_values(array_filter($allMp3s, function($file) {
                return is_file($file) && pathinfo($file, PATHINFO_EXTENSION) === 'mp3';
            }));
            
            $totalCount = count($allMp3s);
            
            // Sadece 10'dan fazla olduğunda sil (10 veya daha az ise silme)
            if ($totalCount > 10) {
                // Dosyaları oluşturulma zamanına göre sırala (en eski önce)
                usort($allMp3s, function($a, $b) {
                    return filemtime($a) - filemtime($b);
                });
                
                // Silinecek dosya sayısı (10'dan fazla olanlar)
                $filesToDelete = $totalCount - 10;
                
                // En eski dosyaları sil (yeni indirilen dosya en son olduğu için korunur)
                for ($i = 0; $i < $filesToDelete; $i++) {
                    $oldestFile = $allMp3s[$i];
                    $oldestBasename = basename($oldestFile);
                    
                    // Yeni indirilen dosyayı asla silme (güvenlik kontrolü)
                    if ($oldestBasename === $file_name) {
                        continue;
                    }
                    
                    // MP3 dosyasını sil
                    if (file_exists($oldestFile) && is_file($oldestFile)) {
                        unlink($oldestFile);
                    }
                    
                    // Meta JSON dosyasını sil
                    $oldestMeta = $save_dir . $oldestBasename . ".json";
                    if (file_exists($oldestMeta) && is_file($oldestMeta)) {
                        unlink($oldestMeta);
                    }
                }
            }

            echo json_encode([
                "status" => "success",
                "mp3_url" => $publicUrl,
                "title" => $title,
                "cover" => $cover
            ]);
        } else {
            echo json_encode(["status" => "error", "message" => "Sunucu dosyayi indiremedi."]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Link alinamaz", "debug" => $data]);
    }
    exit;
}