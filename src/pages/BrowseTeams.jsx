import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, updateDoc, arrayUnion, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Search, Loader2 } from 'lucide-react';
import TeamCard from '../components/TeamCard';
import Sidebar from '../components/Sidebar';

const BrowseTeams = () => {
  const { currentUser } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    setLoading(true);
    const teamsRef = collection(db, 'teams');
    const q = query(teamsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teamsData = [];
      snapshot.forEach((doc) => {
        teamsData.push({ id: doc.id, ...doc.data() });
      });
      setTeams(teamsData);
      setLoading(false);
    }, (err) => {
      console.error("Browse teams sync error:", err);
      setError('Failed to sync teams. Please check your connection.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // handleJoinTeam removed because joining is strictly handled on TeamDetails.jsx now

  const filteredTeams = teams.filter(team => {
    const searchLower = searchTerm.toLowerCase();
    return (
      team.teamName.toLowerCase().includes(searchLower) ||
      team.projectTopic.toLowerCase().includes(searchLower) ||
      team.requiredSkills?.some(skill => skill.toLowerCase().includes(searchLower))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Navigation Sidebar */}
        <div className="lg:col-span-3 lg:sticky lg:top-24 h-fit hidden lg:block">
          <Sidebar />
        </div>

        {/* Right Column: Main Content */}
        <div className="lg:col-span-9 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Discover Teams</h1>
              <p className="text-slate-600 mt-2 text-sm max-w-lg">Find your next project and join forces with other talented students.</p>
            </div>

            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search teams by name, topic, or skills..."
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all shadow-sm bg-white"
              />
            </div>
          </div>

          {error ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
              {error}
            </div>
          ) : loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No teams found</h3>
              <p className="text-slate-500">We couldn't find any teams matching your search criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredTeams.map(team => (
                <div key={team.id} className="relative">
                  {joiningId === team.id && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 rounded-2xl flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                    </div>
                  )}
                  <TeamCard
                    team={team}
                    currentUserId={currentUser?.uid}
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

export default BrowseTeams;
