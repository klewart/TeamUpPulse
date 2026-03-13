import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Plus, Users, PlusCircle, Loader2 } from 'lucide-react';
import SkillTag from '../components/SkillTag';

const CreateTeam = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    teamName: '',
    projectTopic: '',
    description: '',
    maxMembers: 5
  });
  
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills(prev => [...prev, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(prev => prev.filter(skill => skill !== skillToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.teamName.trim() || !formData.projectTopic.trim() || !formData.description.trim()) {
      return setError('Please fill out all required fields.');
    }

    if (skills.length === 0) {
      return setError('Please add at least one required skill.');
    }

    try {
      setLoading(true);

      const teamData = {
        ...formData,
        maxMembers: parseInt(formData.maxMembers, 10),
        requiredSkills: skills,
        createdBy: currentUser.uid,
        members: [currentUser.uid], // Creator is automatically the first member
        createdAt: new Date().toISOString()
      };

      const teamsRef = collection(db, 'teams');
      await addDoc(teamsRef, teamData);

      // Redirect to dashboard on success
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to create team: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
          <PlusCircle className="w-8 h-8 text-blue-600" />
          Create a New Team
        </h1>
        <p className="mt-2 text-slate-600">Start a new project and recruit teammates based on their skills.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Team Name *</label>
              <input
                type="text"
                name="teamName"
                required
                value={formData.teamName}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                placeholder="e.g. AI Research Group"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Project Topic *</label>
              <input
                type="text"
                name="projectTopic"
                required
                value={formData.projectTopic}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                placeholder="e.g. AI Education Tool"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
              <textarea
                name="description"
                required
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all resize-y"
                placeholder="Describe what your team is building and what kind of roles you need..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Maximum Team Members</label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="number"
                  name="maxMembers"
                  min="2"
                  max="20"
                  required
                  value={formData.maxMembers}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5 ml-1">Including yourself.</p>
            </div>

            {/* Skills Section */}
            <div className="pt-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Required Skills *</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {skills.map((skill, i) => (
                  <SkillTag key={i} skill={skill} onRemove={handleRemoveSkill} />
                ))}
                {skills.length === 0 && <span className="text-sm text-slate-400 italic">No skills added yet</span>}
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSkill(e)}
                  className="flex-grow px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  placeholder="e.g. React, Node.js, UI/UX"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> Add Skill
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</>
              ) : (
                'Create Team'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTeam;
