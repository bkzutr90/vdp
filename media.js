/* ============ DATA MEDIA (dipakai index.html & gallery.html) ============
   Tambah / ubah foto dan video HANYA di file ini.
   Urutan array = urutan tampil. Item paling atas jadi prioritas di Highlight index.
   type video: "bareng" atau "sorrow"
====================================================================== */
const GALLERY = [
  { src: "gallery/8.png", caption: "" }, { src: "gallery/6.png", caption: "" },
  { src: "gallery/4.png", caption: "" }, { src: "gallery/2.png", caption: "" },
  { src: "gallery/7.png", caption: "" }, { src: "gallery/5.png", caption: "" },
  { src: "gallery/3.png", caption: "" }, { src: "gallery/1.png", caption: "" }
];

const CLIPS = [
  { src: "https://videotourl.com/videos/1790805081388-36033d46-c7a7-455d-8b1d-bbe1e53525bc.mp4", title: "Dagger Ngeden", type: "sorrow" },
  { src: "https://videotourl.com/videos/1790805129755-56fbfa56-58e9-4cce-bcb4-ba19b8a75503.mp4", title: "Lucc: Dagger Guweh tuh", type: "sorrow" },
  { src: "https://videotourl.com/videos/1790805145782-1421aebf-a76d-40f6-ba06-059a375eb08c.mp4", title: "Mau Escape Malah COD Killer", type: "sorrow" }
];

const TYPE_LABEL = { bareng: "Main Bareng", sorrow: "Sorrow Kompe" };

/* jumlah yang tampil di Highlight halaman utama */
const HIGHLIGHT_PHOTOS = 4;
const HIGHLIGHT_CLIPS = 2;
