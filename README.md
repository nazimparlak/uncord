# Uncord - Modern Music Player & YouTube Downloader

![Uncord Music Player](https://placehold.co/600x400/trasparent/purple?font=ralaway&text=Uncord+Music+Player)

## [TR] Proje Hakkında
**Uncord**, React 19 ve Vite ile geliştirilmiş, estetik ve yüksek performanslı bir web tabanlı müzik çalar ve YouTube indiricisidir. Dinamik görselleştiriciler (visualizer), gerçek zamanlı sohbet ve akıcı bir arayüz ile premium bir kullanıcı deneyimi sunar.

### 🚀 Özellikler
- **Dinamik Görselleştirici**: Müzik frekansına gerçek zamanlı tepki veren, etkileşimli "Orb" efekti.
- **YouTube Entegrasyonu**: YouTube linklerini doğrudan MP3 olarak indirme ve kütüphaneye ekleme.
- **Otomatik Kütüphane Yönetimi**: İndirilen parçalar otomatik olarak listelenir ve sunucu alanını korumak için en yeni 10 parça tutulacak şekilde otomatik temizlenir.
- **Gelişmiş Ses Kontrolü**: Yumuşak ses geçişleri (fade-in/fade-out) ve hassas ses seviyesi ayarı.
- **Canlı Sohbet**: Uygulama içinden diğer kullanıcılarla gerçek zamanlı mesajlaşma.
- **Modern Tasarım**: Karanlık mod odaklı, "Glassmorphism" estetiğine sahip ve duyarlı (responsive) arayüz.

### 🛠️ Kullanılan Teknolojiler
- **Frontend**: React 19, Vite, Tailwind CSS
- **İkonlar**: Lucide React, React Icons
- **Backend**: PHP (CURL, JSON API)
- **API**: YouTube-MP3-2025 (RapidAPI)
- **Görselleştirme**: Web Audio API & CSS Animations

---

## [EN] About the Project
**Uncord** is a high-performance, aesthetically pleasing web-based music player and YouTube downloader. Built with React 19 and Vite, it offers a premium user experience with dynamic visualizers, real-time chat, and a seamless interface.

### 🚀 Features
- **Dynamic Visualizer**: An interactive "Orb" visualizer that reacts to music frequency in real-time.
- **YouTube Integration**: Search and download audio directly from YouTube links.
- **Smart Library Management**: Downloaded tracks are automatically listed, with an auto-cleanup feature that retains the latest 10 tracks.
- **Premium Audio Logic**: Smooth volume transitions (fade-in/fade-out) and precise volume control.
- **Live Chat**: Real-time messaging community with custom usernames.
- **Modern UI**: Dark-mode focused, glassmorphism design with sleek animations and responsive layout.

### 🛠️ Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS
- **Icons**: Lucide React, React Icons
- **Backend**: PHP (CURL, JSON API)
- **API**: YouTube-MP3-2025 (RapidAPI)
- **Visualization**: Web Audio API & CSS Animations

---

## 📦 Kurulum / Installation

### Gereksinimler / Requirements
- Node.js (v18+)
- PHP (v7.4+)
- Web Server (Apache/Nginx)

### Adımlar / Steps
1. Projeyi klonlayın / Clone the repository:
   ```bash
   git clone https://github.com/nazimparlak/uncord.git
   ```
2. Frontend bağımlılıklarını yükleyin / Install frontend dependencies:
   ```bash
   npm install
   ```
3. PHP dosyalarını web sunucunuza aktarın ve `temp_mp3s/` dizinine yazma izni verin.
   Upload PHP files to your web server and grant write permissions to the `temp_mp3s/` directory.

4. Geliştirme sunucusunu başlatın / Start the development server:
   ```bash
   npm run dev
   ```

## 📄 Lisans / License
Bu proje MIT lisansı altında lisanslanmıştır. / This project is licensed under the MIT License.
