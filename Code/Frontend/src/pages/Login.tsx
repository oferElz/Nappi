import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { setSession } from '../utils/session';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await authApi.signin({ username, password });

      setSession(JSON.stringify({
        user_id: data.user_id,
        username: data.username,
        baby_id: data.baby_id,
        baby: data.baby,
        first_name: data.first_name,
        last_name: data.last_name,
      }));

      if (data.baby_id) {
        navigate('/');
      } else {
        navigate('/onboarding');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-b from-[#fee2d6] via-[#FAFBFC] to-[#e2f9fb] p-0 md:p-8 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top left cloud */}
        <img
          src="/Vector1.svg"
          alt=""
          className="absolute top-[10%] left-[-15%] w-[200px] h-[100px] opacity-30"
        />
        
        {/* Top right cloud */}
        <img
          src="/Vector.svg"
          alt=""
          className="absolute top-[5%] right-[5%] w-[120px] h-[60px] opacity-40"
        />
        
        {/* Middle left cloud */}
        <img
          src="/Vector1.svg"
          alt=""
          className="absolute top-[60%] left-[25%] w-[250px] h-[150px]"
        />
        
        {/* Bottom right cloud */}
        <img
          src="/Vector.svg"
          alt=""
          className="absolute top-[50%] right-[15%] w-[150px] h-[70px] opacity-50"
        />
      </div>
      <div className="w-full h-full md:h-auto md:max-w-md lg:max-w-lg relative flex flex-col items-center justify-center min-h-screen md:min-h-[600px] md:max-h-[90vh] isolate px-6 py-8">
        
        {/* Logo - clickable to go back to welcome */}
        <div 
          className="text-center mb-8"
          style={{
            animation: 'fadeIn 0.8s ease-in backwards'
          }}
        >
          <img
            src="/logo.svg"
            alt="Nappi logo"
            className="w-32 h-auto mx-auto"
          />
        </div>

        {/* Login Card */}
        <div 
          className="w-full max-w-[380px] bg-white/80 backdrop-blur-sm rounded-[24px] shadow-lg p-6 md:p-8"
          style={{
            animation: 'fadeIn 0.8s ease-in backwards'
          }}
        >
          <h2 className="text-2xl font-semibold font-[Kodchasan] text-[#000] text-center mb-2">
            Welcome back!
          </h2>
          <p className="text-sm text-gray-600 text-center mb-6">
            Please sign in to continue
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-5 text-center text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-base outline-none transition-all duration-200 focus:border-[#ffc857] focus:shadow-[0_0_0_3px_rgba(255,200,87,0.2)] focus:bg-white"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-base outline-none transition-all duration-200 focus:border-[#ffc857] focus:shadow-[0_0_0_3px_rgba(255,200,87,0.2)] focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl text-base font-semibold mt-2 transition-all duration-200 ${
                loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-[#ffc857] hover:bg-[#ffb83d] text-[#000] shadow-md hover:shadow-lg active:scale-[0.98]'
              }`}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="text-center mt-6 pt-6 border-t border-gray-200">
            <p className="text-gray-600 text-sm">
              Don&apos;t have an account?{' '}
              <button
                onClick={() => navigate('/signup')}
                className="text-[#4ECDC4] hover:text-[#3db8b0] font-semibold transition-colors"
              >
                Sign up
              </button>
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
    </div>
  );
};

export default Login;