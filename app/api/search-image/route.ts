import { NextRequest, NextResponse } from 'next/server';
import { image_search } from 'duckduckgo-images-api';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;

    // If Google API keys are available, use Google Custom Search
    if (apiKey && cx) {
      const url = `https://customsearch.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(prompt)}&searchType=image&num=6`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Google Search API error');
      }

      const imageResults = data.items?.map((item: any) => item.link) || [];
      return NextResponse.json({ images: imageResults });
    }

    // Fallback: Use DuckDuckGo Image Search (Free, No API Key required)
    try {
      const results = await image_search({ query: prompt, moderate: true });
      const imageResults = results.slice(0, 6).map((r: any) => r.image);
      return NextResponse.json({ images: imageResults });
    } catch (ddgError: any) {
      console.error('DuckDuckGo search error:', ddgError);
      throw new Error('Gagal mencari gambar menggunakan layanan gratis. Silakan atur GOOGLE_SEARCH_API_KEY.');
    }

  } catch (error: any) {
    console.error('Image search error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
