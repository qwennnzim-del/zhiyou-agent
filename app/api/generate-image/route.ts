import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { prompt, model, width, height, seed } = await req.json();

  try {
    let imageUrl = '';
    
    // Pollinations API (supports flux, turbo, etc.)
    const encodedPrompt = encodeURIComponent(prompt);
    
    // Map internal model names to Pollinations model names
    let pollinationModel = 'flux'; // Default
    if (model === 'kontext') pollinationModel = 'kontext';
    // Add other mappings as needed
    
    const apiKeyParam = process.env.POLLINATIONS_API_KEY ? `&apikey=${process.env.POLLINATIONS_API_KEY}` : '';
    imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=${pollinationModel}${apiKeyParam}`;

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}
