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
      notifRef,
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitial.current) {
        isInitial.current = false;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          
          // Suppression Logic: Don't show toast if user is already on the linked page
          const isCurrentPage = data.link === location.pathname;
          
          if (!data.isRead && !isCurrentPage) {
            toast(
              (t) => (
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-slate-900">{data.title}</span>
                  <span className="text-sm text-slate-500 line-clamp-2">{data.message}</span>
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
    });

    return () => unsubscribe();
  }, [currentUser]);

  return null; // Headless component
};

export default NotificationToastListener;
