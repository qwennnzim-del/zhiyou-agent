import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { prompt, model, width, height, seed } = await req.json();

  try {
    let imageUrl = '';
    
    // Pollinations API (supports flux, kontext, etc.)
    const encodedPrompt = encodeURIComponent(prompt);
    // Map internal model names to Pollinations model names if needed
    const pollinationModel = model === 'flux-2-dev' || model === 'klein' ? 'flux' : model;
    
    imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=${pollinationModel}&apikey=${process.env.POLLINATIONS_API_KEY}`;

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
  }
}
