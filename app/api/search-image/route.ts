import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !cx) {
      return NextResponse.json({ error: 'Search API configuration missing. Please set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID in your environment variables.' }, { status: 500 });
    }

    // Call Google Custom Search JSON API
    // searchType=image ensures we only get image results
    // num=6 limits the results to 6 images
    const url = `https://customsearch.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(prompt)}&searchType=image&num=6`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'Google Search API error');
    }

    const imageResults = data.items?.map((item: any) => item.link) || [];

    return NextResponse.json({ images: imageResults });
  } catch (error: any) {
    console.error('Image search error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
