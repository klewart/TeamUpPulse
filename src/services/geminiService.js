import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

// Initialize the Gemini API client
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenerativeAI({ apiKey: apiKey || '' });

// System instructions to guide the AI's behavior as a Project Mentor
const SYSTEM_INSTRUCTION = `
You are an expert AI Project Mentor for the TeamUpPulse platform. Your goal is to help students generate project ideas, plan projects, solve doubts, and guide them in completing projects successfully.
You should be encouraging, structured, informative, and student-friendly. Use markdown for better formatting.

When suggesting project ideas, always include:
- Project Title
- Project Description
- Problem Statement
- Required Skills
- Technologies / Tech Stack
- Key Features
- Difficulty Level

When providing project guidance (if a user provides an idea):
- Ask clarification questions to scope the project
- Suggest system architecture and a module breakdown
- Suggest UI/UX ideas
- Recommend tools and frameworks
- Suggest database structure

When answering doubts:
- Provide clear, concise explanations with code examples if applicable.
- Cover all areas including coding, frontend, backend, database design, API integration, Git/GitHub, debugging, and deployment.

When advising on project completion strategy:
- Provide a step-by-step development roadmap.
- Give a task breakdown, team collaboration strategies, time management tips, testing strategies, and documentation guidance.

Smart Suggestions:
- Always suggest possible project challenges, future improvements, optimization ideas, and similar successful project examples when relevant.
`;

/**
 * Initializes a chat session with the Gemini model.
 * 
 * @param {Array} history - Previous chat history in the format [{role: 'user'|'model', parts: [{text: '...'}]}]
 * @param {string} systemInstruction - Optional context to prepend/configure the model.
 * @returns {Object} The initialized chat session object.
 */
export const initializeMentorChat = (history = [], systemInstruction = SYSTEM_INSTRUCTION) => {
  if (!apiKey) {
    console.error("Gemini API key is missing. Please add VITE_GEMINI_API_KEY to your .env file.");
  }

  // Choose the model that supports chat and system instructions (gemini-1.5-flash is recommended for general chat)
  const model = ai.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction,
  });

  // Start chat with history
  const chatSession = model.startChat({
    history: history,
  });

  return chatSession;
};

/**
 * Generates a response from the AI Mentor.
 * 
 * @param {Object} chatSession - The active chat session initialized from `initializeMentorChat`.
 * @param {string} message - The user's input message.
 * @returns {Promise<string>} The AI's markdown response.
 */
export const generateMentorResponse = async (chatSession, message) => {
  try {
    if (!apiKey) {
      return "⚠️ Error: Gemini API key is not configured. Please add `VITE_GEMINI_API_KEY` to your environment variables.";
    }
    const result = await chatSession.sendMessage(message);
    return result.response.text();
  } catch (error) {
    console.error("Error generating mentor response:", error);
    return "I'm sorry, I encountered an error while trying to generate a response. Please try again later.";
  }
};

/**
 * Saves a chat message to Firestore under a user's `ai_chats` collection.
 * Creates a generic session if one doesn't exist, to group messages.
 */
export const saveChatMessage = async (userId, message) => {
  if (!userId) return null;
  try {
    // Use a single document for the main chat thread for simplicity, 
    // or a collection of messages. We'll use a subcollection `messages` under a `thread` document.
    const threadRef = doc(db, 'users', userId, 'ai_chats', 'primary_thread');

    // Ensure the thread document exists
    await setDoc(threadRef, { lastUpdated: serverTimestamp() }, { merge: true });

    const messagesRef = collection(threadRef, 'messages');
    const docRef = await addDoc(messagesRef, {
      ...message, // { role: 'user' | 'model', text: '...', timestamp: ... }
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving chat message:", error);
    return null;
  }
};

/**
 * Fetches the user's chat history from Firestore.
 */
export const fetchChatHistory = async (userId) => {
  if (!userId) return [];
  try {
    const messagesRef = collection(db, 'users', userId, 'ai_chats', 'primary_thread', 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return [];
  }
};

/**
 * Clears the user's chat history from Firestore.
 */
export const clearChatHistory = async (userId) => {
  if (!userId) return false;
  try {
    const messagesRef = collection(db, 'users', userId, 'ai_chats', 'primary_thread', 'messages');
    const snapshot = await getDocs(messagesRef);

    // Standard way to delete docs in a collection from client SDK
    const deletePromises = snapshot.docs.map(docSnapshot => {
      return deleteDoc(docSnapshot.ref);
    });
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error("Error clearing chat history:", error);
    return false;
  }
}

export const formatHistoryForGemini = (firestoreMessages) => {
  return firestoreMessages.map(msg => ({
    role: msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: msg.text }]
  }));
};
