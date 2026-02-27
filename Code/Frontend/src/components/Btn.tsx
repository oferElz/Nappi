import React from "react";

type BtnProps = {
  property1?: "Default" | string;
  onClick?: () => void;
};

const Btn: React.FC<BtnProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full max-w-[360px] mx-auto rounded-[16px] py-4 px-6 bg-[#FFD166] font-semibold text-[#1F2937] shadow-md active:scale-[0.99]"
      type="button"
    >
      Let&apos;s Nap
    </button>
  );
};

export default Btn;
