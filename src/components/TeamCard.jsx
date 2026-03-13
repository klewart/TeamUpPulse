import React from 'react';
import { Users, ChevronRight, MessageSquare, ListTodo, Star } from 'lucide-react';
import SkillTag from './SkillTag';
import { useNavigate } from 'react-router-dom';

const TeamCard = ({ team, currentUserId }) => {
  const navigate = useNavigate();
  const { 
    id, 
    teamName, 
    projectTopic, 
    description, 
    requiredSkills, 
    members, 
    maxMembers, 
    createdAt 
  } = team;

  const isFull = members?.length >= maxMembers;
  const isMember = members?.includes(currentUserId);
  const isCreator = team.createdBy === currentUserId;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-slate-900">{teamName}</h3>
          <p className="text-sm font-medium text-blue-600 mt-1">{projectTopic}</p>
        </div>
        
        {isFull && !isMember ? (
          <span className="bg-red-50 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-red-100">Full</span>
        ) : isMember ? (
          <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-emerald-100">Joined</span>
        ) : (
          <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-blue-100">Recruiting</span>
        )}
      </div>

      <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed">
        {description}
      </p>

      {requiredSkills && requiredSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {requiredSkills.map((skill, index) => (
            <SkillTag key={index} skill={skill} />
          ))}
        </div>
      )}

      <div className="mt-auto pt-5 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
          <Users className="w-4 h-4 text-slate-400" />
          <span>{members?.length || 0} / {maxMembers} Members</span>
        </div>

        {!isMember && (
          <button 
            onClick={() => navigate(`/team/${id}`)}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors ml-auto"
          >
            View Details
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        
        {(isCreator || isMember) && (
           <div className="flex gap-2 mt-2 flex-wrap justify-end flex-1">
             <button 
               onClick={() => navigate(`/team/${id}`)}
               className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
             >
               Details
             </button>
             <button 
               onClick={() => navigate(`/team/${id}/tasks`)}
               className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
             >
               <ListTodo className="w-4 h-4" /> Tasks
             </button>
             <button 
               onClick={() => navigate(`/team/${id}/chat`)}
               className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
             >
               <MessageSquare className="w-4 h-4" /> Chat
             </button>
             <button 
               onClick={() => navigate(`/team/${id}/feedback`)}
               className="flex items-center gap-1.5 text-sm font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
             >
               <Star className="w-4 h-4" /> Review
             </button>
           </div>
        )}
      </div>
    </div>
  );
};

export default TeamCard;
