import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Plus, Save, Loader2, CheckCircle2, AlertTriangle, Cpu, Camera, User } from 'lucide-react';
import SkillTag from '../components/SkillTag';
import ProfileCard from '../components/ProfileCard';
import Sidebar from '../components/Sidebar';
import { validateSkill, identifyTrack } from '../utils/skillUtils';

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
  const [photoURL, setPhotoURL] = useState('');
  const [track, setTrack] = useState('Generalist');
  const [skillError, setSkillError] = useState('');
  
  // UI State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
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
          setPhotoURL(data.photoURL || '');
          setTrack(data.track || identifyTrack(data.skills || []));
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
    const input = newSkill.trim();
    if (!input) return;

    if (skills.includes(input)) {
      setSkillError('Skill already added');
      return;
    }

    const validation = validateSkill(input);
    
    if (validation.valid) {
      const updatedSkills = [...skills, validation.canonical];
      setSkills(updatedSkills);
      setTrack(identifyTrack(updatedSkills));
      setNewSkill('');
      setSkillError('');
    } else {
      setSkillError(validation.message);
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    const updatedSkills = skills.filter(skill => skill !== skillToRemove);
    setSkills(updatedSkills);
    setTrack(identifyTrack(updatedSkills));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      alert('Image size should be less than 2MB');
      return;
    }

    try {
      setUploading(true);
      setError('');
      
      const storageRef = ref(storage, `profile_pics/${currentUser.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update Firestore immediately
      await updateDoc(doc(db, 'users', currentUser.uid), {
        photoURL: downloadURL
      });
      
      setPhotoURL(downloadURL);
      setProfileData(prev => ({ ...prev, photoURL: downloadURL }));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      console.error("Upload error:", err);
      setError('Failed to upload image: ' + err.message);
    } finally {
      setUploading(false);
    }
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
        skills,
        track,
        photoURL // Ensure photoURL is included if it was updated during the session
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Sidebar */}
        <div className="lg:col-span-3 lg:sticky lg:top-24 h-fit hidden lg:block">
          <Sidebar />
        </div>

        {/* Right Column: Profile Content */}
        <div className="lg:col-span-9 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Settings & Profile</h1>
              <p className="text-slate-600 mt-1 text-sm">Manage your public presence and technical track.</p>
            </div>
            <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
              <Cpu className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">Detected Track</p>
                <p className="text-sm font-bold text-slate-900">{track}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 space-y-6">
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

                  {/* Profile Picture Upload Section */}
                  <div className="flex flex-col items-center sm:flex-row gap-6 pb-6 border-b border-gray-100">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 border-2 border-slate-200 relative">
                        {uploading ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
                            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                          </div>
                        ) : null}
                        {photoURL ? (
                          <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <User className="w-12 h-12" />
                          </div>
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full cursor-pointer shadow-lg transition-all transform hover:scale-110">
                        <Camera className="w-4 h-4" />
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                      </label>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Profile Picture</h3>
                      <p className="text-sm text-slate-500 mt-1">PNG, JPG or GIF. Max 2MB.</p>
                    </div>
                  </div>

                  {/* General Info */}
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
                        placeholder="Tell us about yourself..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">University</label>
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
                        <label className="block text-sm font-medium text-slate-700 mb-1">GitHub</label>
                        <input
                          type="text"
                          name="github"
                          value={formData.github}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn</label>
                        <input
                          type="text"
                          name="linkedin"
                          value={formData.linkedin}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
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
                      </div>
                      
                      {skillError && (
                        <div className="mb-3 flex items-center gap-2 text-red-600 text-xs font-medium bg-red-50 p-2 rounded-lg">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {skillError}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newSkill}
                          onChange={(e) => {
                            setNewSkill(e.target.value);
                            if (skillError) setSkillError('');
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddSkill(e)}
                          className="flex-grow px-4 py-2.5 rounded-xl border border-gray-300 outline-none"
                          placeholder="Add a skill..."
                        />
                        <button
                          type="button"
                          onClick={handleAddSkill}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-medium"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium flex items-center gap-2 disabled:opacity-70"
                    >
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Preview Card */}
            <div className="xl:col-span-1 hidden xl:block">
              <div className="sticky top-24">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Live Preview</h3>
                <ProfileCard
                  profile={{
                    ...profileData,
                    ...formData,
                    skills,
                    track,
                    photoURL,
                    email: currentUser?.email
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
