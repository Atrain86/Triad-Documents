import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Star, Target, Gift, Zap, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface ChallengeStats {
  receiptsUploaded: number;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  level: number;
  weeklyGoal: number;
  weeklyProgress: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  requirement: number;
}

const paintBrainColors = {
  purple: '#8B5FBF',
  orange: '#D4A574', 
  yellow: '#DCDCAA',
  green: '#6A9955',
  blue: '#569CD6',
  red: '#F44747'
};

export default function ReceiptUploadChallenge({ projectId }: { projectId: number }) {
  const [showReward, setShowReward] = useState(false);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);

  // Fetch challenge statistics
  const { data: stats, isLoading } = useQuery<ChallengeStats>({
    queryKey: ['/api/receipt-challenge/stats', projectId],
  });

  // Fetch achievements
  const { data: achievements = [] } = useQuery<Achievement[]>({
    queryKey: ['/api/receipt-challenge/achievements', projectId],
  });

  // Calculate level progress
  const getPointsForNextLevel = (level: number) => (level + 1) * 100;
  const getCurrentLevelProgress = (points: number, level: number) => {
    const currentLevelPoints = level * 100;
    const nextLevelPoints = getPointsForNextLevel(level);
    return ((points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;
  };

  // Show achievement notification
  const showAchievementUnlocked = (achievement: Achievement) => {
    setNewAchievement(achievement);
    setTimeout(() => setNewAchievement(null), 4000);
  };

  if (isLoading || !stats) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4 w-1/3"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  const levelProgress = getCurrentLevelProgress(stats.totalPoints, stats.level);
  const weeklyProgressPercent = (stats.weeklyProgress / stats.weeklyGoal) * 100;

  return (
    <div className="space-y-4">
      {/* Achievement Notification */}
      {newAchievement && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg p-4 shadow-lg animate-bounce">
          <div className="flex items-center gap-3">
            <Trophy size={24} />
            <div>
              <h4 className="font-bold">Achievement Unlocked!</h4>
              <p className="text-sm">{newAchievement.title}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Challenge Card */}
      <div 
        className="rounded-lg p-6 border-2" 
        style={{ 
          backgroundColor: '#1a1a1a',
          borderColor: paintBrainColors.purple,
          boxShadow: `0 0 20px ${paintBrainColors.purple}30`
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap size={24} style={{ color: paintBrainColors.yellow }} />
            Receipt Upload Challenge
          </h3>
          <div className="text-right">
            <p className="text-sm text-gray-400">Level {stats.level}</p>
            <p className="text-lg font-bold" style={{ color: paintBrainColors.orange }}>
              {stats.totalPoints} points
            </p>
          </div>
        </div>

        {/* Level Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Level {stats.level}</span>
            <span>{getPointsForNextLevel(stats.level)} pts to next level</span>
          </div>
          <Progress 
            value={levelProgress} 
            className="h-3"
            style={{ 
              backgroundColor: '#333',
            }}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-gray-800">
            <div className="text-2xl font-bold" style={{ color: paintBrainColors.green }}>
              {stats.receiptsUploaded}
            </div>
            <div className="text-sm text-gray-400">Receipts</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-gray-800">
            <div className="text-2xl font-bold" style={{ color: paintBrainColors.orange }}>
              {stats.currentStreak}
            </div>
            <div className="text-sm text-gray-400">Day Streak</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-gray-800">
            <div className="text-2xl font-bold" style={{ color: paintBrainColors.blue }}>
              {stats.longestStreak}
            </div>
            <div className="text-sm text-gray-400">Best Streak</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-gray-800">
            <div className="text-2xl font-bold" style={{ color: paintBrainColors.purple }}>
              {achievements.filter(a => a.unlocked).length}
            </div>
            <div className="text-sm text-gray-400">Achievements</div>
          </div>
        </div>

        {/* Weekly Challenge */}
        <div className="mb-6 p-4 rounded-lg bg-gray-800 border-l-4" style={{ borderColor: paintBrainColors.yellow }}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-white flex items-center gap-2">
              <Target size={18} style={{ color: paintBrainColors.yellow }} />
              Weekly Challenge
            </h4>
            <span className="text-sm text-gray-400">
              {stats.weeklyProgress}/{stats.weeklyGoal} receipts
            </span>
          </div>
          <Progress 
            value={weeklyProgressPercent} 
            className="h-2 mb-2"
            style={{ backgroundColor: '#444' }}
          />
          <p className="text-sm text-gray-400">
            {stats.weeklyGoal - stats.weeklyProgress > 0 
              ? `${stats.weeklyGoal - stats.weeklyProgress} more receipts to complete this week's challenge!`
              : "🎉 Weekly challenge completed! Bonus points earned!"
            }
          </p>
        </div>

        {/* Achievements Preview */}
        <div>
          <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Award size={18} style={{ color: paintBrainColors.orange }} />
            Recent Achievements
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {achievements.slice(0, 4).map((achievement) => (
              <div 
                key={achievement.id} 
                className={`p-3 rounded-lg border ${
                  achievement.unlocked 
                    ? 'bg-gray-700 border-green-500' 
                    : 'bg-gray-800 border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`text-2xl ${achievement.unlocked ? '' : 'grayscale opacity-50'}`}>
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <h5 className={`font-medium ${
                      achievement.unlocked ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      {achievement.title}
                    </h5>
                    <p className="text-xs text-gray-500">{achievement.description}</p>
                    {!achievement.unlocked && (
                      <div className="mt-1">
                        <Progress 
                          value={(achievement.progress / achievement.requirement) * 100} 
                          className="h-1"
                        />
                        <span className="text-xs text-gray-500">
                          {achievement.progress}/{achievement.requirement}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Tips */}
        <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: '#2a2a2a' }}>
          <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
            <Gift size={18} style={{ color: paintBrainColors.green }} />
            Earning Points
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span style={{ color: paintBrainColors.green }}>+10 pts</span>
              <span className="text-gray-400">Upload receipt</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: paintBrainColors.yellow }}>+25 pts</span>
              <span className="text-gray-400">Daily streak bonus</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ color: paintBrainColors.purple }}>+100 pts</span>
              <span className="text-gray-400">Weekly challenge</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}