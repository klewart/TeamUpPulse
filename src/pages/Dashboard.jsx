import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Loader2, Award, Briefcase, Zap, Check, X, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, updateDoc, arrayUnion } from 'firebase/firestore';

import Sidebar from '../components/Sidebar';
import ProfileSummary from '../components/ProfileSummary';
import TeamCard from '../components/TeamCard';
import MatchTeamCard from '../components/MatchTeamCard';
import { calculateSkillMatch } from '../utils/matchUtils';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [createdTeams, setCreatedTeams] = useState([]);
  const [joinedTeams, setJoinedTeams] = useState([]);
  const [recommendedTeams, setRecommendedTeams] = useState([]);
  const [teamInvites, setTeamInvites] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataLoaded, setDataLoaded] = useState({ created: false, joined: false });

  // 1. Real-time Teams Listeners
  useEffect(() => {
    if (!currentUser?.uid) return;

    const teamsRef = collection(db, 'teams');

    // Fail-safe: Force loading to false after 3 seconds if snapshots hang
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    // Lead Teams
    const createdQ = query(teamsRef, where('createdBy', '==', currentUser.uid));
    const unsubscribeCreated = onSnapshot(createdQ, (snapshot) => {
      const teams = [];
      snapshot.forEach(doc => teams.push({ id: doc.id, ...doc.data() }));
      setCreatedTeams(teams);
      setDataLoaded(prev => ({ ...prev, created: true }));
    }, (err) => {
      console.error("Created teams listener error:", err);
      setDataLoaded(prev => ({ ...prev, created: true }));
    });

    // Collaborating Teams
    const joinedQ = query(teamsRef, where('members', 'array-contains', currentUser.uid));
    const unsubscribeJoined = onSnapshot(joinedQ, (snapshot) => {
      const teams = [];
      snapshot.forEach(doc => {
        const data = { id: doc.id, ...doc.data() };
        if (data.createdBy !== currentUser.uid) {
          teams.push(data);
        }
      });
      setJoinedTeams(teams);
      setDataLoaded(prev => ({ ...prev, joined: true }));
    }, (err) => {
      console.error("Joined teams listener error:", err);
      setDataLoaded(prev => ({ ...prev, joined: true }));
    });

    // Team Invites
    const invitesQ = query(collection(db, 'teamInvites'), where('receiverId', '==', currentUser.uid), where('status', '==', 'pending'));
    const unsubscribeInvites = onSnapshot(invitesQ, (snapshot) => {
      const invites = [];
      snapshot.forEach(doc => invites.push({ id: doc.id, ...doc.data() }));
      setTeamInvites(invites);
    });

    return () => {
      clearTimeout(timer);
      unsubscribeCreated();
      unsubscribeJoined();
      unsubscribeInvites();
    };
  }, [currentUser?.uid]);

  // Handle loading state based on data load completion
  useEffect(() => {
    if (dataLoaded.created && dataLoaded.joined) {
      setLoading(false);
    }
  }, [dataLoaded]);

  // 2. Fetch recommendations (One-time or on skill change, NOT on every team update)
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!currentUser?.skills || currentUser.skills.length === 0) {
        setRecommendedTeams([]);
        return;
      }

      try {
        const teamsRef = collection(db, 'teams');
        const allTeamsSnap = await getDocs(teamsRef);
        const recommendations = [];

        allTeamsSnap.forEach(doc => {
          const tData = doc.data();
          const isMember = tData.members?.includes(currentUser.uid);
          const isFull = (tData.members?.length || 0) >= (tData.maxMembers || 0);

          if (!isMember && !isFull && tData.createdBy !== currentUser.uid) {
            const matchResult = calculateSkillMatch(currentUser.skills, tData.requiredSkills || []);
            if (matchResult.score > 0) {
              recommendations.push({
                id: doc.id,
                ...tData,
                matchResult
              });
            }
          }
        });

        recommendations.sort((a, b) => b.matchResult.score - a.matchResult.score);
        setRecommendedTeams(recommendations.slice(0, 3));
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
      }
    };

    if (currentUser) {
      fetchRecommendations();
    }
  }, [currentUser?.uid, currentUser?.skills]);

  const handleAcceptInvite = async (invite) => {
    try {
      setLoading(true);
      // Add user to team members
      const teamRef = doc(db, 'teams', invite.projectId);
      await updateDoc(teamRef, {
        members: arrayUnion(currentUser.uid)
      });

      // Update invite status
      const inviteRef = doc(db, 'teamInvites', invite.id);
      await updateDoc(inviteRef, {
        status: 'accepted'
      });

      setLoading(false);
    } catch (err) {
      alert('Failed to accept invite: ' + err.message);
      setLoading(false);
    }
  };

  const handleRejectInvite = async (inviteId) => {
    try {
      const inviteRef = doc(db, 'teamInvites', inviteId);
      await updateDoc(inviteRef, {
        status: 'rejected'
      });
    } catch (err) {
      alert('Failed to reject invite: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Loading your workspace...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {currentUser?.name ? currentUser.name.split(' ')[0] : 'Student'}! 👋
          </h1>
          <p className="text-slate-600 mt-1">Here is what's happening in your teams today.</p>
        </div>
        <button
          onClick={() => navigate('/create-team')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm shadow-blue-200 text-sm flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create New Team
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 mb-8">
          {error}
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Sidebar & Profile */}
        <div className="lg:col-span-3 space-y-6 lg:sticky lg:top-24 h-fit">
          <Sidebar />
          <ProfileSummary profileData={currentUser} />
        </div>

        {/* Right Column: Main Content Feed */}
        <div className="lg:col-span-9 space-y-10">

          {/* Section: Pending Invites */}
          {teamInvites.length > 0 && (
            <section>
              <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-5">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Team Invitations ({teamInvites.length})
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teamInvites.map(invite => (
                  <div key={invite.id} className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm shadow-blue-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Invitation to join</p>
                      <h3 className="text-lg font-bold text-slate-900">{invite.projectName}</h3>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                      <button
                        onClick={() => handleAcceptInvite(invite)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl border border-emerald-200 transition-colors"
                      >
                        <Check className="w-4 h-4" /> Accept
                      </button>
                      <button
                        onClick={() => handleRejectInvite(invite.id)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-xl border border-rose-100 transition-colors"
                      >
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section: Teams Created */}
          <section>
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-5">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-500" />
                Teams You Lead ({createdTeams.length})
              </h2>
            </div>

            {createdTeams.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
                <p className="text-slate-500 mb-4">You haven't created any teams yet.</p>
                <div className="flex gap-4">
                  <button onClick={() => navigate('/create-team')} className="text-indigo-600 font-semibold hover:underline">
                    Start a project
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {createdTeams.map(team => (
                  <TeamCard key={team.id} team={team} currentUserId={currentUser?.uid} />
                ))}
              </div>
            )}
          </section>

          {/* Section: Teams Joined */}
          <section>
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-5">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-500" />
                Collaborating On ({joinedTeams.length})
              </h2>
            </div>

            {joinedTeams.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
                <p className="text-slate-500 mb-4">You haven't joined any other teams.</p>
                <div className="flex gap-4">
                  <Link to="/teams" className="text-emerald-600 font-semibold hover:underline">
                    Discover open projects
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {joinedTeams.map(team => (
                  <TeamCard key={team.id} team={team} currentUserId={currentUser?.uid} />
                ))}
              </div>
            )}
          </section>

          {/* Section: Recommended Deals (Top 3) */}
          <section className="bg-gradient-to-r from-indigo-50 to-blue-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-10 mt-10">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                  Recommended For You
                </h2>
                <p className="text-slate-600 mt-1">Top teams looking for your specific skills.</p>
              </div>
              <Link to="/recommendations" className="text-indigo-600 font-semibold hover:text-indigo-800 transition-colors hidden sm:block">
                View all matches &rarr;
              </Link>
            </div>

            {recommendedTeams.length === 0 ? (
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 text-center border border-white flex flex-col items-center justify-center">
                <p className="text-slate-600 mb-2">Configure your profile skills to get smart recommendations!</p>
                <div className="flex gap-4 mt-2">
                  <Link to="/profile" className="inline-block px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200 transition-colors">
                    Update Skills
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {recommendedTeams.map(team => (
                  <MatchTeamCard key={team.id} team={team} matchResult={team.matchResult} currentUserId={currentUser?.uid} />
                ))}
              </div>
            )}

            <div className="mt-6 text-center sm:hidden">
              <Link to="/recommendations" className="text-indigo-600 font-semibold hover:underline">
                View all matches
              </Link>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
