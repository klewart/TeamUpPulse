import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Code, Users, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Landing = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading && currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, loading, navigate]);
  
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8">
          Find the perfect <span className="text-blue-600">teammates</span> <br className="hidden md:block" /> for your next project.
        </h1>
        <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          TeamUpPulse connects driven students with complementary skills to build amazing educational projects together.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to={currentUser ? "/dashboard" : "/login"} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-medium text-lg transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2">
            Get Started <ArrowRight className="w-5 h-5" />
          </Link>
          <a href="#features" className="bg-white hover:bg-gray-50 text-slate-700 border border-gray-200 px-8 py-4 rounded-xl font-medium text-lg transition-colors flex items-center justify-center">
            Learn More
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-slate-50 py-24 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Skill Matching</h3>
              <p className="text-slate-600 leading-relaxed">Find peers whose skills perfectly complement your own, filtering by tech stack and experience level.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                <Code className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Project Showcase</h3>
              <p className="text-slate-600 leading-relaxed">Pitch your ideas to attract the right contributors or browse exciting initiatives to join.</p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Fast Collaboration</h3>
              <p className="text-slate-600 leading-relaxed">Jump straight into building with integrated communication and team management tools.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
