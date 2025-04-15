import type { FC} from 'react';

interface WelcomeScreenProps {
  onCreateRoomClick: () => void;
  onJoinRoomClick: () => void;
}

const WelcomeScreen: FC<WelcomeScreenProps> = ({
  onCreateRoomClick,
  onJoinRoomClick,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <h1 className="text-3xl font-bold text-blue-600">Welcome to SprintJam</h1>
      <p className="text-gray-600">
        Collaborative planning poker for agile teams, without the ads.
      </p>

      <div className="flex flex-col space-y-4">
        <button
          type="button"
          onClick={onCreateRoomClick}
          className="px-6 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600"
        >
          Create Room
        </button>
        <button
          type="button"
          onClick={onJoinRoomClick}
          className="px-6 py-2 text-blue-500 bg-white border border-blue-500 rounded-md hover:bg-blue-50"
        >
          Join Room
        </button>

        <p className="mt-4 text-gray-600">
          <a href="https://github.com/nicholasgriffintn/sprintjam.co.uk" className="text-blue-500 hover:underline">
            View the source code on GitHub
          </a>
        </p>
      </div>
    </div>
  );
};

export default WelcomeScreen; 