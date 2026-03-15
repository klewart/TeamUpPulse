import React, { useState } from 'react';
import { Clock, User, CheckCircle2, MoreVertical, Loader2 } from 'lucide-react';

const TaskCard = ({ task, currentUserId, onStatusChange }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { id, title, description, assignedTo, assignedToName, status } = task;

  const isAssignedToMe = currentUserId === assignedTo;

  const handleStatusChange = async (newStatus) => {
    if (newStatus === status) {
      setShowDropdown(false);
      return;
    }
    
    setIsUpdating(true);
    setShowDropdown(false);
    try {
      await onStatusChange(id, newStatus);
    } catch (error) {
       console.error("Task update failed", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'todo': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'in-progress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100';
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-4 relative group hover:border-blue-300 hover:shadow-md transition-all ${isUpdating ? 'opacity-50' : ''}`}>
      
      {/* Context Action Menu - Only for assigned member */}
      {isAssignedToMe && (
        <div className="absolute top-3 right-3">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-5 h-5" />}
          </button>
          
          {showDropdown && (
            <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-10 text-sm">
              <button
                onClick={() => handleStatusChange('todo')}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 font-medium"
              >
                Set To Do
              </button>
              <button
                onClick={() => handleStatusChange('in-progress')}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 text-blue-700 font-medium"
              >
                Set In Progress
              </button>
              <button
                onClick={() => handleStatusChange('completed')}
                className="w-full text-left px-4 py-2 hover:bg-emerald-50 text-emerald-700 font-medium"
              >
                Set Completed
              </button>
            </div>
          )}
        </div>
      )}

      <div className="pr-6">
        <h4 className="font-bold text-slate-900 leading-tight mb-1">{title}</h4>
        {description && (
          <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-3">
            {description}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${getStatusColor(status)}`}>
            {status === 'todo' && <Clock className="w-3 h-3" />}
            {status === 'in-progress' && <svg className="w-3 h-3 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
            {status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
            {status.replace('-', ' ')}
        </div>

        <div 
          className="flex items-center gap-1.5" 
          title={`Assigned to ${assignedToName}`}
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white
            ${isAssignedToMe ? 'bg-indigo-600' : 'bg-slate-400'}
          `}>
             {assignedToName ? assignedToName.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
          </div>
        </div>
      </div>
      
      {/* Click outside overlay to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default TaskCard;
