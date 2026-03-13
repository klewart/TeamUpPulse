import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc, collection, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { Loader2, Users, ArrowLeft, UserPlus, CheckCircle2, MessageSquare, ListTodo, Star } from 'lucide-react';
import SkillTag from '../components/SkillTag';
import { calculateSkillMatch } from '../utils/matchUtils';

const TeamDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [team, setTeam] = useState(null);
  const [suggestedTeammates, setSuggestedTeammates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetchTeamData();
  }, [id]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Team Details
      const teamRef = doc(db, 'teams', id);
      const teamSnap = await getDoc(teamRef);
      
      if (!teamSnap.exists()) {
        setError("Team not found");
        setLoading(false);
        return;
      }
      
      const teamData = { id: teamSnap.id, ...teamSnap.data() };
      setTeam(teamData);

      // 2. If the current user is the creator, fetch suggested teammates
      if (teamData.createdBy === currentUser?.uid) {
        await fetchSuggestedTeammates(teamData);
      }
      
    } catch (err) {
      setError('Failed to load team details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestedTeammates = async (teamData) => {
    try {
      const usersRef = collection(db, 'users');
      const usersSnap = await getDocs(usersRef);
      
      const suggestions = [];
      const teamMembers = teamData.members || [];
      const requiredSkills = teamData.requiredSkills || [];

      usersSnap.forEach((doc) => {
        const userData = doc.data();
        
        // Skip users that are already members
        if (teamMembers.includes(userData.uid)) return;
        
        // Skip users with no skills set yet
        const userSkills = userData.skills || [];
        if (userSkills.length === 0) return;

        // Calculate Match Score
        const matchResult = calculateSkillMatch(userSkills, requiredSkills);
        
        // Only suggest if score is > 0
        if (matchResult.score > 0) {
          suggestions.push({
            ...userData,
            matchResult
          });
        }
      });
      
      // Sort suggestions highest match first
      suggestions.sort((a, b) => b.matchResult.score - a.matchResult.score);
      setSuggestedTeammates(suggestions);
      
    } catch (err) {
      console.error("Failed to load suggestions:", err);
    }
  };

  const handleJoinTeam = async () => {
    if (!currentUser || !team) return;
    
    try {
      setJoining(true);
      const teamRef = doc(db, 'teams', team.id);
      
      await updateDoc(teamRef, {
        members: arrayUnion(currentUser.uid)
      });
      
      // Update local state instantly
      setTeam(prev => ({
        ...prev,
        members: [...(prev.members || []), currentUser.uid]
      }));
      
    } catch (err) {
      alert('Failed to join team: ' + err.message);
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Oops!</h2>
        <p className="text-slate-600">{error || "Something went wrong."}</p>
        <button onClick={() => navigate(-1)} className="mt-6 text-blue-600 font-medium hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const isCreator = team.createdBy === currentUser?.uid;
  const isMember = team.members?.includes(currentUser?.uid);
  const isFull = team.members?.length >= team.maxMembers;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Back Button */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Team Details Container */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{team.teamName}</h1>
                  <p className="text-lg font-medium text-blue-600 mt-2">{team.projectTopic}</p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl text-slate-700 font-semibold border border-slate-100">
                    <Users className="w-5 h-5 text-slate-400" />
                    <span>{team.members?.length || 0} / {team.maxMembers}</span>
                  </div>
                  {(isCreator || isMember) && (
                    <div className="flex gap-2 mt-2">
                       <button 
                         onClick={() => navigate(`/team/${team.id}/tasks`)}
                         className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-semibold border border-indigo-700 transition-colors shadow-sm text-sm"
                       >
                         <ListTodo className="w-4 h-4" /> Task Board
                       </button>
                       <button 
                         onClick={() => navigate(`/team/${team.id}/chat`)}
                         className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl font-semibold border border-indigo-200 transition-colors shadow-sm text-sm"
                       >
                         <MessageSquare className="w-4 h-4" /> Open Chat
                       </button>
                       <button 
                         onClick={() => navigate(`/team/${team.id}/feedback`)}
                         className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2 rounded-xl font-semibold border border-amber-200 transition-colors shadow-sm text-sm"
                       >
                         <Star className="w-4 h-4" /> Peer Feedback
                       </button>
                    </div>
                  )}
                </div>
              </div>

            <div className="prose prose-slate max-w-none mb-8">
              <h3 className="text-lg font-bold text-slate-900">Project Description</h3>
              <p className="text-slate-700 leading-relaxed mt-2 whitespace-pre-wrap">{team.description}</p>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {team.requiredSkills?.map((skill, index) => (
                  <SkillTag key={index} skill={skill} />
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex gap-4">
              {isCreator ? (
                <div className="w-full text-center py-3 bg-slate-50 text-slate-500 font-semibold rounded-xl border border-slate-100">
                  You are the creator of this team
                </div>
              ) : isMember ? (
                <div className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 font-semibold rounded-xl border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5" /> You joined this team
                </div>
              ) : isFull ? (
                <div className="w-full text-center py-3 bg-red-50 text-red-600 font-semibold rounded-xl border border-red-100">
                  This team is full
                </div>
              ) : (
                <button 
                  onClick={handleJoinTeam}
                  disabled={joining}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-70"
                >
                  {joining ? <><Loader2 className="w-5 h-5 animate-spin" /> Joining...</> : 'Join Team Now'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Suggested Match Feature */}
        <div className="lg:col-span-1 space-y-6">
          {isCreator && (
            <div className="bg-gradient-to-b from-indigo-50 to-white rounded-2xl shadow-sm border border-indigo-100 p-6">
              <div className="flex items-center gap-2 text-indigo-700 font-bold mb-6 pb-4 border-b border-indigo-100">
                <UserPlus className="w-5 h-5" />
                <h3>Suggested Teammates</h3>
              </div>

              {suggestedTeammates.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-slate-500">No matching students found yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {suggestedTeammates.map(user => (
                    <div key={user.uid} className="bg-white p-4 rounded-xl border border-indigo-50 shadow-sm relative overflow-hidden">
                      {/* Match Score Strip */}
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>
                      
                      <div className="pl-2 flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-900 truncate pr-2">{user.name}</h4>
                        <span className="text-sm font-black text-indigo-600 flex-shrink-0">{user.matchResult.score}%</span>
                      </div>
                      
                      {user.university && (
                         <p className="pl-2 text-xs text-slate-500 mb-3 truncate">{user.university}</p>
                      )}
                      
                      <div className="pl-2 flex flex-wrap gap-1">
                        {user.matchResult.matchedSkills.slice(0,3).map((skill, i) => (
                          <span key={i} className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/50">
                            {skill}
                          </span>
                        ))}
                        {user.matchResult.matchedSkills.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-medium">+{user.matchResult.matchedSkills.length - 3}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default TeamDetails;
