import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import { TrendingUp, Search } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';

export default function Progress() {
  const { getExerciseHistory } = useWorkoutStore();
  const [searchTerm, setSearchTerm] = useState('bench press');

  const chartData = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return getExerciseHistory(searchTerm)
      .map(entry => ({
        date: new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight: entry.maxWeight,
        fullDate: entry.date,
      }))
      .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
  }, [searchTerm, getExerciseHistory]);

  return (
    <PageWrapper>
      <div className="pt-4 pb-24 space-y-6">
        <div>
          <h1 className="text-4xl font-extrabold text-white mb-1">Progress</h1>
          <p className="text-gray-500 text-sm">Track your max weight over time.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="relative"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search exercise (e.g. Squat)"
            className="w-full glass rounded-2xl py-3.5 pl-11 pr-4 text-white focus:border-cyan-500/40 outline-none transition-colors text-sm bg-transparent"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.18 }}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="text-cyan-400" size={18} />
            <h2 className="font-semibold text-white text-sm">
              Max Weight: <span className="capitalize text-gradient">{searchTerm || '...'}</span>
            </h2>
          </div>

          {chartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <defs>
                    <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" stroke="#444" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#444" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v}kg`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 15, 25, 0.9)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    itemStyle={{ color: '#06B6D4', fontWeight: 'bold' }}
                    labelStyle={{ color: '#666', marginBottom: '4px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    name="Max Weight"
                    stroke="#06B6D4"
                    strokeWidth={2.5}
                    fill="url(#weightGradient)"
                    dot={{ fill: '#06B6D4', strokeWidth: 2, r: 4, stroke: '#0A0A0F' }}
                    activeDot={{ r: 6, fill: '#22D3EE', stroke: '#0A0A0F' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-600">
              <TrendingUp size={32} className="mb-3 opacity-20" />
              <p className="text-sm">No data for "{searchTerm}"</p>
              <p className="text-xs mt-1">Log this exercise to track progress</p>
            </div>
          )}
        </motion.div>
      </div>
    </PageWrapper>
  );
}
