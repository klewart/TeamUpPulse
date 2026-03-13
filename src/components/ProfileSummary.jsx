import React from 'react';
import { Link } from 'react-router-dom';
import { User, MapPin, Edit3 } from 'lucide-react';
import SkillTag from './SkillTag';

const ProfileSummary = ({ profileData, loading }) => {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 animate-pulse">
        <div className="h-16 w-16 bg-slate-200 rounded-full mb-4"></div>
        <div className="h-6 w-3/4 bg-slate-200 rounded mb-2"></div>
        <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
      </div>
    );
  }

  if (!profileData) return null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center relative">
      <Link 
        to="/profile" 
        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        title="Edit Profile"
      >
        <Edit3 className="w-4 h-4" />
      </Link>

      <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl font-bold mb-4">
        {profileData.name ? profileData.name.charAt(0).toUpperCase() : <User className="w-10 h-10" />}
      </div>
      
      <h2 className="text-xl font-bold text-slate-900">{profileData.name || 'Anonymous User'}</h2>
      
      {profileData.university ? (
        <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500 mt-1">
          <MapPin className="w-3.5 h-3.5" />
          {profileData.university}
        </div>
      ) : (
         <div className="text-sm text-slate-400 mt-1">No university added</div>
      )}

      {profileData.bio && (
        <p className="text-sm text-slate-600 mt-4 leading-relaxed line-clamp-2">
          {profileData.bio}
        </p>
      )}

      <div className="w-full mt-6 pt-6 border-t border-gray-100">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-left">Your Skills</h3>
        {profileData.skills && profileData.skills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {profileData.skills.map((skill, index) => (
              <SkillTag key={index} skill={skill} />
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500 text-left bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
            No technical skills added yet. <Link to="/profile" className="text-blue-600 font-semibold hover:underline">Add some!</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSummary;
