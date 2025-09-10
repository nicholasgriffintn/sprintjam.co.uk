import { motion } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { Info } from 'lucide-react';
import type { VotingCriterion, ScoringRule, StructuredVote } from '../types';
import { createStructuredVote } from '../utils/structured-voting';

interface StructuredVotingPanelProps {
  criteria: VotingCriterion[];
  scoringRules: ScoringRule[];
  currentVote: StructuredVote | null;
  onVote: (vote: StructuredVote) => void;
}

interface CriterionRowProps {
  criterion: VotingCriterion;
  score: number | null;
  onScoreChange: (score: number) => void;
}

function CriterionRow({ criterion, score, onScoreChange }: CriterionRowProps) {
  const scoreButtons = [];
  
  for (let i = criterion.minScore; i <= criterion.maxScore; i++) {
    scoreButtons.push(
      <motion.button
        key={i}
        type="button"
        onClick={() => onScoreChange(i)}
        className={`w-8 h-8 flex items-center justify-center text-sm font-medium border rounded ${
          score === i
            ? 'border-blue-500 bg-blue-100 text-blue-700'
            : 'border-gray-300 hover:border-gray-400 bg-white'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {i}
      </motion.button>
    );
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
      <div className="flex-1">
        <div className="font-medium text-gray-900">{criterion.name}</div>
        <div className="text-xs text-gray-500">{criterion.description}</div>
      </div>
      <div className="flex gap-1 ml-4">
        {scoreButtons}
      </div>
    </div>
  );
}

export function StructuredVotingPanel({ 
  criteria, 
  scoringRules, 
  currentVote, 
  onVote 
}: StructuredVotingPanelProps) {
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>(() => {
    if (currentVote?.criteriaScores) {
      return { ...currentVote.criteriaScores };
    }
    return {};
  });

  const [showScoringInfo, setShowScoringInfo] = useState(false);

  useEffect(() => {
    if (!currentVote) {
      setCriteriaScores({});
    }
  }, [currentVote]);

  const calculatedVote = useMemo(() => {
    return createStructuredVote(criteriaScores, scoringRules);
  }, [criteriaScores, scoringRules]);

  const appliedRule = useMemo(() => {
    const totalScore = Object.values(criteriaScores).reduce((sum, score) => sum + score, 0);
    
    for (const rule of scoringRules) {
      let matchesRule = true;
      for (const condition of rule.conditions) {
        const score = criteriaScores[condition.criterionId];
        if (score === undefined || score < condition.minScore || score > condition.maxScore) {
          matchesRule = false;
          break;
        }
      }
      if (matchesRule && (rule.maxTotalScore === undefined || totalScore <= rule.maxTotalScore)) {
        return rule;
      }
    }
    return null;
  }, [criteriaScores, scoringRules]);

  const handleScoreChange = (criterionId: string, score: number) => {
    const newScores = { ...criteriaScores, [criterionId]: score };
    setCriteriaScores(newScores);
    
    const newVote = createStructuredVote(newScores, scoringRules);
    onVote(newVote);
  };

  const totalScore = Object.values(criteriaScores).reduce((sum, score) => sum + score, 0);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Structured Estimation</h2>
        <button
          type="button"
          onClick={() => setShowScoringInfo(!showScoringInfo)}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
            showScoringInfo 
              ? 'text-blue-600 bg-blue-50 border border-blue-200' 
              : 'text-gray-500 hover:text-gray-700 border border-transparent'
          }`}
        >
          <Info size={14} />
          Scoring Info
        </button>
      </div>

      <div className="bg-white border rounded-lg p-3 mb-4">
        {criteria.map((criterion) => (
          <CriterionRow
            key={criterion.id}
            criterion={criterion}
            score={criteriaScores[criterion.id] ?? null}
            onScoreChange={(score) => handleScoreChange(criterion.id, score)}
          />
        ))}
      </div>

      {showScoringInfo && (
        <div className="mb-4 p-3 bg-gray-50 border rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-2">Scoring Rules</div>
          <div className="text-xs text-gray-600 space-y-1">
            {scoringRules.map((rule, index) => (
              <div key={index} className={`${appliedRule === rule ? 'text-blue-600 font-medium' : ''}`}>
                <span className="font-medium">{rule.storyPoints}pt:</span> {
                  rule.conditions.map((c) => 
                    `${criteria.find(cr => cr.id === c.criterionId)?.name} ${c.minScore}-${c.maxScore}`
                  ).join(', ')
                }
                {rule.maxTotalScore !== undefined && ` (max total: ${rule.maxTotalScore})`}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between p-3 border-2 border-blue-200 rounded-lg bg-blue-50">
        <div>
          <div className="font-medium text-blue-900">Story Points: {calculatedVote.calculatedStoryPoints || '?'}</div>
          <div className="text-xs text-blue-700">Total score: {totalScore}</div>
        </div>
        {appliedRule && (
          <div className="text-xs text-blue-600">
            Rule applied: {appliedRule.storyPoints}pt
          </div>
        )}
      </div>
    </div>
  );
}
