import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import MatchTeamCard from '../components/MatchTeamCard';
import Sidebar from '../components/Sidebar';
import { calculateSkillMatch, categorizeSkillset } from '../utils/matchUtils';
import { Link } from 'react-router-dom';

const RecommendedTeams = () => {
  const { currentUser } = useAuth();
  const [recommendedTeams, setRecommendedTeams] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [userCategory, setUserCategory] = useState('fullstack');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (userSnap) => {
      if (userSnap.exists()) {
        setUserProfile(userSnap.data());
      } else {
        setError("User profile not found. Please setup your profile first.");
        setLoading(false);
      }
    }, (err) => {
      console.error("User profile subscription error:", err);
      setError("Failed to load user profile.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !userProfile) return;

    const userSkills = userProfile.skills || [];
    if (userSkills.length === 0) {
      setRecommendedTeams([]);
      setUserCategory('fullstack');
      setLoading(false);
      return;
    }

    const category = categorizeSkillset(userSkills);
    setUserCategory(category);

    setLoading(true);
    const teamsRef = collection(db, 'teams');
    const unsubscribe = onSnapshot(teamsRef, (snapshot) => {
      const processedTeams = [];
      snapshot.forEach((doc) => {
        const teamData = doc.data();
        
        const isMember = teamData.members?.includes(currentUser.uid);
        const isCreator = teamData.createdBy === currentUser.uid;
        const isFull = teamData.members?.length >= teamData.maxMembers;
        
        if (!isMember && !isCreator && !isFull) {
          const teamCategory = categorizeSkillset(teamData.requiredSkills || []);
          const matchResult = calculateSkillMatch(userSkills, teamData.requiredSkills || []);
          
          if (matchResult.score > 0) {
            processedTeams.push({
              id: doc.id,
              ...teamData,
              matchResult,
              category: teamCategory
            });
          }
        }
      });

      processedTeams.sort((a, b) => {
        const aMatch = a.category === category ? 0 : 1;
        const bMatch = b.category === category ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
        return b.matchResult.score - a.matchResult.score;
      });
      
      setRecommendedTeams(processedTeams);
      setLoading(false);
    }, (err) => {
      console.error("Teams subscription error:", err);
      setError("Lost connection to teams database.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, userProfile]);

  // handleJoinTeam logic removed to enforce the Request to Join flow.

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Navigation Sidebar */}
        <div className="lg:col-span-3 lg:sticky lg:top-24 h-fit hidden lg:block">
          <Sidebar />
        </div>
        {/* Right Column: Main Content */}
        <div className="lg:col-span-9 space-y-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Smart Matches</h1>
                <p className="text-slate-600 mt-1">Teams looking for your exact skillset.</p>
                <div className="mt-2 flex items-center gap-2">
                   <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Track:</span>
                   <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                    {userCategory === 'backend' ? 'Backend Focused' : userCategory === 'frontend' ? 'Frontend Focused' : 'Fullstack'}
                  </span>
                </div>
              </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
              {recommendedTeams.map(team => (
                <div key={team.id} className="relative">
                  <MatchTeamCard 
                    team={team} 
                    matchResult={team.matchResult}
                    category={team.category}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecommendedTeams;
