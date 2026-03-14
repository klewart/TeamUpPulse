import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

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
    
    // Create use document in firestore
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

  // Login with Google
  const googleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Check if user document exists, if not, create one
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        name: user.displayName || 'Google User',
        email: user.email,
        bio: '',
        skills: [],
        github: '',
        linkedin: '',
        university: '',
        createdAt: new Date().toISOString()
      });
    }
    
    return result;
  };

  // Logout
  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    let unsubscribeProfile = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Listen to profile changes in Firestore
        const profileRef = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(profileRef, (doc) => {
          if (doc.exists()) {
            const profileData = doc.data();
            // Source of truth: Firestore profile data overwrites Firebase Auth metadata
            setCurrentUser({ 
              ...user, 
              ...profileData,
              // Only use site-uploaded photoURL from Firestore
              photoURL: profileData.photoURL || null
            });
          } else {
            setCurrentUser(user);
          }
          setLoading(false);
        });
      } else {
        unsubscribeProfile();
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeProfile();
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
      {!loading && children}
    </AuthContext.Provider>
  );
};
