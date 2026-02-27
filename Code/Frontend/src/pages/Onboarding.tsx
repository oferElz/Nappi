import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import type { AuthUser } from '../types/auth';
import { getSession, setSession } from '../utils/session';

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);

  const [babyName, setBabyName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('');

  useEffect(() => {
    const stored = getSession();
    if (!stored) {
      navigate('/login');
      return;
    }
    setUser(JSON.parse(stored));
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError('');
    setLoading(true);

    try {
      const { data } = await authApi.registerBaby({
        user_id: user.user_id,
        first_name: babyName,
        birthdate,
        gender: gender || undefined,
      });

      setSession(JSON.stringify({
        user_id: data.user_id,
        username: data.username,
        first_name: user.first_name,  // preserve from existing user
        last_name: user.last_name,    // preserve from existing user
        baby_id: data.baby_id,
        baby: data.baby,
      }));

      navigate('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to register baby');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-b from-[#fee2d6] via-white to-[#e2f9fb] p-0 md:p-8 overflow-hidden relative">
      {/* Decorative clouds */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img
          src="/Vector1.svg"
          alt=""
          className="absolute top-[15%] left-[-10%] w-[200px] h-[100px] opacity-20"
        />
        <img
          src="/Vector.svg"
          alt=""
          className="absolute top-[10%] right-[5%] w-[120px] h-[60px] opacity-30"
        />
        <img
          src="/Vector1.svg"
          alt=""
          className="absolute bottom-[20%] left-[5%] w-[180px] h-[100px] opacity-25"
        />
        <img
          src="/Vector.svg"
          alt=""
          className="absolute bottom-[30%] right-[-5%] w-[150px] h-[70px] opacity-20"
        />
      </div>

      <div className="w-full h-full md:h-auto md:max-w-md lg:max-w-lg relative flex flex-col items-center justify-center min-h-screen md:min-h-[600px] isolate px-6 py-8">
        
        {/* Header with logo */}
        <div 
          className="text-center mb-8"
          style={{
            animation: 'fadeIn 0.6s ease-in backwards'
          }}
        >
          <img
            src="/logo.svg"
            alt="Nappi logo"
            className="w-28 h-auto mx-auto mb-5"
          />
          <h2 className="text-3xl font-bold text-[#000] mb-2">
            Almost there!
          </h2>
          <p className="text-base text-gray-600 max-w-[300px] mx-auto">
            {user ? `Hi ${user.username}! Let's add your baby to start monitoring` : 'Loading...'}
          </p>
        </div>

        {/* Form Card */}
        <div 
          className="w-full max-w-[400px] bg-white/90 backdrop-blur-sm rounded-[20px] shadow-lg p-6 md:p-8"
          style={{
            animation: 'fadeIn 0.8s ease-in 0.2s backwards'
          }}
        >
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-5 text-center text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block mb-2 text-sm font-semibold text-[#000]">
                Baby&apos;s First Name
              </label>
              <input
                type="text"
                required
                value={babyName}
                onChange={e => setBabyName(e.target.value)}
                placeholder="Enter baby's name"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-base outline-none transition-all duration-200 focus:border-[#7DD3C8] focus:shadow-[0_0_0_3px_rgba(125,211,200,0.2)] focus:bg-white"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-[#000]">
                Birthdate
              </label>
              <input
                type="date"
                required
                value={birthdate}
                onChange={e => setBirthdate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-base outline-none transition-all duration-200 focus:border-[#7DD3C8] focus:shadow-[0_0_0_3px_rgba(125,211,200,0.2)] focus:bg-white"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold text-[#000]">
                Gender <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-base outline-none transition-all duration-200 focus:border-[#7DD3C8] focus:shadow-[0_0_0_3px_rgba(125,211,200,0.2)] focus:bg-white cursor-pointer"
              >
                <option value="">Prefer not to say</option>
                <option value="male">Boy</option>
                <option value="female">Girl</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl text-base font-semibold mt-2 transition-all duration-200 ${
                loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#7DD3C8] to-[#5BC4B6] hover:from-[#6BC7BD] hover:to-[#4AB3A5] text-white shadow-md hover:shadow-lg active:scale-[0.98]'
              }`}
            >
              {loading ? 'Setting up...' : 'Start Monitoring'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6 mb-0">
            You can update this information anytime in settings
          </p>
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Onboarding;