import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Register with email and password
  const signup = async (email, password, name) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user document in firestore (ONE-TIME during signup)
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      name: name,
      email: email,
      bio: '',
      skills: [],
      github: '',
      linkedin: '',
      university: '',
      createdAt: new Date().toISOString()
    });

    return userCredential;
  };

  // Login with email and password
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Login with Google (Switching to Popup for better UI feedback)
  const googleSignIn = () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };

  // Password Reset
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  // Logout
  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // Cleanup previous listener immediately
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        // 1. Eagerly set current user to base auth state so UI can unlock immediately
        setCurrentUser(user);
        setLoading(false);

        const profileRef = doc(db, 'users', user.uid);

        try {
          // 2. Background Doc Check/Creation 
          const docSnap = await getDoc(profileRef);
          if (!docSnap.exists()) {
            await setDoc(profileRef, {
              uid: user.uid,
              name: user.displayName || 'User',
              email: user.email,
              bio: '',
              skills: [],
              createdAt: new Date().toISOString()
            });
          }

          // 3. Setup Real-time Profile Listener
          unsubscribeProfile = onSnapshot(profileRef, (snapshot) => {
            if (snapshot.exists()) {
              const profileData = snapshot.data();

              const newUser = {
                uid: user.uid,
                email: user.email,
                displayName: profileData.name || user.displayName || 'User',
                name: profileData.name || user.displayName || 'User',
                photoURL: profileData.photoURL || user.photoURL || null,
                ...profileData,
              };

              setCurrentUser(prevUser => {
                const hasChanged = !prevUser ||
                  prevUser.uid !== newUser.uid ||
                  prevUser.name !== newUser.name ||
                  prevUser.email !== newUser.email ||
                  prevUser.photoURL !== newUser.photoURL ||
                  JSON.stringify(prevUser.skills) !== JSON.stringify(newUser.skills);

                return hasChanged ? newUser : prevUser;
              });
            }
          }, (error) => {
            console.error("Profile listener error:", error);
          });
        } catch (error) {
          console.error("Auth init background error:", error);
        }
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    googleSignIn,
    logout,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          fontFamily: 'system-ui, sans-serif',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #4f46e5',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '20px'
          }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <h2 style={{ color: '#1e293b', margin: '0 0 8px 0', fontSize: '1.25rem' }}>Initializing TeamUpPulse...</h2>
          <p style={{ color: '#64748b', marginBottom: '24px', maxWidth: '300px' }}>Connecting to your secure workspace...</p>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};
