import type { FC, ChangeEvent } from 'react';

interface CreateRoomScreenProps {
  name: string;
  onNameChange: (name: string) => void;
  onCreateRoom: () => void;
  onBack: () => void;
}

const CreateRoomScreen: FC<CreateRoomScreenProps> = ({
  name,
  onNameChange,
  onCreateRoom,
  onBack,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-6">
      <h1 className="text-2xl font-bold text-blue-600">Create New Room</h1>

      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <div className="mb-4">
          <label htmlFor="create-name" className="block mb-2 text-sm font-medium text-gray-700">
            Your Name
          </label>
          <input
            id="create-name"
            type="text"
            value={name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onNameChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your name"
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
            type="button"
            onClick={onCreateRoom}
            disabled={!name}
            className={`flex-1 px-4 py-2 text-white rounded-md ${
              name
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-blue-300 cursor-not-allowed'
            }`}
          >
            Create Room
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateRoomScreen; 