import { NextResponse } from 'next/server';

export const maxDuration = 60; // Allow up to 60 seconds for image generation

export async function POST(req: Request) {
  const { prompt, model, width, height, seed } = await req.json();

  try {
    // Pollinations API (supports flux, turbo, etc.)
    const encodedPrompt = encodeURIComponent(prompt || "a beautiful artwork");
    
    // Map internal model names to Pollinations model names
    let pollinationModel = 'flux'; // Default to flux
    if (model === 'flux-realism') pollinationModel = 'flux-realism';
    if (model === 'flux-anime') pollinationModel = 'flux-anime';
    if (model === 'flux-3d') pollinationModel = 'flux-3d';
    if (model === 'turbo') pollinationModel = 'turbo';
    
    const apiKeyParam = process.env.POLLINATIONS_API_KEY ? `&apikey=${process.env.POLLINATIONS_API_KEY}` : '';
    
    const fetchImage = async (targetModel: string) => {
      const targetUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=${targetModel}${apiKeyParam}`;
      console.log("Generating image with URL:", targetUrl);
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Accept': 'image/jpeg, image/png, image/webp'
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Pollinations error (${targetModel}):`, response.status, errorText);
        throw new Error(`API returned ${response.status}`);
      }

      return response;
    };

    let response;
    try {
      response = await fetchImage(pollinationModel);
    } catch (e) {
      console.warn(`Primary model ${pollinationModel} failed, falling back to turbo...`);
      // Fallback to turbo if the primary model fails
      response = await fetchImage('turbo');
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    return NextResponse.json({ imageUrl: dataUrl });
  } catch (error: any) {
    console.error('Image generation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate image' }, { status: 500 });
  }
}
