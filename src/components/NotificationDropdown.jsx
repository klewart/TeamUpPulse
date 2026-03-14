import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Bell, Check, UserPlus, MessageSquare, Info, ListTodo, CheckCircle2, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const NotificationDropdown = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch notifications with active chat suppression
  useEffect(() => {
    if (!currentUser) return;

    const notifRef = collection(db, 'notifications');
    const q = query(
      notifRef,
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetched = [];
      let unread = 0;

      const suppressionTasks = [];

      snapshot.forEach((snapshotDoc) => {
        const data = snapshotDoc.data();
        const notificationId = snapshotDoc.id;

        // Active Chat Suppression Logic:
        // If it's a message from the current team chat page the user is on,
        // mark it as read immediately and don't count it as unread.
        const isCurrentChatPage = data.type === 'new_message' && data.link === location.pathname;

        if (isCurrentChatPage && !data.isRead) {
          // Auto-mark as read in the background
          suppressionTasks.push(updateDoc(doc(db, 'notifications', notificationId), { isRead: true }));
          fetched.push({ id: notificationId, ...data, isRead: true });
        } else {
          fetched.push({ id: notificationId, ...data });
          if (!data.isRead) unread++;
        }
      });

      if (suppressionTasks.length > 0) {
        try {
          await Promise.all(suppressionTasks);
        } catch (err) {
          console.error("Failed to auto-suppress notifications", err);
        }
      }

      setNotifications(fetched.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      }));
      setUnreadCount(unread);
    }, (error) => {
      console.error("Error fetching notifications. Check Firestore Rules.", error);
    });

    return () => unsubscribe();
  }, [currentUser, location.pathname]);

  const handleNotificationClick = async (notification) => {
    // 1. Mark as read
    if (!notification.isRead) {
      try {
        await updateDoc(doc(db, 'notifications', notification.id), {
          isRead: true
        });
      } catch (err) {
        console.error("Failed to mark notification read", err);
      }
    }

    // 2. Navigate if there's a link
    if (notification.link) {
      navigate(notification.link);
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;

    try {
      const batch = writeBatch(db);
      notifications.forEach((notif) => {
        if (!notif.isRead) {
          const ref = doc(db, 'notifications', notif.id);
          batch.update(ref, { isRead: true });
        }
      });
      await batch.commit();
    } catch (err) {
      console.error("Failed to mark all read", err);
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'join_request':
      case 'team_invite': return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'request_accepted': return <Check className="w-5 h-5 text-emerald-500" />;
      case 'request_declined': return <X className="w-5 h-5 text-rose-500" />;
      case 'new_message': return <MessageSquare className="w-5 h-5 text-indigo-500" />;
      case 'task_assigned': return <ListTodo className="w-5 h-5 text-yellow-500" />;
      case 'task_updated':
      case 'team_update': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-400" />;
      default: return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  // Format timestamp nicely
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-full transition-colors ${isOpen ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white"></span>
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 transform origin-top-right transition-all">

          {/* Header */}
          <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex justify-between items-center">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs py-0.5 px-2 rounded-full">{unreadCount}</span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[70vh] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                <Bell className="w-8 h-8 text-slate-200 mb-2" />
                <p className="text-sm font-medium">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer relative ${!notif.isRead ? 'bg-blue-50/30' : ''}`}
                  >
                    {/* Unread dot indicator */}
                    {!notif.isRead && (
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    )}

                    <div className="flex-shrink-0 mt-1 pl-1">
                      {getIconForType(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm tracking-tight ${!notif.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {notif.title}
                      </p>
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>
                      <p className="text-xs font-semibold text-slate-400 mt-2">
                        {formatTime(notif.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
