import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, Volume2, ShieldCheck, ShieldX, VideoOff } from 'lucide-react';

const Waveform = () => {
  return (
    <div className="flex items-center gap-0.5 h-4">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ 
            height: [3, 12, 6, 14, 3].map(v => v * (Math.random() + 0.5)) 
          }}
          transition={{ 
            repeat: Infinity, 
            duration: 0.5 + Math.random(),
            ease: "easeInOut"
          }}
          className="w-0.5 bg-amber-400 rounded-full"
        />
      ))}
    </div>
  );
};

const DraggableWebcam = ({ 
  videoRef, 
  isSpeaking, 
  monitoringStatus, 
  stream 
}) => {
  const containerRef = useRef(null);

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ x: 20, y: 20 }}
      className="fixed z-30 w-52 bg-slate-900 border-2 border-stone-300 shadow-2xl rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
      style={{ touchAction: 'none' }}
    >
      {/* Drag Grip Handle Bar */}
      <div className="px-3 py-1.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-slate-300">
        <div className="flex items-center gap-1.5 text-xs font-bold font-sans">
          <GripVertical className="w-3.5 h-3.5 text-slate-400" />
          <span>Self Camera</span>
        </div>

        {/* Monitoring Badge */}
        <div className="flex items-center gap-1 text-[10px] font-semibold">
          {monitoringStatus === 'on' ? (
            <span className="text-emerald-400 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> ON</span>
          ) : (
            <span className="text-slate-400 flex items-center gap-1"><ShieldX className="w-3 h-3" /> OFF</span>
          )}
        </div>
      </div>

      {/* Video Feed Frame */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        {stream ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="flex flex-col items-center text-slate-500 text-xs p-4 text-center">
            <VideoOff className="w-6 h-6 mb-1 opacity-50" />
            <span>Camera Off</span>
          </div>
        )}

        {/* AI Speaking Indicator Badge attached inside camera widget */}
        {isSpeaking && (
          <div className="absolute bottom-2 left-2 right-2 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-amber-500/30 flex items-center justify-between text-amber-300">
            <div className="flex items-center gap-1.5">
              <Volume2 className="w-3 h-3 text-amber-400 animate-pulse" />
              <span className="text-[10px] font-extrabold uppercase tracking-wide">AI Speaking</span>
            </div>
            <Waveform />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default DraggableWebcam;
