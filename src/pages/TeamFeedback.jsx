import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, Loader2, Star, AlertTriangle, Users, Award, ShieldCheck, PenTool, CheckCircle2, Quote } from 'lucide-react';

import StarRating from '../components/StarRating';
import FeedbackCard from '../components/FeedbackCard';

const TeamFeedback = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [team, setTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]); 
  const [feedbacks, setFeedbacks] = useState([]);
  const [tasks, setTasks] = useState([]); // Advanced Feature: fetch task completions
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Feedback Form State
  const [selectedUserId, setSelectedUserId] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // 1. Initial Access Check & Load Members & Tasks
  useEffect(() => {
    const fetchWorkspaceData = async () => {
      try {
        const teamRef = doc(db, 'teams', id);
        const teamSnap = await getDoc(teamRef);

        if (!teamSnap.exists()) {
          setError("This team does not exist.");
          setLoading(false);
          return;
        }

        const teamData = { id: teamSnap.id, ...teamSnap.data() };
        setTeam(teamData);

        // Security Check: Ensure user is a member
        if (!teamData.members?.includes(currentUser.uid)) {
          setError("Access Denied: You must be a member of this team to view feedback.");
          setLoading(false);
          return;
        }

        // Load member profiles
        const memberProfiles = [];
        for (const memberId of teamData.members) {
          const mSnap = await getDoc(doc(db, 'users', memberId));
          if (mSnap.exists()) {
            memberProfiles.push({ id: mSnap.id, name: mSnap.data().name || 'Unknown User' });
          }
        }
        setTeamMembers(memberProfiles);

        // Fetch Tasks for Contribution Summary
        const tasksRef = collection(db, 'teams', id, 'tasks');
        const tasksSnap = await getDocs(tasksRef);
        const tasksData = [];
        tasksSnap.forEach(doc => tasksData.push({ id: doc.id, ...doc.data() }));
        setTasks(tasksData);

      } catch (err) {
        setError('Failed to load workspace: ' + err.message);
        setLoading(false);
      }
    };

    if (currentUser && id) {
      fetchWorkspaceData();
    }
  }, [id, currentUser]);

  // 2. Real-time Firestore Listener for Feedbacks
  useEffect(() => {
    if (!team || error) return;

    setLoading(true);
    const feedbackRef = collection(db, 'teams', id, 'feedback');
    const q = query(feedbackRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedFeedbacks = [];
      snapshot.forEach((doc) => {
        fetchedFeedbacks.push({ id: doc.id, ...doc.data() });
      });
      setFeedbacks(fetchedFeedbacks);
      setLoading(false);
    }, (err) => {
      console.error("Feedback subscription error:", err);
      // Don't show full fatal error here, just console log it
      setLoading(false);
    });

    return () => unsubscribe();
  }, [team, error, id]);

  // 3. Handlers
  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!selectedUserId || rating === 0 || !currentUser) return;
    
    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      const reviewedUserName = teamMembers.find(m => m.id === selectedUserId)?.name || 'Unknown';
      
      await addDoc(collection(db, 'teams', id, 'feedback'), {
        reviewerId: currentUser.uid,
        reviewerName: currentUser.displayName || 'Anonymous Member',
        reviewedUserId: selectedUserId,
        reviewedUserName: reviewedUserName,
        rating: rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      });

      // Send Notification to Reviewed User
      await addDoc(collection(db, 'notifications'), {
        userId: selectedUserId,
        type: 'info',
        title: 'New Peer Evaluation',
        message: `${currentUser.name || 'A teammate'} submitted a review for you in ${team.teamName}.`,
        link: `/team/${id}/feedback`,
        isRead: false,
        createdAt: serverTimestamp()
      });
      
      // Reset form
      setSelectedUserId('');
      setRating(0);
      setComment('');
      setSubmitSuccess(true);
      
      setTimeout(() => setSubmitSuccess(false), 3000);

    } catch (err) {
      console.error("Error submitting feedback", err);
      alert("Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Data Aggregation Functions
  const calculateUserImpact = (userId, userName) => {
    // 1. Average Rating
    const userReviews = feedbacks.filter(f => f.reviewedUserId === userId);
    let avgRating = 0;
    if (userReviews.length > 0) {
      const sum = userReviews.reduce((acc, curr) => acc + curr.rating, 0);
      avgRating = (sum / userReviews.length).toFixed(1);
    }

    // 2. Tasks Completed
    const userCompletedTasks = tasks.filter(t => t.assignedTo === userId && t.status === 'completed').length;

    return {
      reviewsCount: userReviews.length,
      avgRating,
      tasksCompleted: userCompletedTasks
    };
  };

  // Define eligible teammates to review (everyone EXCEPT yourself)
  const reviewableTeammates = teamMembers.filter(m => m.id !== currentUser.uid);

  if (error) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center max-w-md w-full">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Error</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="w-full bg-slate-900 text-white px-4 py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading && feedbacks.length === 0 && !team) {
     return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Loading Feedback Hub...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
           <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors hidden sm:block">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Star className="w-8 h-8 text-amber-500 fill-amber-500" />
              Peer Evaluation
            </h1>
            <p className="text-slate-600 mt-1">Review {team?.teamName} contributions ensuring fair tracking.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Aggregated Contribution Dashboard */}
        <div className="lg:col-span-8 space-y-8">
          
           {/* Aggregated User Summary Cards */}
           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
               <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                 <ShieldCheck className="w-5 h-5 text-indigo-500" />
                 Contribution Summary Core
               </h3>
             </div>
             
             <div className="divide-y divide-slate-100">
                {teamMembers.map(member => {
                  const impact = calculateUserImpact(member.id, member.name);
                  
                  return (
                    <div key={member.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                         <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${member.id === currentUser.uid ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                           {member.name.charAt(0).toUpperCase()}
                         </div>
                         <div>
                            <h4 className="font-bold text-slate-900">
                              {member.name} {member.id === currentUser.uid && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">You</span>}
                            </h4>
                            <p className="text-sm text-slate-500 mt-1">{impact.reviewsCount} peer reviews</p>
                         </div>
                      </div>

                      <div className="flex gap-4">
                         <div className="bg-white border border-slate-200 px-4 py-3 rounded-xl min-w-[120px] text-center shadow-sm">
                           <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Tasks Done</span>
                           <span className="text-2xl font-black text-slate-700">{impact.tasksCompleted}</span>
                         </div>
                         <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl min-w-[120px] text-center shadow-sm">
                           <span className="block text-xs font-bold text-amber-600/70 uppercase tracking-widest mb-1">Avg Rating</span>
                           <div className="flex items-center justify-center gap-1">
                             <span className="text-2xl font-black text-amber-600">{impact.avgRating > 0 ? impact.avgRating : '-'}</span>
                             <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                           </div>
                         </div>
                      </div>
                    </div>
                  );
                })}
             </div>
           </div>

           {/* Submitted Feedback List */}
           <div>
              <h3 className="font-bold text-slate-900 text-xl flex items-center gap-2 mb-6 px-1">
                <Quote className="w-6 h-6 text-slate-300" />
                Latest Peer Reviews ({feedbacks.length})
              </h3>
              
              {feedbacks.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-500">
                  No feedback has been submitted for this team yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {feedbacks.map(f => (
                    <FeedbackCard key={f.id} feedback={f} />
                  ))}
                </div>
              )}
           </div>
        </div>

        {/* Right Column: Submit Feedback Form */}
        <div className="lg:col-span-4 sticky top-8">
           <div className="bg-indigo-600 rounded-2xl p-1 shadow-lg shadow-indigo-200">
             <div className="bg-white rounded-[14px] p-6 h-full">
               
               <div className="mb-6 border-b border-slate-100 pb-4">
                 <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                   <PenTool className="w-5 h-5 text-indigo-600" />
                   Submit Evaluation
                 </h2>
                 <p className="text-sm text-slate-500 mt-2">Evaluate your peers based on communication and effort.</p>
               </div>

               {submitSuccess && (
                 <div className="mb-6 bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center gap-3 border border-emerald-100 animate-in fade-in slide-in-from-top-2">
                   <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                   <p className="text-sm font-semibold">Feedback successfully submitted!</p>
                 </div>
               )}

               <form onSubmit={handleSubmitFeedback} className="flex flex-col gap-6">
                 
                 {/* Select Member */}
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">Select Teammate</label>
                   {reviewableTeammates.length === 0 ? (
                     <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
                       No other teammates available.
                     </div>
                   ) : (
                     <select 
                       required 
                       value={selectedUserId} 
                       onChange={(e) => setSelectedUserId(e.target.value)} 
                       className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-3 outline-none transition-colors"
                     >
                       <option value="" disabled>Choose a member...</option>
                       {reviewableTeammates.map(m => (
                         <option key={m.id} value={m.id}>{m.name}</option>
                       ))}
                     </select>
                   )}
                 </div>

                 {/* Star Rating Interaction */}
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">Rate Contribution</label>
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-center">
                      <StarRating rating={rating} onRatingChange={setRating} />
                   </div>
                   {rating === 0 && <p className="text-xs text-amber-600 mt-2 font-medium px-1">* Rating is required</p>}
                 </div>

                 {/* Comment Area */}
                 <div>
                   <label className="block text-sm font-bold text-slate-700 mb-2">Written Feedback (Optional)</label>
                   <textarea 
                     rows="3" 
                     value={comment} 
                     onChange={(e) => setComment(e.target.value)} 
                     className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-4 outline-none transition-colors resize-none"
                     placeholder="Share examples of their collaboration, code quality, or communication..."
                   />
                 </div>

                 {/* Submit Button */}
                 <button 
                   type="submit" 
                   disabled={isSubmitting || !selectedUserId || rating === 0}
                   className="w-full bg-slate-900 hover:bg-slate-800 text-white p-3.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 shadow-sm"
                 >
                   {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Publish Evaluation'}
                 </button>

               </form>

             </div>
           </div>
        </div>

      </div>
    </div>
  );
};

export default TeamFeedback;
