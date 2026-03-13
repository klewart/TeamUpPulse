import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import MatchTeamCard from '../components/MatchTeamCard';
import { calculateSkillMatch, categorizeSkillset } from '../utils/matchUtils';
import { Link } from 'react-router-dom';

const RecommendedTeams = () => {
  const { currentUser } = useAuth();
  const [recommendedTeams, setRecommendedTeams] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [userCategory, setUserCategory] = useState('fullstack');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    fetchRecommendations();
  }, [currentUser]);

  const fetchRecommendations = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      // 1. Fetch current user's skills
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      let userSkills = [];
      if (userSnap.exists()) {
        const userData = userSnap.data();
        setUserProfile(userData);
        userSkills = userData.skills || [];
      } else {
        throw new Error("User profile not found. Please setup your profile first.");
      }

      if (userSkills.length === 0) {
        setRecommendedTeams([]);
        setLoading(false);
        return;
      }

      const category = categorizeSkillset(userSkills);
      setUserCategory(category);

      teamsSnap.forEach((doc) => {
        const teamData = doc.data();
        
        // Skip teams the user created or already joined
        const isMember = teamData.members?.includes(currentUser.uid);
        const isCreator = teamData.createdBy === currentUser.uid;
        const isFull = teamData.members?.length >= teamData.maxMembers;
        
        if (!isMember && !isCreator && !isFull) {
          // Determine category (frontend/backend/fullstack) for this team as well
          const teamCategory = categorizeSkillset(teamData.requiredSkills || []);

          // Calculate match
          const matchResult = calculateSkillMatch(userSkills, teamData.requiredSkills || []);
          
          processedTeams.push({
            id: doc.id,
            ...teamData,
            matchResult,
            category: teamCategory
          });
        }
      });

      // 3. Sort by category match first (e.g., backend vs frontend), then score descending
      processedTeams.sort((a, b) => {
        const aMatch = a.category === category ? 0 : 1;
        const bMatch = b.category === category ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        return b.matchResult.score - a.matchResult.score;
      });
      
      setRecommendedTeams(processedTeams);
    } catch (err) {
      setError('Failed to calculate recommendations: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (teamId) => {
    if (!currentUser) return;
    
    try {
      setJoiningId(teamId);
      const teamRef = doc(db, 'teams', teamId);
      
      await updateDoc(teamRef, {
        members: arrayUnion(currentUser.uid)
      });
      
      // Remove team from recommendations immediately
      setRecommendedTeams(prev => prev.filter(t => t.id !== teamId));
    } catch (err) {
      alert('Failed to join team: ' + err.message);
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
          <Sparkles className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Smart Matches</h1>
          <p className="text-slate-600 mt-1">Teams looking for your exact skillset.</p>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Recommended track: <span className="inline-flex items-center px-2 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
              {userCategory === 'backend' ? 'Backend' : userCategory === 'frontend' ? 'Frontend' : 'Fullstack'}
            </span>
          </p>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
          {error}
        </div>
      ) : loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : userProfile?.skills?.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-10 text-center flex flex-col items-center justify-center max-w-2xl mx-auto">
          <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-900">Your skill list is empty</h3>
          <p className="text-slate-600 mt-2 max-w-sm mb-6">
            We need to know what you're good at before we can match you with teams! Add skills to your profile to unlock smart recommendations.
          </p>
          <Link to="/profile" className="px-5 py-2.5 rounded-xl font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 transition-colors">
            Setup Profile Skills
          </Link>
        </div>
      ) : recommendedTeams.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <h3 className="text-lg font-bold text-slate-900 mb-1">No perfect matches right now</h3>
          <p className="text-slate-500">We couldn't find any teams looking for your specific talents at the moment.</p>
          <Link to="/teams" className="mt-4 inline-block px-5 py-2 font-medium text-indigo-600 hover:text-indigo-800">
            Browse all public teams
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {recommendedTeams.map(team => (
            <div key={team.id} className="relative">
              {joiningId === team.id && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 rounded-2xl flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                </div>
              )}
              <MatchTeamCard 
                team={team} 
                matchResult={team.matchResult}
                category={team.category}
                currentUserId={currentUser?.uid} 
                onJoinRequest={handleJoinTeam} 
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecommendedTeams;
