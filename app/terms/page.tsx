import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-3xl shadow-sm border border-gray-100">
        <Link href="/login" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Login
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-6 tracking-tight">Terms of Service</h1>
        
        <div className="space-y-6 text-gray-600 leading-relaxed">
          <p className="text-sm">Terakhir diperbarui: {new Date().toLocaleDateString('id-ID')}</p>
          
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Ketentuan Penggunaan</h2>
            <p>Ini adalah halaman contoh untuk Terms of Service (Syarat dan Ketentuan). Anda dapat mengganti teks ini dengan dokumen hukum resmi aplikasi Anda nantinya. Dengan mengakses dan menggunakan aplikasi ini, Anda menyetujui untuk terikat oleh syarat dan ketentuan ini.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Penggunaan Layanan</h2>
            <p>Anda setuju untuk menggunakan layanan ini hanya untuk tujuan yang sah dan dengan cara yang tidak melanggar hak orang lain, atau membatasi atau menghalangi penggunaan dan penikmatan layanan ini oleh orang lain.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Akun Pengguna</h2>
            <p>Untuk menggunakan fitur tertentu, Anda mungkin diminta untuk membuat akun. Anda bertanggung jawab untuk menjaga kerahasiaan informasi akun Anda dan semua aktivitas yang terjadi di bawah akun Anda.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
