'use client';

interface ToolbarProps {
  selectedColor: string;
  brushSize: number;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onClear: () => void;
  onSave: () => void;
}

export default function Toolbar({
  selectedColor,
  brushSize,
  onColorChange,
  onBrushSizeChange,
  onClear,
  onSave,
}: ToolbarProps) {

  const handleColorToggle = () => {
    onColorChange(selectedColor === '#FFFFFF' ? '#000000' : '#FFFFFF');
  };

  const handleSizeToggle = () => {
    // Toggles size: 4 (min) -> 8 -> 16 (max) -> 4 (min)
    if (brushSize === 4) onBrushSizeChange(8);
    else if (brushSize === 8) onBrushSizeChange(16);
    else onBrushSizeChange(4);
  };

  const btnClass = "before:hidden hover:before:flex before:justify-center before:items-center before:h-4 before:text-[.6rem] before:px-1 before:bg-black dark:before:bg-white dark:before:text-black before:text-white before:bg-opacity-50 before:absolute before:-top-7 before:rounded-lg hover:-translate-y-5 cursor-pointer hover:scale-125 bg-white dark:bg-[#191818] rounded-full p-2 px-3 flex items-center justify-center";

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="hover:scale-x-105 transition-all duration-300 *:transition-all *:duration-300 flex justify-start text-2xl items-center shadow-xl z-10 bg-[#e8e4df] dark:bg-[#191818] gap-2 p-2 rounded-full">
        <button 
          onClick={handleColorToggle}
          className={`${btnClass} before:content-['Color']`}
          title="Toggle White / Black"
        >
          {selectedColor === '#FFFFFF' ? '⚪' : '⚫'}
        </button>
        <button 
          onClick={handleSizeToggle}
          className={`${btnClass} before:content-['Size']`}
          title={`Size: ${brushSize}px`}
        >
          🖌️
        </button>
        <button 
          onClick={onClear}
          className={`${btnClass} before:content-['Clear']`}
          title="Delete the board"
        >
          🗑️
        </button>
        <button 
          onClick={onSave}
          className={`${btnClass} before:content-['Save']`}
          title="Save the image"
        >
          💾
        </button>
      </div>
    </div>
  );
}
