import Groq from 'groq-sdk';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

// Initialize the Groq API client
const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
const groq = new Groq({ 
  apiKey: groqApiKey || '',
  dangerouslyAllowBrowser: true // Required for client-side usage in Vite
});

// For backward compatibility if any code still expects 'apiKey'
const apiKey = groqApiKey;

// System instructions to guide the AI's behavior as a Project Mentor
export const GLOBAL_SYSTEM_INSTRUCTION = `
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

App Navigation Help:
- /dashboard: Viewing their teams and recommendations.
- /profile: Managing skills and account.
- /teams: Browsing or joining open projects.
- /create-team: Starting a new project.
- /team/:id: Viewing a specific team's details.
- /team/:id/chat: Team group chat.
- /team/:id/tasks: Team kanban board.
`;

export const PROJECT_SYSTEM_INSTRUCTION = (projectData) => `
${GLOBAL_SYSTEM_INSTRUCTION}

CRITICAL CONTEXT: You are currently acting as the dedicated **Project Manager & Technical Lead** for this specific project:
- **Project Name**: ${projectData.teamName}
- **Description**: ${projectData.description}
- **Topic**: ${projectData.projectTopic}
- **Required Skills**: ${projectData.requiredSkills?.join(', ')}
- **Team Progress**: ${projectData.progress}% (${projectData.completedTasks} tasks completed out of ${projectData.totalTasks})

Your goal is to provide advice EXCLUSIVELY tailored to this project's goals, tech stack, and current progress. Be proactive in suggesting next steps based on the task board.
`;

/**
 * Initializes a "chat session". Since Groq is stateless, we just return an object 
 * that holds the history and system instructions.
 */
export const initializeMentorChat = (history = [], systemInstruction = GLOBAL_SYSTEM_INSTRUCTION) => {
  return {
    history: history,
    systemInstruction: systemInstruction
  };
};

export const generateMentorResponse = async (chatSession, message, fileData = null) => {
  try {
    if (!groqApiKey) {
      return "⚠️ Error: Groq API key is not configured.";
    }

    // Prepare content based on whether there's an image or extracted text (PDFs)
    let userContent = message;
    
    if (fileData && fileData.mimeType.startsWith('image/')) {
      userContent = [
        { type: "text", text: message },
        { 
          type: "image_url", 
          image_url: { url: `data:${fileData.mimeType};base64,${fileData.data}` } 
        }
      ];
    } else if (fileData && fileData.extractedText) {
      // For PDFs or text files, we append the content to the prompt
      userContent = `[ATTACHED DOCUMENT: ${fileData.name}]\n\nCONTENT:\n${fileData.extractedText}\n\nUSER MESSAGE: ${message}`;
    }

    // Prepare messages for Groq format
    const messages = [
      { role: "system", content: chatSession.systemInstruction || GLOBAL_SYSTEM_INSTRUCTION },
      ...chatSession.history.map(h => ({
        role: h.role === 'model' ? 'assistant' : 'user',
        content: h.parts[0].text
      })),
      { role: "user", content: userContent }
    ];

    // Note: Free tier Groq models have limited vision support. 
    // We've moved to Llama 4 Scout as the previous 3.2 vision model was decommissioned.
    const model = fileData ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile";

    const completion = await groq.chat.completions.create({
      messages: messages,
      model: model,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const responseText = completion.choices[0]?.message?.content || "";
    
    // Update local session history (optional but helps component if it reuses the object)
    chatSession.history.push({ role: 'user', parts: [{ text: message }] });
    chatSession.history.push({ role: 'model', parts: [{ text: responseText }] });

    return responseText;
  } catch (error) {
    console.error("Error generating mentor response:", error);
    return `⚠️ AI Error: ${error.message || "Unknown error during generation"}. Please ensure your Groq API key is valid.`;
  }
};

/**
 * Performs a diagnostic "Hello World" call to verify the API key is working.
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const testGeminiConnection = async () => {
  if (!groqApiKey) {
    return { success: false, message: "VITE_GROQ_API_KEY is missing in .env" };
  }

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "user", content: "Respond exactly with: 'SUCCESS'" }
      ],
      model: "llama-3.1-8b-instant",
    });
    const text = completion.choices[0]?.message?.content || "";
    
    if (text.includes("SUCCESS")) {
      return { success: true, message: "Groq API key is valid and connected!" };
    }
    return { success: false, message: "Groq connected but returned unexpected response." };
  } catch (error) {
    console.error("Diagnostic Error:", error);
    return { 
      success: false, 
      message: error.message || "Failed to connect to Groq API."
    };
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
