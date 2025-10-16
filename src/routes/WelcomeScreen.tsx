import type { FC } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Github, Zap, Shield, Timer, BarChart3 } from 'lucide-react';

interface WelcomeScreenProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

const WelcomeScreen: FC<WelcomeScreenProps> = ({
  onCreateRoom,
  onJoinRoom,
}) => {
  const features = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Real-time Voting",
      description: "Live collaboration with instant updates"
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: "Smart Consensus",
      description: "Automated consensus detection and recommendations"
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Privacy First",
      description: "No ads, no tracking, open source"
    },
    {
      icon: <Timer className="w-5 h-5" />,
      title: "Voting Options",
      description: "Multi-criteria estimation systems"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="mb-8"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              Welcome to SprintJam
            </h1>
            <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Collaborative planning poker for agile teams, <span className="font-semibold text-gray-800 dark:text-gray-200">without the ads</span>
            </p>
          </motion.div>

          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            <motion.button
              type="button"
              onClick={onCreateRoom}
              className="relative px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                <Plus className="w-5 h-5" />
                <span>Create New Room</span>
              </div>
            </motion.button>

            <motion.button
              type="button"
              onClick={onJoinRoom}
              className="group px-8 py-4 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-semibold rounded-xl border-2 border-blue-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-gray-500 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-center gap-3">
                <Users className="w-5 h-5" />
                <span>Join Existing Room</span>
              </div>
            </motion.button>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.2 }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:border-blue-200 dark:hover:border-gray-600 hover:shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.3 + index * 0.05 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white mb-3">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            className="flex flex-col sm:flex-row items-center justify-center gap-6 text-gray-600 dark:text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.4 }}
          >
            <a 
              href="https://github.com/nicholasgriffintn/sprintjam.co.uk" 
              className="flex items-center gap-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 group"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
              <span>View source code</span>
            </a>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default WelcomeScreen; 