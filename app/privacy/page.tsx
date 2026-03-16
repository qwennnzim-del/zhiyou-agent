import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-3xl shadow-sm border border-gray-100">
        <Link href="/login" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Login
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6 tracking-tight">Privacy Policy</h1>
        
        <div className="space-y-6 text-gray-600 leading-relaxed">
          <p className="text-sm">Terakhir diperbarui: {new Date().toLocaleDateString('id-ID')}</p>
          
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Pendahuluan</h2>
            <p>Ini adalah halaman contoh untuk Privacy Policy (Kebijakan Privasi). Anda dapat mengganti teks ini dengan dokumen hukum resmi aplikasi Anda nantinya. Kami menghargai privasi Anda dan berkomitmen untuk melindunginya melalui kepatuhan terhadap kebijakan ini.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Informasi yang Kami Kumpulkan</h2>
            <p>Kami mengumpulkan beberapa jenis informasi dari dan tentang pengguna Situs Web kami, termasuk informasi yang dengannya Anda dapat diidentifikasi secara pribadi, seperti nama, alamat pos, alamat email, nomor telepon, atau pengenal lain yang dengannya Anda dapat dihubungi secara online atau offline (&quot;informasi pribadi&quot;).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Bagaimana Kami Menggunakan Informasi Anda</h2>
            <p>Kami menggunakan informasi yang kami kumpulkan tentang Anda atau yang Anda berikan kepada kami, termasuk informasi pribadi apa pun, untuk menyajikan Situs Web kami dan isinya kepada Anda, untuk memberi Anda informasi, produk, atau layanan yang Anda minta dari kami, dan untuk memenuhi tujuan lain apa pun yang Anda berikan.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
