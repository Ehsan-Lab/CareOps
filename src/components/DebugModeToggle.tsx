import React, { useState, useEffect } from 'react';
import { Bug, X } from 'lucide-react';
import { logger } from '../utils/logger';

export const DebugModeToggle: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState(logger.getConfig());

  useEffect(() => {
    // Load initial config
    setConfig(logger.getConfig());
  }, []);

  const handleLevelChange = (level: string) => {
    const newConfig = {
      ...config,
      level: level as 'debug' | 'info' | 'warn' | 'error',
      persist: true
    };
    logger.configure(newConfig);
    setConfig(newConfig);
  };

  const handleConsoleToggle = () => {
    const newConfig = {
      ...config,
      enableConsole: !config.enableConsole,
      persist: true
    };
    logger.configure(newConfig);
    setConfig(newConfig);
  };

  const handleReset = () => {
    logger.reset(true);
    setConfig(logger.getConfig());
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-2 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        title="Open Debug Settings"
        aria-label="Open Debug Settings"
      >
        <Bug size={24} aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white rounded-lg shadow-xl border border-gray-200 w-80">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Debug Settings</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-500"
          title="Close Debug Settings"
          aria-label="Close Debug Settings"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Log Level Selection */}
        <div>
          <label htmlFor="log-level" className="block text-sm font-medium text-gray-700 mb-2">
            Log Level
          </label>
          <select
            id="log-level"
            value={config.level}
            onChange={(e) => handleLevelChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            aria-label="Select Log Level"
          >
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>

        {/* Console Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Enable Console Output
          </span>
          <button
            onClick={handleConsoleToggle}
            className={`${
              config.enableConsole ? 'bg-indigo-600' : 'bg-gray-200'
            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
            role="switch"
            aria-checked={config.enableConsole ? "true" : "false"}
            title={config.enableConsole ? 'Disable Console Output' : 'Enable Console Output'}
          >
            <span className="sr-only">
              {config.enableConsole ? 'Disable Console Output' : 'Enable Console Output'}
            </span>
            <span
              className={`${
                config.enableConsole ? 'translate-x-5' : 'translate-x-0'
              } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              aria-hidden="true"
            />
          </button>
        </div>

        {/* Reset Button */}
        <button
          onClick={handleReset}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          title="Reset Debug Settings"
        >
          Reset to Defaults
        </button>

        <div className="text-xs text-gray-500 mt-2">
          Current Mode: {process.env.NODE_ENV}
        </div>
      </div>
    </div>
  );
}; 