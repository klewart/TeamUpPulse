import React, { useEffect, useRef } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { playNotificationSound } from '../utils/soundUtils';

/**
 * Headless component that listens for new notifications in Firestore
 * and triggers a toast notification pop-up.
 */
const NotificationToastListener = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const isInitial = useRef(true);

  useEffect(() => {
    if (!currentUser) return;

    const notifRef = collection(db, 'notifications');
    // Simplified query to bypass composite index requirement
    const q = query(
      notifRef,
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Use pending snapshot metadata to ignore initial bulk load
      if (snapshot.metadata.hasPendingWrites) return;
      
      if (isInitial.current) {
        isInitial.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();

          // SUPPRESSION LOGIC: Don't show toast if user is already on the target page
          // This prevents annoying toasts for the chat you are actively reading.
          const isCurrentActivePage = data.link === location.pathname;
          
          if (!data?.isRead && !isCurrentActivePage) {
            console.log("🔔 Toasting new notification:", data);
            try {
              playNotificationSound();
            } catch (e) {
              console.error("🔇 Sound failed:", e);
            }
            toast.success(
              `${data?.title}: ${data?.message}`,
              {
                duration: 5000,
                position: 'top-right',
                icon: '🔔',
                style: {
                  background: '#1e293b',
                  color: '#fff',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '500',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
                },
              }
            );
          }
        }
      });
    }, (error) => {
      console.error("Notification Toast Listener Error:", error);
      // Don't toast errors to user, just log them silently
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  return null; // Headless component
};

export default NotificationToastListener;
