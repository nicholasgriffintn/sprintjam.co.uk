import type { FC, ChangeEvent, FormEvent } from 'react';

interface JoinRoomScreenProps {
  name: string;
  roomKey: string;
  onNameChange: (name: string) => void;
  onRoomKeyChange: (key: string) => void;
  onJoinRoom: () => void;
  onBack: () => void;
  error: string;
  onClearError: () => void;
}

const JoinRoomScreen: FC<JoinRoomScreenProps> = ({
  name,
  roomKey,
  onNameChange,
  onRoomKeyChange,
  onJoinRoom,
  onBack,
  error,
  onClearError,
}) => {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (name && roomKey) {
      onClearError();
      onJoinRoom();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <h1 className="text-2xl font-bold text-blue-600">Join Existing Room</h1>

      <form onSubmit={handleSubmit} className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        {error && (
          <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          <label htmlFor="join-name" className="block mb-2 text-sm font-medium text-gray-700">
            Your Name
          </label>
          <input
            id="join-name"
            type="text"
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onNameChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your name"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="join-room-key" className="block mb-2 text-sm font-medium text-gray-700">
            Room Key
          </label>
          <input
            id="join-room-key"
            type="text"
            value={roomKey}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onRoomKeyChange(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter room key"
            required
          />
        </div>

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={!name || !roomKey}
            className={`flex-1 px-4 py-2 text-white rounded-md ${
              name && roomKey
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-blue-300 cursor-not-allowed'
            }`}
          >
            Join Room
          </button>
        </div>
      </form>
    </div>
  );
};

export default JoinRoomScreen; 