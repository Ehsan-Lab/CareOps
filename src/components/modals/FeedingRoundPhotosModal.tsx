import React from 'react';
import { X, Link as LinkIcon, ExternalLink, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { feedingRoundServices } from '../../services/firebase/feedingRoundService';
import { FeedingRound } from '../../types';
import { format } from 'date-fns';

interface FeedingRoundPhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  round: FeedingRound;
}

export const FeedingRoundPhotosModal: React.FC<FeedingRoundPhotosModalProps> = ({
  isOpen,
  onClose,
  round
}) => {
  const queryClient = useQueryClient();
  const [driveLink, setDriveLink] = React.useState('');

  const handleAddLink = async () => {
    if (!driveLink) {
      alert('Please enter a Google Drive link');
      return;
    }

    if (!driveLink.includes('drive.google.com')) {
      alert('Please enter a valid Google Drive link');
      return;
    }

    try {
      await feedingRoundServices.addDriveLink(round.id, driveLink);
      await queryClient.invalidateQueries({ queryKey: ['feedingRounds'] });
      setDriveLink(''); // Clear input
      onClose(); // Close modal after successful add
    } catch (error) {
      console.error('Error adding drive link:', error);
      alert('Failed to add drive link');
    }
  };

  const handleDeleteLink = async () => {
    if (!window.confirm('Are you sure you want to remove this link?')) return;

    try {
      await feedingRoundServices.removeDriveLink(round.id);
      await queryClient.invalidateQueries({ queryKey: ['feedingRounds'] });
      onClose(); // Close modal after successful delete
    } catch (error) {
      console.error('Error removing drive link:', error);
      alert('Failed to remove drive link');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">
              Photos - {format(new Date(round.date), 'MMM d, yyyy')}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-5 w-5" />
            </button>
          </div>

          {!round.driveLink ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  placeholder="Enter Google Drive link"
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
                <button
                  onClick={handleAddLink}
                  className="flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
                >
                  <LinkIcon className="h-4 w-4" />
                  Add Link
                </button>
              </div>
              <p className="text-sm text-gray-500">
                Please provide a Google Drive link to the photos folder
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <a
                  href={round.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Photos in Google Drive
                </a>
                <button
                  onClick={handleDeleteLink}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 