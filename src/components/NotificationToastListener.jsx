import React, { useEffect, useRef } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

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
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      limit(20) // Get more to sort locally
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitial.current) {
        isInitial.current = false;
        return;
      }

      const docChanges = snapshot.docChanges();
      // Sort changes by date if they have timestamps to process latest first
      const sortedChanges = [...docChanges].sort((a, b) => {
        const timeA = a.doc.data().createdAt?.toMillis() || 0;
        const timeB = b.doc.data().createdAt?.toMillis() || 0;
        return timeB - timeA;
      });

      sortedChanges.forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          
          // Suppression Logic: Don't show toast if user is already on the linked page
          // BUT: Always show for high-priority types like 'team_invite'
          const isCurrentPage = data?.link === location?.pathname;
          const isHighPriority = data?.type === 'team_invite';
          
          if (!data?.isRead && (!isCurrentPage || isHighPriority)) {
            toast(
              (t) => (
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-slate-900">{data?.title || 'Notification'}</span>
                  <span className="text-sm text-slate-500 line-clamp-2">{data?.message || ''}</span>
                </div>
              ),
              {
                duration: 4000,
                position: 'top-right',
                icon: '🔔',
                style: {
                  background: '#fff',
                  color: '#334155',
                  borderRadius: '16px',
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                  padding: '16px',
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
