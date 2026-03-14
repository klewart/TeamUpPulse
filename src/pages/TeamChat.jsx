import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, Loader2, MessageSquare, AlertTriangle } from 'lucide-react';
import ChatWindow from '../components/ChatWindow';
import ChatInput from '../components/ChatInput';

const TeamChat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [team, setTeam] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 1. Real-time Access Check & Team Loading
  useEffect(() => {
    if (!currentUser || !id) return;

    setLoading(true);
    const teamRef = doc(db, 'teams', id);
    const unsubscribe = onSnapshot(teamRef, (teamSnap) => {
      if (!teamSnap.exists()) {
        setError("This team does not exist.");
        setLoading(false);
        return;
      }

      const teamData = { id: teamSnap.id, ...teamSnap.data() };
      
      // Security Check: Ensure user is a member
      if (!teamData.members?.includes(currentUser.uid)) {
        setError("Access Denied: You must be a member of this team to view the chat.");
        setLoading(false);
        return;
      }

      setTeam(teamData);
      setLoading(false);
    }, (err) => {
      console.error("Team data subscription error:", err);
      setError('Failed to load workspace updates: ' + err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, currentUser]);

  // 2. Real-time Firestore Listener for Messages
  useEffect(() => {
    // Only subscribe if team is loaded and access is granted
    if (!team || error) return;

    setLoading(true);
    const messagesRef = collection(db, 'teams', id, 'messages');
    
    // Query ordered by creation time ascending
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    // Subscribe to live updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = [];
      snapshot.forEach((doc) => {
        fetchedMessages.push({ id: doc.id, ...doc.data() });
      });
      setMessages(fetchedMessages);
      setLoading(false);
    }, (err) => {
      console.error("Chat subscription error:", err);
      setError("Lost connection to live chat. Please refresh.");
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [team, error, id]);

  // 3. Send Message Logic
  const handleSendMessage = async (text, file = null) => {
    if ((!text.trim() && !file) || !currentUser || !team) return;

    let fileData = null;

    try {
      if (file) {
        // Handle Cloudinary Upload
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
           alert("Cloudinary credentials missing in .env. Please check the setup instructions.");
           return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);

        // Fetch API for Cloudinary unsigned upload
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Cloudinary upload failed");
        }

        const data = await response.json();
        
        fileData = {
          fileUrl: data.secure_url,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size
        };
      }

      const messagesRef = collection(db, 'teams', id, 'messages');
      await addDoc(messagesRef, {
        text: text,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'Anonymous Member',
        createdAt: serverTimestamp(),
        attachment: fileData // Will be null if no file
      });

      // Create notifications for other team members
      const notificationPromises = (team.members || [])
        .filter((memberId) => memberId !== currentUser.uid)
        .map((memberId) =>
          addDoc(collection(db, 'notifications'), {
            userId: memberId,
            type: 'new_message',
            title: `New message from ${currentUser.name || 'a teammate'}`,
            message: `${currentUser.name || 'Someone'} sent a message in ${team.teamName}.`,
            link: `/team/${team.id}/chat`,
            isRead: false,
            createdAt: serverTimestamp()
          })
        );

      await Promise.all(notificationPromises);
    } catch (err) {
      console.error("Failed to send message:", err);
      throw err; // Re-throw to be handled by ChatInput
    }
  };

  if (error) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center max-w-md w-full">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Error</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-full bg-slate-900 text-white px-4 py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto md:px-6 lg:px-8 py-0 md:py-6 h-[calc(100vh-64px)] flex flex-col">
      {/* Workspace Header */}
      <div className="bg-white px-4 sm:px-6 py-4 flex items-center justify-between border-b md:border md:rounded-t-2xl border-gray-100 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
             <div className="bg-indigo-100 p-2.5 rounded-xl text-indigo-700 hidden sm:block">
                <MessageSquare className="w-5 h-5" />
             </div>
             <div>
                <h1 className="text-lg font-bold text-slate-900 leading-tight">
                  {team ? team.teamName : "Loading workspace..."}
                </h1>
                {team && (
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                    <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Live Chat
                  </p>
                )}
             </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white md:border-x md:border-gray-100 overflow-hidden relative shadow-sm h-full">
        <ChatWindow 
          messages={messages} 
          currentUserId={currentUser?.uid} 
          loading={loading && messages.length === 0} 
        />
        <div className="shrink-0 w-full mt-auto">
            <ChatInput 
            onSendMessage={handleSendMessage} 
            disabled={loading || !!error}
            />
        </div>
      </div>
      
       {/* Bottom rounded corners for desktop */}
      <div className="h-4 bg-white md:border md:border-t-0 border-gray-100 rounded-b-2xl hidden md:block shrink-0 shadow-sm" />
    </div>
  );
};

export default TeamChat;
