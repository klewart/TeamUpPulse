import React from 'react';
import { Users, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MatchTeamCard = ({ team, matchResult, currentUserId, onJoinRequest, category }) => {
  const navigate = useNavigate();
  const { 
    id, 
    teamName, 
    projectTopic, 
    members, 
    maxMembers,
    createdBy
  } = team;

  const { score, matchedSkills, missingSkills } = matchResult;

  const isFull = members?.length >= maxMembers;
  const isMember = members?.includes(currentUserId);
  const isCreator = createdBy === currentUserId;

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
          {category && (
            <span className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full" aria-hidden="true" style={{ backgroundColor: category === 'backend' ? '#4f46e5' : category === 'frontend' ? '#ec4899' : '#10b981' }} />
              {category === 'backend' ? 'Backend' : category === 'frontend' ? 'Frontend' : 'Fullstack'}
            </span>
          )}
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
        ) : isFull ? (
           <span className="text-sm font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg">Full</span>
        ) : onJoinRequest ? (
          <button 
            onClick={() => onJoinRequest(id)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            Join Team
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default MatchTeamCard;
