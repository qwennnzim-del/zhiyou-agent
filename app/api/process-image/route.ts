import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { collection, query, where, orderBy, limit, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const tasksRef = collection(db, 'image_tasks');
    const q = query(tasksRef, where('status', '==', 'pending'), orderBy('createdAt', 'asc'), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json({ message: 'No pending tasks' });
    }

    const taskDoc = snapshot.docs[0];
    const taskData = taskDoc.data();

    await updateDoc(doc(db, 'image_tasks', taskDoc.id), { status: 'processing', startedAt: serverTimestamp() });

    try {
      const contents: any[] = [];
      contents.push({ text: `Generate a new, high-quality, realistic image based on this prompt: ${taskData.prompt}` });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: contents },
        config: {
          imageConfig: { aspectRatio: taskData.aspectRatio }
        }
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (imageUrl) {
        await updateDoc(doc(db, 'image_tasks', taskDoc.id), { 
          status: 'completed', 
          resultUrl: imageUrl,
          completedAt: serverTimestamp() 
        });
      } else {
        throw new Error('Failed to generate image');
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      await updateDoc(doc(db, 'image_tasks', taskDoc.id), { 
        status: 'failed', 
        error: error.message,
        failedAt: serverTimestamp() 
      });
    }

    return NextResponse.json({ taskId: taskDoc.id });
  } catch (error) {
    console.error('Worker error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
