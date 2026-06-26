import { motion } from 'framer-motion';

interface WeightageSliderProps {
  catWeight: number;
  examWeight: number;
  onChange: (catWeight: number, examWeight: number) => void;
  readOnly?: boolean;
}

export default function WeightageSlider({
  catWeight,
  examWeight,
  onChange,
  readOnly = false,
}: WeightageSliderProps) {
  const handleCatChange = (value: number) => {
    const clamped = Math.min(100, Math.max(0, value));
    onChange(clamped, 100 - clamped);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <h4 className="text-sm font-bold text-gray-800 mb-3">Assessment Weightage</h4>

      {/* Visual bar */}
      <div className="relative h-8 rounded-lg overflow-hidden mb-4 flex">
        <motion.div
          className="flex items-center justify-center text-xs font-bold text-white"
          style={{ background: '#1A365D' }}
          animate={{ width: `${catWeight}%` }}
          transition={{ duration: 0.3 }}
        >
          {catWeight > 10 && `CAT ${catWeight}%`}
        </motion.div>
        <motion.div
          className="flex items-center justify-center text-xs font-bold text-white"
          style={{ background: '#D4AF37' }}
          animate={{ width: `${examWeight}%` }}
          transition={{ duration: 0.3 }}
        >
          {examWeight > 10 && `Exam ${examWeight}%`}
        </motion.div>
      </div>

      {/* Slider */}
      {!readOnly && (
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span className="font-semibold" style={{ color: '#1A365D' }}>CAT Weight</span>
              <span className="font-bold" style={{ color: '#1A365D' }}>{catWeight}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={catWeight}
              onChange={(e) => handleCatChange(parseInt(e.target.value))}
              className="w-full accent-[#1A365D]"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span className="font-semibold" style={{ color: '#D4AF37' }}>Exam Weight</span>
              <span className="font-bold" style={{ color: '#D4AF37' }}>{examWeight}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={examWeight}
              onChange={(e) => handleCatChange(100 - parseInt(e.target.value))}
              className="w-full accent-[#D4AF37]"
            />
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="text-center p-2 rounded-lg" style={{ background: '#1A365D15' }}>
          <div className="text-lg font-black" style={{ color: '#1A365D' }}>{catWeight}%</div>
          <div className="text-xs text-gray-500">CAT</div>
        </div>
        <div className="text-center p-2 rounded-lg" style={{ background: '#D4AF3715' }}>
          <div className="text-lg font-black" style={{ color: '#D4AF37' }}>{examWeight}%</div>
          <div className="text-xs text-gray-500">Exam</div>
        </div>
      </div>

      {catWeight + examWeight !== 100 && (
        <p className="text-xs text-red-500 mt-2 text-center">
          Total must equal 100% (currently {catWeight + examWeight}%)
        </p>
      )}
    </div>
  );
}
