import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc, collection, getDocs, updateDoc, arrayUnion, arrayRemove, deleteDoc, addDoc, serverTimestamp, onSnapshot, query, where } from 'firebase/firestore';
import { Loader2, Users, ArrowLeft, UserPlus, CheckCircle2, MessageSquare, ListTodo, Star, UserMinus, LogOut, Trash2, Hourglass, X, Check, Search, Sparkles } from 'lucide-react';
import SkillTag from '../components/SkillTag';
import { calculateSkillMatch } from '../utils/matchUtils';

const TeamDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [team, setTeam] = useState(null);
  const [memberData, setMemberData] = useState([]);
  const [requestData, setRequestData] = useState([]);
  const [suggestedTeammates, setSuggestedTeammates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showBrowseModal, setShowBrowseModal] = useState(false);
  const [invitedUsers, setInvitedUsers] = useState(new Set());

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    const teamRef = doc(db, 'teams', id);

    const unsubscribe = onSnapshot(teamRef, async (teamSnap) => {
      try {
        if (!teamSnap.exists()) {
          setError("Team not found");
          setLoading(false);
          return;
        }

        const teamData = { id: teamSnap.id, ...teamSnap.data() };
        setTeam(teamData);

        // Fetch member profiles
        if (teamData.members && teamData.members.length > 0) {
          await fetchMemberProfiles(teamData.members);
        } else {
          setMemberData([]);
        }

        // Fetch join request profiles
        if (teamData.joinRequests && teamData.joinRequests.length > 0) {
          await fetchRequestProfiles(teamData.joinRequests);
        } else {
          setRequestData([]);
        }

        // 2. If the current user is the creator, fetch suggested teammates
        if (teamData.createdBy === currentUser?.uid) {
          await fetchSuggestedTeammates(teamData);
        }

        setLoading(false);
        setError('');
      } catch (err) {
        console.error("Error processing team data:", err);
      }
    }, (err) => {
      setError('Failed to load team details: ' + err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, currentUser]);

  useEffect(() => {
    // Fetch pending invites to disable "Request to Invite" for already invited users
    const isTeamCreator = team?.createdBy === currentUser?.uid;
    if (!id || !isTeamCreator) return;

    const invitesRef = collection(db, 'teamInvites');
    const q = query(invitesRef, where('projectId', '==', id), where('status', '==', 'pending'));

    const unsubscribeInvites = onSnapshot(q, (snapshot) => {
      const invitedIds = new Set();
      snapshot.forEach(doc => invitedIds.add(doc.data().receiverId));
      setInvitedUsers(invitedIds);
    });

    return () => unsubscribeInvites();
  }, [id, team?.createdBy, currentUser?.uid]);

  const fetchMemberProfiles = async (memberIds) => {
    try {
      const profiles = await Promise.all(
        memberIds.map(async (uid) => {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            return { uid: userDoc.id, ...userDoc.data() };
          }
          return null;
        })
      );
      setMemberData(profiles.filter(p => p !== null));
    } catch (err) {
      console.error("Failed to load member profiles:", err);
    }
  };

  const fetchRequestProfiles = async (requestIds) => {
    try {
      const profiles = await Promise.all(
        requestIds.map(async (uid) => {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            return { uid: userDoc.id, ...userDoc.data() };
          }
          return null;
        })
      );
      setRequestData(profiles.filter(p => p !== null));
    } catch (err) {
      console.error("Failed to load request profiles:", err);
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

  const handleSendInvite = async (userId, userName) => {
    if (!currentUser || !team) return;

    try {
      setActionLoading(true);
      await addDoc(collection(db, 'teamInvites'), {
        projectId: team.id,
        projectName: team.teamName,
        senderId: currentUser.uid,
        receiverId: userId,
        status: 'pending',
        timestamp: serverTimestamp()
      });

      // Also notify the user
      await addDoc(collection(db, 'notifications'), {
        userId: userId,
        type: 'team_invite',
        title: 'New Team Invitation',
        message: `${currentUser.name || 'Someone'} invited you to join ${team.teamName}`,
        link: `/dashboard`,
        isRead: false,
        createdAt: serverTimestamp()
      });

      alert(`Invitation sent to ${userName}!`);
    } catch (err) {
      alert('Failed to send invite: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestJoin = async () => {
    if (!currentUser || !team) return;

    try {
      setJoining(true);
      const teamRef = doc(db, 'teams', team.id);

      await updateDoc(teamRef, {
        joinRequests: arrayUnion(currentUser.uid)
      });

      setTeam(prev => ({
        ...prev,
        joinRequests: [...(prev.joinRequests || []), currentUser.uid]
      }));

      // Send Notification to Team Creator
      await addDoc(collection(db, 'notifications'), {
        userId: team.createdBy,
        type: 'join_request',
        title: 'New Join Request',
        message: `${currentUser.name || 'A user'} wants to join ${team.teamName}`,
        link: `/team/${team.id}`,
        isRead: false,
        createdAt: serverTimestamp()
      });

      alert('Request sent successfully!');

    } catch (err) {
      alert('Failed to send request: ' + err.message);
    } finally {
      setJoining(false);
    }
  };

  const handleAcceptRequest = async (userId) => {
    try {
      setActionLoading(true);
      const teamRef = doc(db, 'teams', team.id);

      await updateDoc(teamRef, {
        joinRequests: arrayRemove(userId),
        members: arrayUnion(userId)
      });

      const acceptedUser = requestData.find(user => user.uid === userId);

      setTeam(prev => ({
        ...prev,
        joinRequests: prev.joinRequests.filter(id => id !== userId),
        members: [...prev.members, userId]
      }));
      setRequestData(prev => prev.filter(req => req.uid !== userId));
      setMemberData(prev => [...prev, acceptedUser]);

      // Notify the accepted user
      await addDoc(collection(db, 'notifications'), {
        userId: userId,
        type: 'request_accepted',
        title: 'Request Approved!',
        message: `Your request to join ${team.teamName} has been accepted.`,
        link: `/team/${team.id}`,
        isRead: false,
        createdAt: serverTimestamp()
      });

      // Notify all other existing members
      const otherMembers = team.members.filter(m => m !== userId && m !== currentUser.uid);
      const notificationPromises = otherMembers.map(memberId =>
        addDoc(collection(db, 'notifications'), {
          userId: memberId,
          type: 'info',
          title: 'New Teammate!',
          message: `${acceptedUser?.name || 'A new user'} has joined ${team.teamName}.`,
          link: `/team/${team.id}`,
          isRead: false,
          createdAt: serverTimestamp()
        })
      );
      await Promise.all(notificationPromises);

      // Also notify the Creator (currentUser) for explicit feedback (toast + sound)
      await addDoc(collection(db, 'notifications'), {
        userId: currentUser.uid,
        type: 'info',
        title: 'Member Added Successfully!',
        message: `${acceptedUser?.name || 'A new user'} is now part of ${team.teamName}.`,
        link: `/team/${team.id}`,
        isRead: false,
        createdAt: serverTimestamp()
      });

    } catch (err) {
      alert('Failed to accept request: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineRequest = async (userId) => {
    try {
      setActionLoading(true);
      const teamRef = doc(db, 'teams', team.id);

      await updateDoc(teamRef, {
        joinRequests: arrayRemove(userId)
      });

      setTeam(prev => ({
        ...prev,
        joinRequests: prev.joinRequests.filter(id => id !== userId)
      }));
      setRequestData(prev => prev.filter(req => req.uid !== userId));

      // Notify the declined user
      await addDoc(collection(db, 'notifications'), {
        userId: userId,
        type: 'request_declined',
        title: 'Request Declined',
        message: `Your request to join ${team.teamName} was declined.`,
        isRead: false,
        createdAt: serverTimestamp()
      });

    } catch (err) {
      alert('Failed to decline request: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from the team?`)) return;

    try {
      setActionLoading(true);
      const teamRef = doc(db, 'teams', team.id);

      await updateDoc(teamRef, {
        members: arrayRemove(memberId)
      });

      setTeam(prev => ({
        ...prev,
        members: prev.members.filter(id => id !== memberId)
      }));
      setMemberData(prev => prev.filter(member => member.uid !== memberId));

      // Notify the removed member
      await addDoc(collection(db, 'notifications'), {
        userId: memberId,
        type: 'info',
        title: 'Removed from Team',
        message: `You have been removed from the team "${team.teamName}".`,
        isRead: false,
        createdAt: serverTimestamp()
      });

      // Notify all other remaining members
      const remainingMembers = team.members.filter(m => m !== memberId && m !== currentUser.uid);
      const notificationPromises = remainingMembers.map(mId =>
        addDoc(collection(db, 'notifications'), {
          userId: mId,
          type: 'info',
          title: 'Team Member Removed',
          message: `${memberName} has been removed from "${team.teamName}".`,
          link: `/team/${team.id}`,
          isRead: false,
          createdAt: serverTimestamp()
        })
      );
      await Promise.all(notificationPromises);
    } catch (err) {
      alert('Failed to remove member: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!window.confirm("Are you sure you want to leave this team?")) return;

    try {
      setActionLoading(true);
      const teamRef = doc(db, 'teams', team.id);

      await updateDoc(teamRef, {
        members: arrayRemove(currentUser.uid),
        joinRequests: arrayRemove(currentUser.uid)
      });

      // Notify the creator
      if (team.createdBy !== currentUser.uid) {
        await addDoc(collection(db, 'notifications'), {
          userId: team.createdBy,
          type: 'info',
          title: 'Member Left Team',
          message: `${currentUser.name || 'A user'} has left the team "${team.teamName}".`,
          link: `/team/${team.id}`,
          isRead: false,
          createdAt: serverTimestamp()
        });
      }

      // Notify remaining members
      const remainingOthers = team.members.filter(m => m !== currentUser.uid && m !== team.createdBy);
      const notifPromises = remainingOthers.map(mId =>
        addDoc(collection(db, 'notifications'), {
          userId: mId,
          type: 'info',
          title: 'Team Member Left',
          message: `${currentUser.name || 'A user'} has left "${team.teamName}".`,
          link: `/team/${team.id}`,
          isRead: false,
          createdAt: serverTimestamp()
        })
      );
      await Promise.all(notifPromises);

      // Because we are using onSnapshot, we don't necessarily need to update 
      // the local state manually, but it's okay if we just let the listener handle it.

    } catch (err) {
      alert('Failed to leave team: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!window.confirm("WARNING: Are you sure you want to permanently delete this team? This action cannot be undone.")) return;

    try {
      setActionLoading(true);
      const teamRef = doc(db, 'teams', team.id);

      // Notify all team members (except creator) before deleting
      const membersToNotify = (team.members || []).filter(uid => uid !== currentUser.uid);
      
      if (membersToNotify.length > 0) {
        const notifPromises = membersToNotify.map(memberId => 
          addDoc(collection(db, 'notifications'), {
            userId: memberId,
            type: 'team_deleted',
            title: 'Team Deleted',
            message: `The team "${team.teamName}" has been deleted by its creator.`,
            isRead: false,
            createdAt: serverTimestamp()
          })
        );
        await Promise.all(notifPromises);
      }

      await deleteDoc(teamRef);
      navigate('/dashboard');
    } catch (err) {
      alert('Failed to delete team: ' + err.message);
      setActionLoading(false);
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
        <button onClick={() => navigate('/dashboard')} className="mt-6 text-blue-600 font-medium hover:underline">
          Go Back
        </button>
      </div>
    );
  }

  const isCreator = team.createdBy === currentUser?.uid;
  const isMember = team.members?.includes(currentUser?.uid);
  const isFull = team.members?.length >= team.maxMembers;
  const hasRequested = team.joinRequests?.includes(currentUser?.uid);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-medium mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
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
                  <div className="flex flex-wrap gap-2 mt-2 justify-end">
                    {isCreator && (
                      <button
                        onClick={() => setShowBrowseModal(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold border border-blue-700 transition-colors shadow-sm text-sm"
                      >
                        <Search className="w-4 h-4" /> Browse Members
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/team/${team.id}/tasks`)}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-semibold border border-indigo-700 transition-colors shadow-sm text-sm"
                    >
                      <ListTodo className="w-4 h-4" /> Task Board
                    </button>
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('triggerAIChat', { detail: { projectId: team.id } }));
                      }}
                      className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-4 py-2 rounded-xl font-bold border border-indigo-700 transition-all shadow-md shadow-indigo-100 text-sm animate-pulse-subtle"
                    >
                      <Sparkles className="w-4 h-4" /> Use AI
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

            {isCreator && requestData.length > 0 && (
              <div className="mb-8 bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wider">Pending Requests ({requestData.length})</h3>
                </div>
                <div className="space-y-3">
                  {requestData.map(req => (
                    <div key={req.uid} className="flex items-center justify-between p-3 rounded-xl border border-indigo-50 bg-white shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                          {req.name ? req.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900">{req.name}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[150px]">{req.university || 'No university'}</p>
                        </div>
                      </div>

                      <div className="flex bg-slate-50 rounded-lg p-1 border border-slate-100">
                        <button
                          onClick={() => handleAcceptRequest(req.uid)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 flex flex-col items-center justify-center text-xs font-semibold text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors disabled:opacity-50 min-w-[60px]"
                          title="Accept"
                        >
                          <Check className="w-4 h-4 mb-0.5" /> Accept
                        </button>
                        <div className="w-px bg-slate-200 mx-1"></div>
                        <button
                          onClick={() => handleDeclineRequest(req.uid)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 flex flex-col items-center justify-center text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-50 min-w-[60px]"
                          title="Decline"
                        >
                          <X className="w-4 h-4 mb-0.5" /> Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Current Members</h3>
              {memberData.length === 0 ? (
                <p className="text-slate-500 text-sm italic">No members have joined yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {memberData.map(member => (
                    <div key={member.uid} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                          {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900">{member.name}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[120px]">{member.university || 'No university'}</p>
                        </div>
                      </div>

                      {isCreator && member.uid !== currentUser.uid && (
                        <button
                          onClick={() => handleRemoveMember(member.uid, member.name)}
                          disabled={actionLoading}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Remove Member"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-4">
              {isCreator ? (
                <>
                  <div className="flex-1 text-center py-3 bg-slate-50 text-slate-500 font-semibold rounded-xl border border-slate-100">
                    You are the creator of this team
                  </div>
                  <button
                    onClick={handleDeleteTeam}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 py-3 px-6 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-xl border border-red-100 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-5 h-5" /> Delete Team
                  </button>
                </>
              ) : isMember ? (
                <>
                  <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 font-semibold rounded-xl border border-emerald-100">
                    <CheckCircle2 className="w-5 h-5" /> You joined this team
                  </div>
                  <button
                    onClick={handleLeaveTeam}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 py-3 px-6 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-xl border border-rose-100 transition-colors disabled:opacity-50"
                  >
                    <LogOut className="w-5 h-5" /> Leave Team
                  </button>
                </>
              ) : hasRequested ? (
                <div className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 text-indigo-700 font-semibold rounded-xl border border-indigo-100 opacity-80 cursor-not-allowed">
                  <Hourglass className="w-5 h-5 animate-pulse" /> Request Pending...
                </div>
              ) : isFull ? (
                <div className="w-full text-center py-3 bg-red-50 text-red-600 font-semibold rounded-xl border border-red-100">
                  This team is full
                </div>
              ) : (
                <button
                  onClick={handleRequestJoin}
                  disabled={joining}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition-colors disabled:opacity-70"
                >
                  {joining ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending Request...</> : 'Request to Join'}
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
                        <span className="text-sm font-black text-indigo-600 flex-shrink-0">{user.matchResult?.score || 0}%</span>
                      </div>

                      {user.university && (
                        <p className="pl-2 text-xs text-slate-500 mb-3 truncate">{user.university}</p>
                      )}

                      <div className="pl-2 flex flex-wrap gap-1">
                        {user.matchResult?.matchedSkills?.slice(0, 3).map((skill, i) => (
                          <span key={i} className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/50">
                            {skill}
                          </span>
                        ))}
                        {user.matchResult?.matchedSkills?.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-medium">+{(user.matchResult?.matchedSkills?.length || 0) - 3}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Browse Members Modal */}
        {showBrowseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-6 h-6 text-blue-600" /> Browse Matching Members
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">We found these users based on your project's required skills.</p>
                </div>
                <button
                  onClick={() => setShowBrowseModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {suggestedTeammates.length === 0 ? (
                  <div className="text-center py-10">
                    <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700">No matching users found</h3>
                    <p className="text-slate-500 max-w-md mx-auto mt-2">We couldn't find any users matching your required skills right now. Try updating your required skills or check back later.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {suggestedTeammates.map(user => (
                      <div key={user.uid} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-bl-lg border-b border-l border-blue-100">
                          {user.matchResult?.score || 0}% Match
                        </div>

                        <div className="flex items-center gap-3 mb-3 mt-2">
                          <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg border border-indigo-200">
                            {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 leading-tight">{user.name}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{user.university || 'No university listed'}</p>
                          </div>
                        </div>

                        <div className="mb-4 flex-1">
                          <p className="text-xs text-slate-500 mb-1.5 font-medium">Matched Skills:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {user.matchResult?.matchedSkills?.map((skill, i) => (
                              <span key={i} className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                {skill}
                              </span>
                            ))}
                            {user.matchResult?.missingSkills?.length > 0 && (
                              <span className="text-[10px] font-medium text-slate-400 border border-slate-200 px-2 py-0.5 rounded-md" title={`Missing: ${user.matchResult.missingSkills.join(', ')}`}>
                                {`+${user.matchResult.missingSkills.length} more reqs`}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-auto">
                          {invitedUsers.has(user.uid) ? (
                            <button disabled className="w-full py-2 bg-slate-100 text-slate-500 font-semibold rounded-lg text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                              <Check className="w-4 h-4" /> Request Sent
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSendInvite(user.uid, user.name)}
                              disabled={actionLoading}
                              className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-sm transition-colors border border-blue-200 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              <UserPlus className="w-4 h-4" /> Request to Invite
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TeamDetails;
