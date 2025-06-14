import { useState, useEffect, type FC } from 'react';
import type { RoomSettings, JudgeAlgorithm } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: RoomSettings;
  onSaveSettings: (settings: RoomSettings) => void;
}

const SettingsModal: FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [localSettings, setLocalSettings] = useState<RoomSettings>(settings);
  const [estimateOptionsInput, setEstimateOptionsInput] = useState<string>(
    settings.estimateOptions.join(',')
  );

  // Reset local state when settings prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      setEstimateOptionsInput(settings.estimateOptions.join(','));
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleChange = (
    key: keyof RoomSettings,
    value: boolean | (string | number)[] | JudgeAlgorithm
  ) => {
    setLocalSettings({
      ...localSettings,
      [key]: value,
    });
  };

  const handleEstimateOptionsChange = (value: string) => {
    setEstimateOptionsInput(value);
    
    const options = value.split(',')
      .map(item => item.trim())
      .filter(item => item !== '')
      .map(item => {
        const num = Number(item);
        return Number.isNaN(num) ? item : num;
      });
    
    setLocalSettings({
      ...localSettings,
      estimateOptions: options,
    });
  };

  const handleSave = () => {
    console.log('Saving settings from modal:', localSettings);
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-semibold">Room Settings</h2>
          <button 
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <title>Close settings modal</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto pr-1 flex-grow">
          <div>
            <label htmlFor="estimateOptions" className="block text-sm font-medium text-gray-700 mb-1">
              Estimate Options
            </label>
            <input
              id="estimateOptions"
              type="text"
              value={estimateOptionsInput}
              onChange={(e) => handleEstimateOptionsChange(e.target.value)}
              placeholder="e.g., 0,0.5,1,2,3,5,8,13,21,?"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">Separate values with commas</p>
          </div>

          <div className="pt-2">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Jira Integration</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableJiraIntegration"
                  checked={localSettings.enableJiraIntegration || false}
                  onChange={(e) => handleChange('enableJiraIntegration', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="enableJiraIntegration" className="ml-2 text-sm text-gray-700">
                  Enable Jira Integration
                </label>
              </div>
              {localSettings.enableJiraIntegration && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoUpdateJiraStoryPoints"
                    checked={localSettings.autoUpdateJiraStoryPoints || false}
                    onChange={(e) => handleChange('autoUpdateJiraStoryPoints', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoUpdateJiraStoryPoints" className="ml-2 text-sm text-gray-700">
                    Auto-update story points in Jira when voting completes
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <h3 className="text-sm font-medium text-gray-700 mb-2">The Judge</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableJudge"
                  checked={localSettings.enableJudge}
                  onChange={(e) => handleChange('enableJudge', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="enableJudge" className="ml-2 text-sm text-gray-700">
                  Enable The Judge (permanent member that decides the best score)
                </label>
              </div>
              {localSettings.enableJudge && (
                <div className="ml-6">
                  <label htmlFor="judgeAlgorithm" className="block text-sm text-gray-700 mb-1">
                    Algorithm
                  </label>
                  <select
                    id="judgeAlgorithm"
                    value={localSettings.judgeAlgorithm}
                    onChange={(e) => handleChange('judgeAlgorithm', e.target.value as JudgeAlgorithm)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="smartConsensus">Smart Consensus</option>
                    <option value="conservativeMode">Conservative Mode</option>
                    <option value="optimisticMode">Optimistic Mode</option>
                    <option value="simpleAverage">Simple Average</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {localSettings.judgeAlgorithm === 'smartConsensus' && 
                      'Intelligently identifies consensus in voting patterns across different scenarios'}
                    {localSettings.judgeAlgorithm === 'conservativeMode' && 
                      'Biases towards higher estimates to account for unforeseen complexity'}
                    {localSettings.judgeAlgorithm === 'optimisticMode' && 
                      'Biases towards lower estimates assuming team efficiency'}
                    {localSettings.judgeAlgorithm === 'simpleAverage' && 
                      'Simple mathematical average of all votes'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

          <div className="pt-2">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Permissions</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowOthersToShowEstimates"
                  checked={localSettings.allowOthersToShowEstimates}
                  onChange={(e) => handleChange('allowOthersToShowEstimates', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allowOthersToShowEstimates" className="ml-2 text-sm text-gray-700">
                  Allow others to show estimates
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowOthersToDeleteEstimates"
                  checked={localSettings.allowOthersToDeleteEstimates}
                  onChange={(e) => handleChange('allowOthersToDeleteEstimates', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="allowOthersToDeleteEstimates" className="ml-2 text-sm text-gray-700">
                  Allow others to delete estimates
                </label>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Display Options</h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showTimer"
                  checked={localSettings.showTimer}
                  onChange={(e) => handleChange('showTimer', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="showTimer" className="ml-2 text-sm text-gray-700">
                  Show timer
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showUserPresence"
                  checked={localSettings.showUserPresence}
                  onChange={(e) => handleChange('showUserPresence', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="showUserPresence" className="ml-2 text-sm text-gray-700">
                  Show user presence
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showAverage"
                  checked={localSettings.showAverage}
                  onChange={(e) => handleChange('showAverage', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="showAverage" className="ml-2 text-sm text-gray-700">
                  Show average
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showMedian"
                  checked={localSettings.showMedian}
                  onChange={(e) => handleChange('showMedian', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="showMedian" className="ml-2 text-sm text-gray-700">
                  Show median
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="anonymousVotes"
                  checked={localSettings.anonymousVotes}
                  onChange={(e) => handleChange('anonymousVotes', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="anonymousVotes" className="ml-2 text-sm text-gray-700">
                  Anonymous votes in sidebar
                </label>
              </div>
            </div>
          </div>

        <div className="mt-6 flex justify-end space-x-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal; 