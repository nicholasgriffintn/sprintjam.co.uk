import { useMemo } from 'react';
import { Plus, ThumbsUp, Trash2, Download, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import type { RetroFormat, RetroItem, RetroData } from '@/types';

interface RetroViewProps {
  retroData: RetroData;
  userName: string;
  isModeratorView: boolean;
  onAddItem: (category: string, content: string) => void;
  onVoteItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onEndRetro: () => void;
  activeCategory: string | null;
  setActiveCategory: (category: string | null) => void;
  newItemContent: Record<string, string>;
  setNewItemContent: (content: Record<string, string>) => void;
}

const RETRO_FORMATS: Record<
  RetroFormat,
  { label: string; categories: string[] }
> = {
  'start-stop-continue': {
    label: 'Start, Stop, Continue',
    categories: ['Start', 'Stop', 'Continue'],
  },
  'went-well-improve-actions': {
    label: 'What Went Well / What to Improve / Actions',
    categories: ['What Went Well', 'What to Improve', 'Action Items'],
  },
  'mad-sad-glad': {
    label: 'Mad, Sad, Glad',
    categories: ['Mad', 'Sad', 'Glad'],
  },
  'four-ls': {
    label: '4 Ls',
    categories: ['Liked', 'Learned', 'Lacked', 'Longed For'],
  },
};

export const RetroView = ({
  retroData,
  userName,
  isModeratorView,
  onAddItem,
  onVoteItem,
  onDeleteItem,
  onEndRetro,
  activeCategory,
  setActiveCategory,
  newItemContent,
  setNewItemContent,
}: RetroViewProps) => {
  const currentFormat = RETRO_FORMATS[retroData.format];
  const categories = currentFormat.categories;

  const handleAddItem = (category: string) => {
    const content = newItemContent[category]?.trim();
    if (!content) return;

    onAddItem(category, content);
    setNewItemContent({ ...newItemContent, [category]: '' });
    setActiveCategory(null);
  };

  const itemsByCategory = useMemo(() => {
    return categories.reduce(
      (acc, category) => {
        acc[category] = retroData.items
          .filter((item) => item.category === category)
          .sort((a, b) => b.votes - a.votes);
        return acc;
      },
      {} as Record<string, RetroItem[]>
    );
  }, [retroData.items, categories]);

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

  const handleExport = () => {
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
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-10 border-b border-white/50 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/70"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              Sprint Retrospective
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {currentFormat.label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExport}
              variant="secondary"
              size="sm"
              disabled={retroData.items.length === 0}
              icon={<Download className="h-4 w-4" />}
            >
              Export
            </Button>
            {isModeratorView && (
              <Button
                onClick={onEndRetro}
                variant="secondary"
                size="sm"
                icon={<X className="h-4 w-4" />}
              >
                End Retro
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="flex-1 p-4 md:p-6"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category, index) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index, duration: 0.3 }}
              >
                <SurfaceCard
                  className={`flex h-full flex-col border-2 ${getCategoryColor(index)}`}
                >
                  <h3
                    className={`mb-3 text-lg font-semibold ${getCategoryTextColor(index)}`}
                  >
                    {category}
                  </h3>

                  <div className="mb-3 flex-1 space-y-2 overflow-y-auto max-h-[500px]">
                    {itemsByCategory[category]?.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
                      >
                        <div className="flex-1">
                          <p className="text-sm text-slate-900 dark:text-white">
                            {item.content}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            by {item.author}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onVoteItem(item.id)}
                            className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-sm transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                            aria-label="Vote for this item"
                          >
                            <ThumbsUp className="h-3 w-3" />
                            <span className="font-medium">{item.votes}</span>
                          </button>
                          {item.author === userName && (
                            <button
                              onClick={() => onDeleteItem(item.id)}
                              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                              aria-label="Delete this item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </motion.div>
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
                        className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-transparent focus:ring-2 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                        rows={3}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.metaKey) {
                            handleAddItem(category);
                          }
                        }}
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
                      icon={<Plus className="h-4 w-4" />}
                    >
                      Add Item
                    </Button>
                  )}
                </SurfaceCard>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
