import React from 'react';

interface LoginFrequencyChartProps {
  loginData: { date: string; count: number }[];
}

const LoginFrequencyChart: React.FC<LoginFrequencyChartProps> = ({ loginData }) => {
  const maxCount = Math.max(...loginData.map(d => d.count), 0);

  return (
    <div className="bg-background/50 p-6 rounded-lg border border-border h-full">
        <h3 className="text-lg font-serif font-bold text-card-foreground mb-4">Logins This Week</h3>
        <div className="flex justify-between items-end h-48 space-x-2">
            {loginData.map(({ date, count }) => (
                <div key={date} className="flex-1 flex flex-col items-center justify-end group">
                    <div className="text-sm font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity mb-1">{count}</div>
                    <div
                        className="w-full bg-primary/20 rounded-t-md hover:bg-primary/40 transition-colors"
                        style={{ height: maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%' }}
                        title={`${count} logins on ${date}`}
                    ></div>
                    <div className="text-xs text-foreground/70 mt-2">{new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default LoginFrequencyChart;