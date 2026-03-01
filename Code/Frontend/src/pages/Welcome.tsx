import { useNavigate } from "react-router-dom";
import Btn from "../components/Btn";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    // Full-screen container with background color - always fills viewport
    <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-b from-[#fee2d6] via-[#FAFBFC] to-[#e2f9fb] p-0 md:p-8 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top left cloud */}
        <img
          src="/Vector1.svg"
          alt=""
          className="absolute top-[10%] left-[100px] w-[350px] h-[250px] opacity-30"
        />
        
        {/* Top right cloud */}
        <img
          src="/Vector.svg"
          alt=""
          className="absolute top-[5%] right-[200px] w-[120px] h-[60px] opacity-40"
        />
        
        {/* Middle left cloud */}
        <img
          src="/Vector1.svg"
          alt=""
          className="absolute top-[40%] left-[-80px] w-[250px] h-[150px] opacity-20"
        />
        
        {/* Bottom right cloud */}
        <img
          src="/Vector.svg"
          alt=""
          className="absolute bottom-[30%] right-[-40px] w-[150px] h-[70px] opacity-25"
        />
      </div>
      {/* Inner content container - full width on mobile, max-width on desktop */}
        <div className="w-full h-full md:h-auto md:max-w-md lg:max-w-lg relative flex flex-col items-center justify-center min-h-screen md:min-h-[600px] md:max-h-[90vh] isolate">        
        {/* Background decorative vectors with slide-in animations */}
        <section className="pointer-events-none w-full h-[194px] absolute right-0 bottom-8 left-0">
          {/* Left cloud - slides in from left */}
          <img
            className="absolute top-[19px] left-[-70px] w-[336px] h-[175px]"
            alt=""
            src="/Vector1.svg"
            style={{
              animation: 'slideInLeft 0.6s ease-out 2.4s backwards'
            }}
          />
          {/* Right cloud - slides in from right */}
          <img
            className="absolute top-[0px] right-[-40px] md:right-auto md:left-[255px] w-[151px] h-[70px] z-[1]"
            loading="lazy"
            alt=""
            src="/Vector.svg"
            style={{
              animation: 'slideInRight 0.6s ease-out 2.8s backwards'
            }}
          />
        </section>

        {/* Main content - centered vertically */}
        <div className="w-full flex flex-col items-center justify-center px-6 md:px-8 py-8 z-10 gap-8">
          {/* Welcome text and logo */}
          <div className="w-full flex flex-col items-center gap-8 md:gap-12">
            {/* Welcome To - fades in first */}
            <h3 
              className="text-2xl font-semibold font-[Kodchasan] text-[#000] text-center"
              style={{
                animation: 'fadeIn 0.8s ease-in 0.3s backwards'
              }}
            >
              Welcome To
            </h3>
            
            {/* Nappi logo - fades in second */}
            <div 
              className="w-full max-w-[240px] md:max-w-[280px] flex items-center justify-center"
              style={{
                animation: 'fadeIn 0.8s ease-in 1.1s backwards'
              }}
            >
              <img
                className="w-full h-auto"
                loading="lazy"
                alt="Nappi logo"
                src="/logo.svg"
              />
            </div>
          </div>

          {/* Tagline - rushes in from right to left */}
          <div 
            className="text-base font-medium text-center text-[#000] px-4 z-[2] mt-4"
            style={{
              animation: 'slideInFromRight 0.6s ease-out 1.9s backwards'
            }}
          >
            Better sleep for your baby and for you
          </div>

          {/* Button - fades in last */}
          <div 
            className="w-full max-w-[320px] px-4 z-[2] mt-2"
            style={{
              animation: 'fadeIn 0.6s ease-in 3.3s backwards'
            }}
          >
            <Btn property1="Default" onClick={() => navigate("/Login")} />
          </div>
        </div>

        {/* CSS animations */}
        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes slideInFromRight {
            from {
              opacity: 0;
              transform: translateX(100%);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes slideInLeft {
            from {
              opacity: 0;
              transform: translateX(-150px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes slideInRight {
            from {
              opacity: 0;
              transform: translateX(150px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default Welcome;