import { NextRequest, NextResponse } from 'next/server';
import { image_search } from 'duckduckgo-images-api';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const serperApiKey = process.env.SERPER_API_KEY;

    // If Serper API key is available, try using Serper.dev first
    if (serperApiKey) {
      try {
        const response = await fetch('https://google.serper.dev/images', {
          method: 'POST',
          headers: {
            'X-API-KEY': serperApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            q: prompt,
            num: 6
          })
        });
        
        const data = await response.json();

        if (data.images && data.images.length > 0) {
          // Use thumbnailUrl for better reliability (bypasses hotlink protection/CORS)
          // Fallback to imageUrl if thumbnailUrl is not available
          const imageResults = data.images.map((item: any) => item.thumbnailUrl || item.imageUrl);
          return NextResponse.json({ images: imageResults });
        } else {
          console.warn('Serper.dev returned 0 results, falling back to DuckDuckGo.');
        }
      } catch (serperError: any) {
        console.warn('Serper.dev API failed, falling back to DuckDuckGo:', serperError.message);
      }
    }

    // Fallback: Use DuckDuckGo Image Search (Free, No API Key required)
    try {
      const results = await image_search({ query: prompt, moderate: true });
      const imageResults = results.slice(0, 6).map((r: any) => r.image);
      return NextResponse.json({ images: imageResults });
    } catch (ddgError: any) {
      console.error('DuckDuckGo search error:', ddgError);
      throw new Error('Gagal mencari gambar menggunakan layanan gratis. Silakan atur SERPER_API_KEY.');
    }

  } catch (error: any) {
    console.error('Image search error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
