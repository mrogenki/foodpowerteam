import React, { useState, useEffect } from 'react';
import { Plus, Trash2, MoveUp, MoveDown, Type, Image as ImageIcon, Video, GripVertical } from 'lucide-react';
import type { Block, BlockType } from './blockTypes';

// 型別已移到 blockTypes.ts（SSR 友善）；此處 re-export 保持既有 import 相容。
export type { Block, BlockType };

interface BlockEditorProps {
  value: string; // JSON string of Block[]
  onChange: (value: string) => void;
  onUploadImage: (file: File) => Promise<string>;
}

const BlockEditor: React.FC<BlockEditorProps> = ({ value, onChange, onUploadImage }) => {
  const [blocks, setBlocks] = useState<Block[]>([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        // Only update if the stringified version is different to avoid loops
        if (JSON.stringify(blocks) !== value) {
          setBlocks(parsed);
        }
      } else if (value && blocks.length === 0) {
        // Fallback for legacy plain text
        setBlocks([{ id: 'initial', type: 'text', content: value }]);
      }
    } catch (e) {
      // Fallback for legacy plain text
      if (value && blocks.length === 0) {
        setBlocks([{ id: 'initial', type: 'text', content: value || '' }]);
      }
    }
  }, [value]);

  const updateBlocks = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
    onChange(JSON.stringify(newBlocks));
  };

  const addBlock = (type: BlockType) => {
    const newBlock: Block = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: '',
      caption: ''
    };
    updateBlocks([...blocks, newBlock]);
  };

  const removeBlock = (id: string) => {
    updateBlocks(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newBlocks.length) return;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    updateBlocks(newBlocks);
  };

  const handleBlockChange = (id: string, updates: Partial<Block>) => {
    updateBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const handleImageUpload = async (id: string, file: File) => {
    const url = await onUploadImage(file);
    if (url) {
      handleBlockChange(id, { content: url });
    }
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
      <div className="space-y-4">
        {blocks.map((block, index) => (
          <div key={block.id} className="relative group bg-white p-4 rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md">
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white border rounded-lg p-1 shadow-sm z-10">
              <button type="button" onClick={() => moveBlock(index, 'up')} disabled={index === 0} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"><MoveUp size={14} /></button>
              <button type="button" onClick={() => moveBlock(index, 'down')} disabled={index === blocks.length - 1} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"><MoveDown size={14} /></button>
            </div>

            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                {block.type === 'text' && <><Type size={14} /> 文字區塊</>}
                {block.type === 'image' && <><ImageIcon size={14} /> 圖片區塊</>}
                {block.type === 'video' && <><Video size={14} /> 影片區塊</>}
              </div>
              <button type="button" onClick={() => removeBlock(block.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
            </div>

            {block.type === 'text' && (
              <textarea
                value={block.content}
                onChange={e => handleBlockChange(block.id, { content: e.target.value })}
                placeholder="輸入文字內容..."
                rows={4}
                className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-500 text-gray-700 leading-relaxed"
              />
            )}

            {block.type === 'image' && (
              <div className="space-y-3">
                {block.content ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden border bg-gray-100">
                    <img src={block.content} alt="Preview" className="w-full h-full object-contain" />
                    <label className="absolute bottom-2 right-2 cursor-pointer bg-black/50 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-black/70 backdrop-blur-sm transition-all">
                      更換圖片
                      <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleImageUpload(block.id, e.target.files[0])} />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <ImageIcon className="w-10 h-10 text-gray-400 mb-3 group-hover:scale-110 transition-transform" />
                      <p className="text-sm text-gray-500 font-bold">點擊上傳圖片</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleImageUpload(block.id, e.target.files[0])} />
                  </label>
                )}
                <input
                  type="text"
                  value={block.caption || ''}
                  onChange={e => handleBlockChange(block.id, { caption: e.target.value })}
                  placeholder="圖片說明 (選填)"
                  className="w-full p-2 text-sm border-b focus:border-red-500 outline-none transition-colors"
                />
              </div>
            )}

            {block.type === 'video' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={block.content}
                    onChange={e => handleBlockChange(block.id, { content: e.target.value })}
                    placeholder="貼上 YouTube 或影片連結..."
                    className="flex-grow p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                {block.content && (
                  <div className="aspect-video rounded-lg overflow-hidden border bg-black">
                    {block.content.includes('youtube.com') || block.content.includes('youtu.be') ? (
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${block.content.includes('v=') ? block.content.split('v=')[1].split('&')[0] : block.content.split('/').pop()}`}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    ) : (
                      <video src={block.content} controls className="w-full h-full" />
                    )}
                  </div>
                )}
                <input
                  type="text"
                  value={block.caption || ''}
                  onChange={e => handleBlockChange(block.id, { caption: e.target.value })}
                  placeholder="影片說明 (選填)"
                  className="w-full p-2 text-sm border-b focus:border-red-500 outline-none transition-colors"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={() => addBlock('text')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-red-200 hover:text-red-600 transition-all shadow-sm"
        >
          <Plus size={16} /> 新增文字
        </button>
        <button
          type="button"
          onClick={() => addBlock('image')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-red-200 hover:text-red-600 transition-all shadow-sm"
        >
          <Plus size={16} /> 新增圖片
        </button>
        <button
          type="button"
          onClick={() => addBlock('video')}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-red-200 hover:text-red-600 transition-all shadow-sm"
        >
          <Plus size={16} /> 新增影片
        </button>
      </div>
    </div>
  );
};

export default BlockEditor;
