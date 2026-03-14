import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult
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

  // Login with Google (Redirect Version for COOP stability)
  const googleSignIn = () => {
    const provider = new GoogleAuthProvider();
    return signInWithRedirect(auth, provider);
  };

  // Logout
  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    let unsubscribeProfile = null;

    // Handle redirect results on mount
    getRedirectResult(auth).catch((error) => {
      console.error("Google redirect result error:", error);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // Cleanup previous listener immediately
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        setLoading(true);
        const profileRef = doc(db, 'users', user.uid);
        
        try {
          // 1. Initial Doc Check/Creation 
          // (Handle Google users who might not have a doc yet)
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

          // 2. Setup Real-time Listener
          unsubscribeProfile = onSnapshot(profileRef, (snapshot) => {
            if (snapshot.exists()) {
              const profileData = snapshot.data();
              
              // Create a clean user object with strict priority
              // Firestore (site-uploaded) photoURL always wins over user.photoURL (Gmail icon)
              const newUser = { 
                uid: user.uid,
                email: user.email,
                displayName: profileData.name || user.displayName || 'User',
                name: profileData.name || user.displayName || 'User',
                photoURL: profileData.photoURL || user.photoURL || null,
                ...profileData, // Spread rest of Firestore data (bio, skills, etc.)
              };

              setCurrentUser(prevUser => {
                // Deep comparison to prevent identity churn
                const hasChanged = !prevUser || 
                  prevUser.uid !== newUser.uid ||
                  prevUser.name !== newUser.name ||
                  prevUser.email !== newUser.email ||
                  prevUser.photoURL !== newUser.photoURL ||
                  JSON.stringify(prevUser.skills) !== JSON.stringify(newUser.skills);
                
                return hasChanged ? newUser : prevUser;
              });
            } else {
              // Fallback to basic auth user if doc doesn't exist (unlikely due to check above)
              setCurrentUser({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'User',
                name: user.displayName || 'User',
                photoURL: user.photoURL || null
              });
            }
            setLoading(false);
          }, (error) => {
            console.error("Profile listener error:", error);
            setCurrentUser(user);
            setLoading(false);
          });
        } catch (error) {
          console.error("Auth init error:", error);
          setCurrentUser(user);
          setLoading(false);
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
    logout
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
          <p style={{ color: '#64748b', marginBottom: '24px', maxWidth: '300px' }}>Connecting to your secure workspace. This usually takes a second.</p>
          
          <button 
            onClick={() => setLoading(false)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              color: '#475569',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'all 0.2s'
            }}
          >
            Entering workspace anyway →
          </button>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};
