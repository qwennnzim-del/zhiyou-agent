import React from 'react';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-zinc-900 p-8 md:p-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">Tentang Zhiyou AI</h1>
        
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Visi Kami</h2>
          <p className="text-lg text-zinc-700 leading-relaxed">
            Zhiyou AI hadir sebagai solusi cerdas untuk membantu produktivitas dan kreativitas Anda. 
            Kami percaya bahwa teknologi kecerdasan buatan harus dapat diakses oleh siapa saja, 
            aman digunakan, dan memberikan dampak positif bagi kehidupan sehari-hari.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Pengembang</h2>
          <p className="text-lg text-zinc-700 leading-relaxed mb-4">
            Zhiyou AI dikembangkan oleh <strong>M Fariz Alfauzi</strong>, seorang AI Engineer yang berdedikasi 
            dalam menciptakan solusi teknologi inovatif. Proyek ini merupakan bagian dari visi 
            <strong> Zent Technology GH</strong> untuk menghadirkan teknologi masa depan ke tangan pengguna di Indonesia.
          </p>
          <p className="text-lg text-zinc-700 leading-relaxed">
            Berbasis di Karawang, Jawa Barat, kami berkomitmen untuk terus mengembangkan Zhiyou AI 
            agar menjadi asisten virtual yang lebih pintar, lebih cepat, dan lebih memahami kebutuhan pengguna.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Teknologi</h2>
          <p className="text-lg text-zinc-700 leading-relaxed">
            Zhiyou AI dibangun menggunakan teknologi mutakhir dari Google Gemini, memastikan 
            respons yang cepat, akurat, dan aman. Kami mengutamakan privasi pengguna dan 
            keamanan data dalam setiap fitur yang kami luncurkan.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Hubungi Kami</h2>
          <p className="text-lg text-zinc-700 leading-relaxed">
            Kami sangat menghargai masukan Anda. Jika Anda memiliki pertanyaan, saran, 
            atau ingin berkolaborasi, silakan hubungi kami melalui saluran resmi 
            Zent Technology GH.
          </p>
        </section>
      </div>
    </main>
  );
}
