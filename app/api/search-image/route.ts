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

    // If Google API keys are available, try using Google Custom Search first
    if (apiKey && cx) {
      try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(prompt)}&searchType=image&num=6`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (!data.error) {
          const imageResults = data.items?.map((item: any) => item.link) || [];
          if (imageResults.length > 0) {
            return NextResponse.json({ images: imageResults });
          } else {
            console.warn('Google Search returned 0 results, falling back to DuckDuckGo.');
          }
        } else {
          console.warn('Google Search API error, falling back to DuckDuckGo:', data.error.message);
        }
      } catch (googleError: any) {
        console.warn('Google Search API failed, falling back to DuckDuckGo:', googleError.message);
      }
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
