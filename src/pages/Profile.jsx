import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Plus, Save, Loader2, CheckCircle2 } from 'lucide-react';
import SkillTag from '../components/SkillTag';
import ProfileCard from '../components/ProfileCard';

const Profile = () => {
  const { currentUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    university: '',
    github: '',
    linkedin: ''
  });
  
  const [skills, setSkills] = useState([]);
  const [newSkill, setNewSkill] = useState('');
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;
      
      try {
        const docRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfileData(data);
          setFormData({
            name: data.name || '',
            bio: data.bio || '',
            university: data.university || '',
            github: data.github || '',
            linkedin: data.linkedin || ''
          });
          setSkills(data.skills || []);
        }
      } catch (err) {
        setError('Error fetching profile: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser]);

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
    
    if (!formData.name.trim()) {
      return setError('Name is required');
    }

    try {
      setSaving(true);
      setError('');
      setSuccess(false);
      
      const updatedData = {
        ...formData,
        skills
      };
      
      await updateDoc(doc(db, 'users', currentUser.uid), updatedData);
      
      setProfileData(prev => ({ ...prev, ...updatedData }));
      setSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to update profile: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Your Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Edit Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm font-medium border border-emerald-100">
                  <CheckCircle2 className="w-5 h-5" />
                  Profile updated successfully!
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                    placeholder="Jane Doe"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
                  <textarea
                    name="bio"
                    rows={4}
                    value={formData.bio}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all resize-y"
                    placeholder="Tell us about yourself, your goals, and what you're building..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">University / College</label>
                  <input
                    type="text"
                    name="university"
                    value={formData.university}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                    placeholder="State University"
                  />
                </div>

                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">GitHub Link</label>
                    <input
                      type="text"
                      name="github"
                      value={formData.github}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                      placeholder="github.com/username"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn Link</label>
                    <input
                      type="text"
                      name="linkedin"
                      value={formData.linkedin}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                      placeholder="linkedin.com/in/username"
                    />
                  </div>
                </div>

                {/* Skills Section */}
                <div className="md:col-span-2 pt-4 border-t border-gray-100">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Technical Skills</label>
                  <div className="flex flex-wrap gap-2 mb-4">
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
                      placeholder="e.g. React, Node.js, UI Design"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2 disabled:opacity-70"
                >
                  {saving ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-5 h-5" /> Save Profile</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="lg:col-span-1 hidden lg:block">
          <div className="sticky top-24">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Live Preview</h3>
            <ProfileCard
              profile={{
                ...profileData,
                ...formData,
                skills,
                email: currentUser?.email
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
