import React from 'react';
import { Github, Linkedin, GraduationCap, Mail, Cpu, User } from 'lucide-react';
import SkillTag from './SkillTag';

const ProfileCard = ({ profile }) => {
  if (!profile) return null;

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header / Cover */}
      <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
      
      <div className="px-6 pb-8">
        {/* Avatar Placeholder */}
        <div className="relative flex justify-between items-end -mt-12 mb-6">
          <div className="w-24 h-24 bg-white rounded-full p-1.5 shadow-md overflow-hidden flex items-center justify-center">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profile.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full bg-blue-100 rounded-full flex items-center justify-center text-3xl font-bold text-blue-600">
                {getInitials(profile.name)}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{profile.name}</h2>
          
          {profile.track && (
            <div className="mt-1 flex items-center gap-1.5 text-blue-600 font-bold text-xs uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5" />
              {profile.track}
            </div>
          )}
          
          <div className="flex flex-col gap-2 mt-3 text-sm text-slate-600">
            {profile.university && (
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-slate-400" />
                <span>{profile.university}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{profile.email}</span>
            </div>
          </div>

          {profile.bio && (
            <p className="mt-4 text-slate-700 leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Social Links */}
          {(profile.github || profile.linkedin) && (
            <div className="flex gap-4 mt-6">
              {profile.github && (
                <a href={profile.github.startsWith('http') ? profile.github : `https://${profile.github}`} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-900 transition-colors">
                  <Github className="w-5 h-5" />
                </a>
              )}
              {profile.linkedin && (
                <a href={profile.linkedin.startsWith('http') ? profile.linkedin : `https://${profile.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-900 transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              )}
            </div>
          )}

          {/* Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Top Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, index) => (
                  <SkillTag key={index} skill={skill} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
