import { db } from '../services/firebase';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';

/**
 * Fetches and compiles all relevant project context for the AI.
 * 
 * @param {string} projectId 
 * @returns {Promise<Object>}
 */
export const getProjectAIContext = async (projectId) => {
  if (!projectId) return null;

  try {
    const teamRef = doc(db, 'teams', projectId);
    const teamSnap = await getDoc(teamRef);

    if (!teamSnap.exists()) return null;

    const teamData = teamSnap.data();

    // Fetch tasks to get progress
    const tasksRef = collection(db, 'teams', projectId, 'tasks');
    const tasksSnap = await getDocs(tasksRef);
    
    const tasks = [];
    tasksSnap.forEach(d => tasks.push(d.data()));

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return {
      teamName: teamData.teamName,
      description: teamData.description,
      projectTopic: teamData.projectTopic,
      requiredSkills: teamData.requiredSkills || [],
      totalTasks,
      completedTasks,
      progress
    };
  } catch (err) {
    console.error("Failed to fetch project context for AI:", err);
    return null;
  }
};
