import { Link, useNavigate } from 'react-router-dom';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { Sparkles, Dumbbell, Calendar, Flame, ChevronRight, Zap } from 'lucide-react';
import { formatDate } from '../lib/utils';
import PageWrapper, { StaggerContainer, StaggerItem } from '../components/layout/PageWrapper';

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, v => Math.round(v));
  const [rendered, setRendered] = useState(0);

  useEffect(() => { spring.set(value); }, [value, spring]);
  useEffect(() => display.on('change', v => setRendered(v)), [display]);

  return <span>{rendered}</span>;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Good Night';
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function Dashboard() {
  const { sessions, streak } = useWorkoutStore();
  const navigate = useNavigate();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const lastSession = sessions[0];
  const totalThisMonth = sessions.filter(s =>
    new Date(s.date).getMonth() === new Date().getMonth()
  ).length;

  const totalExercises = sessions.reduce((acc, s) => acc + s.exercises.length, 0);

  return (
    <PageWrapper>
      <div className="pt-4 pb-20 space-y-6">

        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <p className="text-gray-500 text-sm font-medium tracking-wide">{today}</p>
          <h1 className="text-4xl font-extrabold mt-1 leading-tight">
            {getGreeting()},{' '}
            <span className="text-gradient">Athlete</span>
          </h1>
        </motion.div>

        {/* AI CTA — gradient border glass card */}
        <motion.button
          onClick={() => navigate('/ai')}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.01 }}
          className="w-full relative group"
        >
          {/* Glow behind */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-xl group-hover:from-cyan-500/30 group-hover:to-purple-500/30 transition-all duration-500" />

          <div className="relative glass rounded-2xl p-5 flex items-center justify-between overflow-hidden">
            {/* Shimmer effect */}
            <div className="absolute inset-0 shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="flex items-center gap-4 relative z-10">
              <div className="bg-cyan-500/10 border border-cyan-500/20 p-2.5 rounded-xl">
                <Sparkles size={20} className="text-cyan-400" />
              </div>
              <div className="text-left">
                <p className="font-bold text-base text-white">What should I train today?</p>
                <p className="text-gray-500 text-xs mt-0.5">AI-powered suggestion</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-600 group-hover:text-cyan-400 transition-colors relative z-10" />
          </div>
        </motion.button>

        {/* Bento Stats Grid */}
        <StaggerContainer className="grid grid-cols-2 gap-3">
          <StaggerItem>
            <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="bg-orange-500/10 border border-orange-500/20 p-2.5 rounded-xl mb-3 relative z-10">
                <Flame size={22} className="text-orange-400" />
              </div>
              <span className="text-3xl font-extrabold text-white relative z-10">
                <AnimatedNumber value={streak} />
              </span>
              <span className="text-[11px] text-gray-500 mt-1 uppercase tracking-widest font-semibold relative z-10">Day Streak</span>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="bg-green-500/10 border border-green-500/20 p-2.5 rounded-xl mb-3 relative z-10">
                <Calendar size={22} className="text-green-400" />
              </div>
              <span className="text-3xl font-extrabold text-white relative z-10">
                <AnimatedNumber value={totalThisMonth} />
              </span>
              <span className="text-[11px] text-gray-500 mt-1 uppercase tracking-widest font-semibold relative z-10">This Month</span>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden group col-span-2">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="flex items-center gap-6 relative z-10">
                <div className="text-center">
                  <div className="bg-cyan-500/10 border border-cyan-500/20 p-2 rounded-xl mb-2 mx-auto w-fit">
                    <Dumbbell size={18} className="text-cyan-400" />
                  </div>
                  <span className="text-2xl font-extrabold text-white block"><AnimatedNumber value={sessions.length} /></span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Total Sessions</span>
                </div>
                <div className="w-px h-12 bg-white/5" />
                <div className="text-center">
                  <div className="bg-purple-500/10 border border-purple-500/20 p-2 rounded-xl mb-2 mx-auto w-fit">
                    <Zap size={18} className="text-purple-400" />
                  </div>
                  <span className="text-2xl font-extrabold text-white block"><AnimatedNumber value={totalExercises} /></span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Exercises Done</span>
                </div>
              </div>
            </div>
          </StaggerItem>
        </StaggerContainer>

        {/* Last Session */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-cyan-400" />
            Last Session
          </h2>

          {lastSession ? (
            <div className="glass rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <p className="text-sm text-gray-400 font-medium">{formatDate(lastSession.date)}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {lastSession.muscleGroups.map(mg => (
                      <span key={mg} className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] px-2.5 py-1 rounded-lg uppercase font-bold tracking-wider">
                        {mg}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-gray-600 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                  {lastSession.exercises.length} exercises
                </span>
              </div>

              <div className="space-y-2 relative z-10">
                {lastSession.exercises.slice(0, 3).map((ex, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-300">{ex.name}</span>
                    <span className="text-gray-600 font-medium">{ex.sets.length} sets</span>
                  </div>
                ))}
                {lastSession.exercises.length > 3 && (
                  <p className="text-xs text-gray-600 mt-1">+ {lastSession.exercises.length - 3} more</p>
                )}
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl p-8 text-center">
              <p className="text-gray-500 mb-3 text-sm">No workouts logged yet.</p>
              <Link to="/log" className="text-cyan-400 font-semibold text-sm hover:underline">
                Log your first workout →
              </Link>
            </div>
          )}
        </motion.div>

      </div>
    </PageWrapper>
  );
}
