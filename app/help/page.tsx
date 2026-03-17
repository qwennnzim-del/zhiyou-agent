import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col">
      <header className="flex-shrink-0 flex items-center p-4 bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors">
          <ArrowLeft className="w-5 h-5" /> Kembali ke Chat
        </Link>
      </header>
      
      <main className="max-w-3xl mx-auto px-6 py-12 md:py-16">
        <div className="prose prose-slate max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shadow-sm">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            Pusat Bantuan Zhiyou
          </h1>
          
          <div className="space-y-10 mt-10">
            <section>
              <h2 className="text-2xl font-semibold border-b pb-2 mb-4">Apa itu Zhiyou?</h2>
              <p>
                Zhiyou adalah asisten AI cerdas yang dirancang untuk membantu Anda dalam berbagai tugas, mulai dari menjawab pertanyaan, menganalisis dokumen, hingga menghasilkan ide kreatif. Dibangun dengan teknologi mutakhir, Zhiyou bertindak sebagai rekan kerja virtual Anda yang siap membantu kapan saja.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold border-b pb-2 mb-4">Bagaimana cara menggunakan Zhiyou?</h2>
              <p>
                Sangat mudah! Cukup ketikkan pertanyaan atau instruksi Anda di kotak teks di bagian bawah layar. Anda juga dapat melampirkan file (gambar, video, dokumen) dengan mengklik ikon <strong>+</strong>. Zhiyou akan memproses input Anda dan memberikan respons yang relevan.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold border-b pb-2 mb-4">Bagaimana cara kerja Zhiyou?</h2>
              <p>
                Zhiyou menggunakan model bahasa besar (Large Language Model) canggih dari Zent Technology. Saat Anda mengirim pesan, Zhiyou menganalisis konteks, mencari informasi yang relevan, dan menghasilkan teks atau analisis berdasarkan pola yang dipelajarinya dari jutaan data. Fitur multimodal kami memungkinkan AI untuk &quot;melihat&quot; dan memahami gambar serta dokumen yang Anda unggah.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold border-b pb-2 mb-4">Pembuatan Framework Zhiyou</h2>
              <p>
                Framework Zhiyou dibangun di atas arsitektur <strong>Next.js</strong> yang modern dan responsif, menggunakan <strong>React</strong> untuk antarmuka pengguna, dan <strong>Tailwind CSS</strong> untuk styling. Framework ini dirancang agar ringan, cepat, dan mudah diintegrasikan dengan berbagai API AI, memastikan pengalaman pengguna yang mulus tanpa jeda. Animasi halus didukung oleh <strong>Framer Motion</strong>.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold border-b pb-2 mb-4">Cara Login di Zhiyou</h2>
              <p>
                Saat ini, Zhiyou dapat digunakan secara langsung tanpa login untuk fitur dasar. Namun, untuk menyimpan riwayat percakapan dan mengakses fitur lanjutan, Anda dapat mengklik tombol <strong>Login</strong> di sudut kanan atas layar. Anda akan diarahkan ke halaman autentikasi aman menggunakan akun Google atau email Anda.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold border-b pb-2 mb-4">Cara mendapatkan fitur Pro Zhiyou</h2>
              <p>
                Fitur Pro memberikan akses ke model AI yang lebih kuat (seperti Zhiyou 3), batas unggahan file yang lebih besar, dan respons yang lebih cepat. Untuk berlangganan:
              </p>
              <ol className="list-decimal pl-5 space-y-2 mt-4">
                <li>Buka menu <strong>Pengaturan</strong> di sidebar kiri.</li>
                <li>Pilih tab <strong>Langganan</strong>.</li>
                <li>Pilih paket <strong>Zhiyou Pro</strong>.</li>
                <li>Lakukan pembayaran melalui kartu kredit atau e-wallet yang didukung.</li>
              </ol>
            </section>
          </div>
        </div>
      </main>
      
      <footer className="py-6 text-center text-sm text-gray-500 border-t border-gray-100 mt-auto">
        &copy;2026 Zhiyou AI | Zent Inc.
      </footer>
    </div>
  );
}
