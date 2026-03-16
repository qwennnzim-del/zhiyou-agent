import { doc, collection, serverTimestamp, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export const addTask = async (userId: string, prompt: string, aspectRatio: string) => {
  const taskRef = doc(collection(db, 'image_tasks'));
  await setDoc(taskRef, {
    userId,
    prompt,
    aspectRatio,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return taskRef.id;
};

export const getTask = async (taskId: string) => {
  const taskDoc = await getDoc(doc(db, 'image_tasks', taskId));
  return taskDoc.exists() ? { id: taskDoc.id, ...taskDoc.data() } : null;
};
