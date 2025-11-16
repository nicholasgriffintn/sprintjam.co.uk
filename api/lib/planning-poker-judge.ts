import type { JudgeAlgorithm, JudgeResult } from '../types';
import { findClosestOption } from '../utils/judge';

export class PlanningPokerJudge {
  calculateJudgeScore(numericVotes: number[], algorithm: JudgeAlgorithm, validOptions: number[]): JudgeResult {
    if (numericVotes.length === 0) {
      return {
        score: null,
        confidence: 'low',
        needsDiscussion: false,
        reasoning: 'No votes to analyze'
      };
    }

    if (numericVotes.length === 1) {
      return {
        score: numericVotes[0],
        confidence: 'low',
        needsDiscussion: false,
        reasoning: 'No consensus possible'
      };
    }

    const sortedVotes = [...numericVotes].sort((a, b) => a - b);
    const distribution = this.getVoteDistribution(numericVotes);
    const stats = this.calculateBasicStats(sortedVotes);
    
    switch (algorithm) {
      case 'smartConsensus':
        return this.smartConsensus(sortedVotes, distribution, stats, validOptions);
      
      case 'conservativeMode':
        return this.conservativeMode(sortedVotes, stats, validOptions);
      
      case 'optimisticMode':
        return this.optimisticMode(sortedVotes, stats, validOptions);
      
      case 'simpleAverage':
        return this.simpleAverage(stats, validOptions);
      
      default:
        return this.smartConsensus(sortedVotes, distribution,stats, validOptions);
    }
  }

  private getVoteDistribution(votes: number[]): Record<number, number> {
    const distribution: Record<number, number> = {};
    votes.forEach(vote => {
      distribution[vote] = (distribution[vote] || 0) + 1;
    });
    return distribution;
  }

  private calculateBasicStats(sortedVotes: number[]) {
    const median = sortedVotes.length % 2 === 0
      ? (sortedVotes[sortedVotes.length / 2 - 1] + sortedVotes[sortedVotes.length / 2]) / 2
      : sortedVotes[Math.floor(sortedVotes.length / 2)];
    
    const mean = sortedVotes.reduce((sum, vote) => sum + vote, 0) / sortedVotes.length;
    const min = sortedVotes[0];
    const max = sortedVotes[sortedVotes.length - 1];
    const range = max - min;
    
    return { median, mean, min, max, range };
  }

  private smartConsensus(
    sortedVotes: number[], 
    distribution: Record<number, number>, 
    stats: any, 
    validOptions: number[]
  ): JudgeResult {
    const totalVotes = sortedVotes.length;
    
    // Find the most common vote(s)
    const maxCount = Math.max(...Object.values(distribution));
    const modes = Object.entries(distribution)
      .filter(([_, count]) => count === maxCount)
      .map(([vote, _]) => Number(vote));
    
    // Check for strong consensus (>60% on single value)
    if (modes.length === 1 && maxCount / totalVotes >= 0.6) {
      return {
        score: modes[0],
        confidence: 'high',
        needsDiscussion: false,
        reasoning: `Strong consensus: ${maxCount}/${totalVotes} voted for ${modes[0]}`
      };
    }
    
    // Check for adjacent consensus (majority within one step)
    const adjacentGroups = this.findAdjacentGroups(distribution, validOptions);
    const bestGroup = adjacentGroups.reduce((best, group) => 
      group.totalVotes > best.totalVotes ? group : best
    , { values: [], totalVotes: 0 });
    
    if (bestGroup.totalVotes / totalVotes >= 0.7) {
      const weightedAvg = bestGroup.values.reduce((sum, val) => 
        sum + val * distribution[val], 0
      ) / bestGroup.totalVotes;
      
      const closestValid = findClosestOption(weightedAvg, validOptions);
      
      return {
        score: closestValid,
        confidence: 'medium',
        needsDiscussion: false,
        reasoning: `Adjacent consensus: ${bestGroup.totalVotes}/${totalVotes} votes clustered around ${closestValid}`
      };
    }
    
    if (stats.range > this.getMaxReasonableRange(validOptions)) {
      return {
        score: Math.round(stats.median),
        confidence: 'low',
        needsDiscussion: true,
        reasoning: `Wide spread (${stats.min}-${stats.max}) suggests different understanding of requirements`
      };
    }
    
    const closestValid = findClosestOption(stats.median, validOptions);
    return {
      score: closestValid,
      confidence: 'medium',
      needsDiscussion: stats.range > stats.median * 0.5,
      reasoning: `Moderate spread - using median (${closestValid})`
    };
  }

