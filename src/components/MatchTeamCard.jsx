import React, { useState } from 'react';
import { Users, ChevronRight, CheckCircle2, XCircle, Loader2, Hourglass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, updateDoc, arrayUnion, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const MatchTeamCard = ({ team, matchResult }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [joining, setJoining] = useState(false);
  
  const { 
    id, 
    teamName, 
    projectTopic, 
    members, 
    maxMembers,
    createdBy,
    joinRequests = []
  } = team;

  const { score, matchedSkills, missingSkills } = matchResult;

  const isFull = members?.length >= maxMembers;
  const isMember = members?.includes(currentUser?.uid);
  const isCreator = createdBy === currentUser?.uid;
  const hasRequested = joinRequests?.includes(currentUser?.uid);

  const handleRequestJoin = async (e) => {
    e.stopPropagation();
    if (!currentUser) {
      alert("Please login to join a team");
      return;
    }
    
    try {
      setJoining(true);
      const teamRef = doc(db, 'teams', id);
      
      await updateDoc(teamRef, {
        joinRequests: arrayUnion(currentUser.uid)
      });
      
      // Send Notification to Team Creator
      await addDoc(collection(db, 'notifications'), {
        userId: createdBy,
        type: 'join_request',
        title: 'New Join Request',
        message: `${currentUser.displayName || 'A user'} wants to join ${teamName}`,
        link: `/team/${id}`,
        isRead: false,
        createdAt: serverTimestamp()
      });

      alert('Request sent successfully!');
      
    } catch (err) {
      alert('Failed to send request: ' + err.message);
    } finally {
      setJoining(false);
    }
  };

  // Determine progress bar color based on score
  const getProgressColor = (score) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-5 hover:shadow-md transition-shadow relative overflow-hidden">
      
      {/* Absolute Header Ribbon based on match */}
      <div className={`absolute top-0 left-0 w-full h-1.5 ${getProgressColor(score)}`} />
      
      <div className="flex justify-between items-start mt-1">
        <div>
          <h3 className="text-xl font-bold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => navigate(`/team/${id}`)}>{teamName}</h3>
          <p className="text-sm font-medium text-slate-500 mt-1">{projectTopic}</p>
        </div>
        
        <div className="flex flex-col items-end">
          <span className={`text-2xl font-black ${getScoreColor(score)}`}>
            {score}%
          </span>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Match</span>
        </div>
      </div>

      {/* Progress Bar Background */}
      <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
        <div className={`h-2 rounded-full ${getProgressColor(score)}`} style={{ width: `${score}%` }}></div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-2">
        {/* Matched Skills */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Matches
          </h4>
          <div className="flex flex-col gap-1.5">
            {matchedSkills?.length > 0 ? (
              matchedSkills.map((skill, index) => (
                <span key={index} className="text-sm text-slate-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100/50 w-fit">
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-400 italic">None</span>
            )}
          </div>
        </div>

        {/* Missing Skills */}
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-red-400" /> Missing
          </h4>
          <div className="flex flex-col gap-1.5">
             {missingSkills?.length > 0 ? (
              missingSkills.map((skill, index) => (
                <span key={index} className="text-sm text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/50 w-fit">
                  {skill}
                </span>
              ))
            ) : (
               <span className="text-sm text-slate-400 italic">None!</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-5 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
          <Users className="w-4 h-4 text-slate-400" />
          <span>{members?.length || 0} / {maxMembers}</span>
        </div>

        {isCreator ? (
           <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Your Team</span>
        ) : isMember ? (
           <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">Joined</span>
        ) : hasRequested ? (
          <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100/50">
            <Hourglass className="w-3.5 h-3.5 animate-pulse" /> Pending
          </div>
        ) : isFull ? (
           <span className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">Full</span>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => navigate(`/team/${id}`)}
              className="text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors px-2"
            >
              Details
            </button>
            <button 
              onClick={handleRequestJoin}
              disabled={joining}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-70"
            >
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join Request'}
              {!joining && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchTeamCard;
