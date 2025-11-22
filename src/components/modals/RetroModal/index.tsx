import { useState, useMemo } from 'react';
import { Plus, ThumbsUp, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import type { RetroFormat, RetroItem } from '@/types';

interface RetroModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

const RETRO_FORMATS: Record<
  RetroFormat,
  { label: string; categories: string[]; description: string }
> = {
  'start-stop-continue': {
    label: 'Start, Stop, Continue',
    categories: ['Start', 'Stop', 'Continue'],
    description: 'What should we start doing, stop doing, and continue doing?',
  },
  'went-well-improve-actions': {
    label: 'What Went Well / What to Improve / Actions',
    categories: ['What Went Well', 'What to Improve', 'Action Items'],
    description: 'Reflect on successes, areas for improvement, and concrete actions.',
  },
  'mad-sad-glad': {
    label: 'Mad, Sad, Glad',
    categories: ['Mad', 'Sad', 'Glad'],
    description: 'What made you mad, sad, or glad during the sprint?',
  },
  'four-ls': {
    label: '4 Ls: Liked, Learned, Lacked, Longed For',
    categories: ['Liked', 'Learned', 'Lacked', 'Longed For'],
    description: 'What did you like, learn, lack, and long for?',
  },
};

export const RetroModal = ({ isOpen, onClose, userName }: RetroModalProps) => {
  const [format, setFormat] = useState<RetroFormat>('went-well-improve-actions');
  const [items, setItems] = useState<RetroItem[]>([]);
  const [newItemContent, setNewItemContent] = useState<Record<string, string>>(
    {}
  );
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const currentFormat = RETRO_FORMATS[format];
  const categories = currentFormat.categories;

  const handleAddItem = (category: string) => {
    const content = newItemContent[category]?.trim();
    if (!content) return;

    const newItem: RetroItem = {
      id: `${Date.now()}-${Math.random()}`,
      category,
      content,
      author: userName,
      votes: 0,
      createdAt: Date.now(),
    };

    setItems([...items, newItem]);
    setNewItemContent({ ...newItemContent, [category]: '' });
    setActiveCategory(null);
  };

  const handleVote = (itemId: string) => {
    setItems(
      items.map((item) =>
        item.id === itemId ? { ...item, votes: item.votes + 1 } : item
      )
    );
  };

  const handleDeleteItem = (itemId: string) => {
    setItems(items.filter((item) => item.id !== itemId));
  };

  const itemsByCategory = useMemo(() => {
    return categories.reduce(
      (acc, category) => {
        acc[category] = items
          .filter((item) => item.category === category)
          .sort((a, b) => b.votes - a.votes);
        return acc;
      },
      {} as Record<string, RetroItem[]>
    );
  }, [items, categories]);

  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
      'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
      'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
      'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
    ];
    return colors[index % colors.length];
  };

  const getCategoryTextColor = (index: number) => {
    const colors = [
      'text-blue-900 dark:text-blue-100',
      'text-purple-900 dark:text-purple-100',
      'text-green-900 dark:text-green-100',
      'text-amber-900 dark:text-amber-100',
    ];
    return colors[index % colors.length];
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
            Sprint Retrospective
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Reflect on the sprint and identify improvements for the team.
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Retrospective Format
          </label>
          <div className="grid grid-cols-1 gap-2">
            {(Object.keys(RETRO_FORMATS) as RetroFormat[]).map((formatKey) => (
              <button
                key={formatKey}
                onClick={() => setFormat(formatKey)}
                className={`text-left rounded-lg border-2 p-3 transition-all ${
                  format === formatKey
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="font-medium text-slate-900 dark:text-white">
                  {RETRO_FORMATS[formatKey].label}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {RETRO_FORMATS[formatKey].description}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {categories.map((category, index) => (
            <SurfaceCard
              key={category}
              className={`border-2 ${getCategoryColor(index)}`}
            >
              <h3
                className={`text-lg font-semibold mb-3 ${getCategoryTextColor(index)}`}
              >
                {category}
              </h3>

              <div className="space-y-2 mb-3">
                {itemsByCategory[category]?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-slate-900 dark:text-white">
                        {item.content}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        by {item.author}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVote(item.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm"
                        aria-label="Vote for this item"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        <span className="font-medium">{item.votes}</span>
                      </button>
                      {item.author === userName && (
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          aria-label="Delete this item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {activeCategory === category ? (
                <div className="space-y-2">
                  <textarea
                    value={newItemContent[category] || ''}
                    onChange={(e) =>
                      setNewItemContent({
                        ...newItemContent,
                        [category]: e.target.value,
                      })
                    }
                    placeholder={`Add your thoughts about ${category.toLowerCase()}...`}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAddItem(category)}
                      disabled={!newItemContent[category]?.trim()}
                      size="sm"
                    >
                      Add
                    </Button>
                    <Button
                      onClick={() => {
                        setActiveCategory(null);
                        setNewItemContent({
                          ...newItemContent,
                          [category]: '',
                        });
                      }}
                      variant="secondary"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setActiveCategory(category)}
                  variant="secondary"
                  size="sm"
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              )}
            </SurfaceCard>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
          <Button
            onClick={() => {
              const summary = categories
                .map((cat) => {
                  const categoryItems = itemsByCategory[cat] || [];
                  if (categoryItems.length === 0) return '';
                  return `${cat}:\n${categoryItems.map((item) => `- ${item.content} (${item.votes} votes)`).join('\n')}`;
                })
                .filter(Boolean)
                .join('\n\n');

              const blob = new Blob([summary], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `retrospective-${Date.now()}.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={items.length === 0}
          >
            Export Summary
          </Button>
        </div>
      </div>
    </Modal>
  );
};