  private conservativeMode(
    sortedVotes: number[],
    stats: any, 
    validOptions: number[]
  ): JudgeResult {
    // In conservative mode, we bias toward higher estimates
    // Use 75th percentile to account for complexity that might be missed
    const p75Index = Math.ceil(sortedVotes.length * 0.75) - 1;
    const p75 = sortedVotes[p75Index];
    
    const closestValid = findClosestOption(p75, validOptions);
    
    const confidence = stats.range <= stats.median * 0.3 ? 'high' : 
                      stats.range <= stats.median * 0.8 ? 'medium' : 'low';
    
    return {
      score: closestValid,
      confidence,
      needsDiscussion: confidence === 'low',
      reasoning: `Conservative estimate using 75th percentile (${closestValid}) to account for potential complexity`
    };
  }

  private optimisticMode(
    sortedVotes: number[],
    stats: any, 
    validOptions: number[]
  ): JudgeResult {
    // In optimistic mode, we bias toward lower estimates
    // Use 25th percentile assuming team efficiency
    const p25Index = Math.floor(sortedVotes.length * 0.25);
    const p25 = sortedVotes[p25Index];
    
    const closestValid = findClosestOption(p25, validOptions);
    
    const confidence = stats.range <= stats.median * 0.3 ? 'high' : 
                      stats.range <= stats.median * 0.8 ? 'medium' : 'low';
    
    return {
      score: closestValid,
      confidence,
      needsDiscussion: confidence === 'low',
      reasoning: `Optimistic estimate using 25th percentile (${closestValid}) assuming team efficiency`
    };
  }

  private simpleAverage(
    stats: any, 
    validOptions: number[]
  ): JudgeResult {
    const closestValid = findClosestOption(stats.mean, validOptions);
    
    const confidence = stats.range <= stats.mean * 0.2 ? 'high' : 
                      stats.range <= stats.mean * 0.6 ? 'medium' : 'low';
    
    return {
      score: closestValid,
      confidence,
      needsDiscussion: confidence === 'low',
      reasoning: `Simple average (${closestValid}) of all votes`
    };
  }

  private findAdjacentGroups(distribution: Record<number, number>, validOptions: number[]) {
    const sortedOptions = [...validOptions].sort((a, b) => a - b);
    const groups: { values: number[], totalVotes: number }[] = [];
    
    for (let i = 0; i < sortedOptions.length; i++) {
      const current = sortedOptions[i];
      const next = sortedOptions[i + 1];
      
      if (distribution[current]) {
        let group = { values: [current], totalVotes: distribution[current] };
        
        // Add adjacent values if they exist
        if (next && distribution[next]) {
          group.values.push(next);
          group.totalVotes += distribution[next];
        }
        
        groups.push(group);
      }
    }
    
    // If no groups found, return an empty group to avoid errors
    if (groups.length === 0) {
      return [{ values: [], totalVotes: 0 }];
    }
    
    return groups;
  }

  private getMaxReasonableRange(validOptions: number[]): number {
    // Consider a range "wide" if it spans more than 3 fibonacci-style steps
    if (validOptions.length === 0) return 10;
    
    const sorted = [...validOptions].sort((a, b) => a - b);
    const midIndex = Math.floor(sorted.length / 2);
    return sorted[midIndex] * 2; // Reasonable range is 2x the median option
  }
}
