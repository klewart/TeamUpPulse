import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, Loader2, ListTodo, AlertTriangle, Plus, Users, User, CheckCircle2 } from 'lucide-react';
import TaskCard from '../components/TaskCard';

const TeamTasks = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [team, setTeam] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]); // To populate assigning dropdown
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // New Task Form State
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Initial Access Check & Load Members
  useEffect(() => {
    const verifyAccessAndLoadMembers = async () => {
      try {
        const teamRef = doc(db, 'teams', id);
        const teamSnap = await getDoc(teamRef);

        if (!teamSnap.exists()) {
          setError("This team does not exist.");
          setLoading(false);
          return;
        }

        const teamData = { id: teamSnap.id, ...teamSnap.data() };
        setTeam(teamData);

        // Security Check: Ensure user is a member
        if (!teamData.members?.includes(currentUser.uid)) {
          setError("Access Denied: You must be a member of this team to view the task board.");
          setLoading(false);
          return;
        }

        // Load member profiles to populate the assignee dropdown
        const memberProfiles = [];
        for (const memberId of teamData.members) {
          const mSnap = await getDoc(doc(db, 'users', memberId));
          if (mSnap.exists()) {
            memberProfiles.push({ id: mSnap.id, name: mSnap.data().name || 'Unknown User' });
          }
        }
        setTeamMembers(memberProfiles);
        if (memberProfiles.length > 0) {
           setNewTaskAssignee(memberProfiles[0].id); // Default to first user
        }

      } catch (err) {
        setError('Failed to load workspace: ' + err.message);
        setLoading(false);
      }
    };

    if (currentUser && id) {
      verifyAccessAndLoadMembers();
    }
  }, [id, currentUser]);

  // 2. Real-time Firestore Listener for Tasks
  useEffect(() => {
    if (!team || error) return;

    setLoading(true);
    const tasksRef = collection(db, 'teams', id, 'tasks');
    const q = query(tasksRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks = [];
      snapshot.forEach((doc) => {
        fetchedTasks.push({ id: doc.id, ...doc.data() });
      });
      setTasks(fetchedTasks);
      setLoading(false);
    }, (err) => {
      console.error("Tasks subscription error:", err);
      setError("Lost connection to live task board.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [team, error, id]);

  // 3. Handlers
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskAssignee) return;
    
    setIsSubmitting(true);
    try {
      const assigneeName = teamMembers.find(m => m.id === newTaskAssignee)?.name || 'Unknown';
      
      await addDoc(collection(db, 'teams', id, 'tasks'), {
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        assignedTo: newTaskAssignee,
        assignedToName: assigneeName,
        status: 'todo',
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      // Notify the assignee about their new task
      await addDoc(collection(db, 'notifications'), {
        userId: newTaskAssignee,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You were assigned "${newTaskTitle.trim()}" in ${team.teamName}.`,
        link: `/team/${id}/tasks`,
        isRead: false,
        createdAt: serverTimestamp(),
      });
      
      // Reset form
      setNewTaskTitle('');
      setNewTaskDesc('');
      setShowTaskForm(false);
    } catch (err) {
      console.error("Error creating task", err);
      alert("Failed to create task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
     try {
       const taskRef = doc(db, 'teams', id, 'tasks', taskId);
       const updateData = { status: newStatus };
       
       if (newStatus === 'completed') {
         updateData.completedAt = serverTimestamp();
       }
       
       await updateDoc(taskRef, updateData);

       // Notify the assignee about the status change
       const updatedTaskSnapshot = await getDoc(taskRef);
       const updatedTask = updatedTaskSnapshot.exists() ? updatedTaskSnapshot.data() : null;
       if (updatedTask && updatedTask.assignedTo) {
         await addDoc(collection(db, 'notifications'), {
           userId: updatedTask.assignedTo,
           type: 'task_updated',
           title: 'Task Status Updated',
           message: `${currentUser.displayName || 'Someone'} marked "${updatedTask.title}" as ${newStatus.replace('-', ' ')}.`,
           link: `/team/${id}/tasks`,
           isRead: false,
           createdAt: serverTimestamp(),
         });
       }
     } catch (err) {
       console.error("Error updating status", err);
       alert("Failed to update status.");
       throw err; // throw back to TaskCard to stop its spinner
     }
  };

  // 4. Analytics Calculations
  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  
  const totalTasksCount = tasks.length;
  const completedCount = completedTasks.length;
  const progressPercentage = totalTasksCount === 0 ? 0 : Math.round((completedCount / totalTasksCount) * 100);

  // Member completion stats
  const memberCompletionStats = {};
  completedTasks.forEach(t => {
     memberCompletionStats[t.assignedToName] = (memberCompletionStats[t.assignedToName] || 0) + 1;
  });

  if (error) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center max-w-md w-full">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Access Error</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="w-full bg-slate-900 text-white px-4 py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading && tasks.length === 0 && !team) {
     return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Loading Workspace Kanban...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
           <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors hidden sm:block">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <ListTodo className="w-8 h-8 text-indigo-600" />
              {team?.teamName} Board
            </h1>
            <p className="text-slate-600 mt-1">Manage project contributions and track team progress.</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowTaskForm(!showTaskForm)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm ${
            showTaskForm 
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
          }`}
        >
          {showTaskForm ? 'Cancel' : <><Plus className="w-5 h-5" /> Add Task</>}
        </button>
      </div>

      {/* Analytics Widget */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8 flex flex-col md:flex-row gap-8 items-center justify-between">
        <div className="w-full md:w-1/2">
           <div className="flex justify-between items-end mb-2">
             <h3 className="font-bold text-slate-900">Project Progress</h3>
             <span className="text-2xl font-black text-indigo-600">{progressPercentage}%</span>
           </div>
           <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-200 shadow-inner">
             <div 
               className="bg-indigo-600 h-4 rounded-full transition-all duration-1000 ease-out flex items-center justify-end px-2"
               style={{ width: `${progressPercentage}%` }}
             >
                {progressPercentage > 10 && <div className="w-1.5 h-1.5 bg-white rounded-full opacity-60"></div>}
             </div>
           </div>
           <p className="text-xs text-slate-500 mt-2 font-medium">{completedCount} of {totalTasksCount} tasks completed via TeamUpPulse</p>
        </div>
        
        <div className="w-full md:w-1/2 flex flex-col gap-2">
           <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wider text-slate-400 mb-1">
             <Users className="w-4 h-4" /> Top Contributors
           </h3>
           <div className="flex flex-wrap gap-2">
             {Object.entries(memberCompletionStats).length === 0 ? (
               <span className="text-sm text-slate-500 italic">No tasks completed yet.</span>
             ) : (
                Object.entries(memberCompletionStats).sort((a,b) => b[1] - a[1]).map(([name, count]) => (
                  <div key={name} className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg text-emerald-800 text-sm font-semibold shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {name} <span className="text-emerald-500 bg-white px-1.5 rounded-md text-xs ml-1">{count}</span>
                  </div>
                ))
             )}
           </div>
        </div>
      </div>

      {/* Task Creation Form Dropdown */}
      {showTaskForm && (
        <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 shadow-inner mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
           <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
             <Plus className="w-5 h-5 text-indigo-500" /> Create New Assignment
           </h3>
           <form onSubmit={handleCreateTask} className="flex flex-col gap-4 max-w-2xl">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Task Title *</label>
                <input required type="text" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="w-full rounded-xl border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="e.g. Design Login UI" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                <textarea rows="2" value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} className="w-full rounded-xl border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="Brief details about what needs to be done..." />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Assign To *</label>
                <select required value={newTaskAssignee} onChange={(e) => setNewTaskAssignee(e.target.value)} className="w-full rounded-xl border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <button 
                type="submit" 
                disabled={isSubmitting || !newTaskTitle.trim() || !newTaskAssignee}
                className="mt-2 w-full md:w-auto self-start bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle2 className="w-5 h-5"/>}
                Publish Task
              </button>
           </form>
        </div>
      )}

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Column: TODO */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 min-h-[500px]">
           <div className="flex items-center justify-between mb-4 px-1">
             <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wider">
               <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div> To Do
             </h3>
             <span className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">{todoTasks.length}</span>
           </div>
           <div className="flex flex-col gap-3">
             {todoTasks.map(task => (
               <TaskCard key={task.id} task={task} currentUserId={currentUser?.uid} onStatusChange={handleStatusChange} />
             ))}
             {todoTasks.length === 0 && <p className="text-center text-slate-400 text-sm italic mt-8">No impending tasks.</p>}
           </div>
        </div>

        {/* Column: IN PROGRESS */}
        <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 min-h-[500px]">
           <div className="flex items-center justify-between mb-4 px-1">
             <h3 className="font-bold text-blue-800 flex items-center gap-2 text-sm uppercase tracking-wider">
               <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div> In Progress
             </h3>
             <span className="bg-white border text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">{inProgressTasks.length}</span>
           </div>
           <div className="flex flex-col gap-3">
             {inProgressTasks.map(task => (
               <TaskCard key={task.id} task={task} currentUserId={currentUser?.uid} onStatusChange={handleStatusChange} />
             ))}
             {inProgressTasks.length === 0 && <p className="text-center text-blue-400/70 text-sm italic mt-8">Nothing actively being worked on.</p>}
           </div>
        </div>

        {/* Column: COMPLETED */}
        <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 min-h-[500px]">
           <div className="flex items-center justify-between mb-4 px-1">
             <h3 className="font-bold text-emerald-800 flex items-center gap-2 text-sm uppercase tracking-wider">
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Completed
             </h3>
             <span className="bg-white border text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">{completedTasks.length}</span>
           </div>
           <div className="flex flex-col gap-3">
             {completedTasks.map(task => (
               <TaskCard key={task.id} task={task} currentUserId={currentUser?.uid} onStatusChange={handleStatusChange} />
             ))}
             {completedTasks.length === 0 && <p className="text-center text-emerald-600/60 text-sm italic mt-8">No milestones achieved yet.</p>}
           </div>
        </div>

      </div>

    </div>
  );
};

export default TeamTasks;
