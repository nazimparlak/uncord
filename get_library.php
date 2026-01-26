<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$dir = 'temp_mp3s/';
$files = [];

if (is_dir($dir)) {
    $mp3s = glob($dir . "*.mp3");
    // En yeni inen en üstte görünsün
    array_multisort(array_map('filemtime', $mp3s), SORT_DESC, $mp3s);

    foreach ($mp3s as $file) {
        $basename = basename($file);
        $metaPath = $dir . $basename . ".json";

        $title = $basename;
        $cover = "https://pixelamca.com/default-cover.jpg";

        if (file_exists($metaPath)) {
            $meta = json_decode(file_get_contents($metaPath), true);
            if (is_array($meta)) {
                $title = $meta['title'] ?? $title;
                $cover = $meta['cover'] ?? $cover;
            }
        }

        $files[] = [
            "id" => $basename,
            "title" => $title,
            "url" => "https://pixelamca.com/" . $file,
            "cover" => $cover
        ];
    }
}
echo json_encode($files);