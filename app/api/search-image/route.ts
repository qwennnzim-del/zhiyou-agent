import { NextRequest, NextResponse } from 'next/server';
import { image_search } from 'duckduckgo-images-api';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const serperApiKey = process.env.SERPER_API_KEY;
    // Menambahkan kata kunci untuk hasil yang lebih artistik dan berkualitas tinggi
    const enhancedPrompt = `${prompt} high quality professional photography 4k hd`;

    // 1. Prioritas Utama: Serper.dev (Google Search API - Seluruh Sumber)
    if (serperApiKey) {
      try {
        const response = await fetch('https://google.serper.dev/images', {
          method: 'POST',
          headers: {
            'X-API-KEY': serperApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            q: enhancedPrompt,
            num: 8, // Mengambil lebih banyak hasil
            gl: 'id', // Lokasi Indonesia untuk relevansi
            autocorrect: true
          })
        });
        
        const data = await response.json();

        if (data.images && data.images.length > 0) {
          // Mengambil URL gambar asli (high res)
          const imageResults = data.images.map((item: any) => item.imageUrl || item.thumbnailUrl);
          return NextResponse.json({ images: imageResults });
        }
      } catch (serperError: any) {
        console.warn('Serper.dev API failed:', serperError.message);
      }
    }

    // 2. Cadangan: DuckDuckGo (Gratis, Tanpa API Key)
    try {
      const results = await image_search({ query: enhancedPrompt, moderate: true });
      const imageResults = results.slice(0, 8).map((r: any) => r.image);
      
      if (imageResults.length > 0) {
        return NextResponse.json({ images: imageResults });
      }
    } catch (ddgError: any) {
      console.error('DuckDuckGo search error:', ddgError);
    }

    // 3. Upaya Terakhir: Jika semua gagal, gunakan Pollinations untuk "menghasilkan" gambar yang dicari
    // Ini memastikan user tidak pernah mendapatkan hasil kosong
    const seed = Math.floor(Math.random() * 1000000);
    const fallbackImage = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;
    
    return NextResponse.json({ 
      images: [fallbackImage],
      isAiGenerated: true,
      message: 'Kami tidak menemukan gambar di web, jadi kami membuatkan satu untuk Anda.'
    });

  } catch (error: any) {
    console.error('Image search error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
