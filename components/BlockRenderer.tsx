import React from 'react';
import type { Block } from './blockTypes';

interface BlockRendererProps {
  value: string; // JSON string of Block[]
}

const BlockRenderer: React.FC<BlockRendererProps> = ({ value }) => {
  let blocks: Block[] = [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      blocks = parsed;
    } else {
      // Fallback for legacy plain text
      return <p className="text-gray-600 leading-relaxed whitespace-pre-line break-all">{value}</p>;
    }
  } catch (e) {
    // Fallback for legacy plain text
    return <p className="text-gray-600 leading-relaxed whitespace-pre-line break-all">{value}</p>;
  }

  return (
    <div className="space-y-6">
      {blocks.map((block) => (
        <div key={block.id} className="block-item">
          {block.type === 'text' && (
            <p className="text-gray-600 leading-relaxed whitespace-pre-line break-all">{block.content}</p>
          )}
          {block.type === 'image' && block.content && (
            <div className="space-y-2">
              <img 
                src={block.content} 
                alt={block.caption || 'Activity Image'} 
                className="w-full rounded-xl shadow-sm border border-gray-100"
                referrerPolicy="no-referrer"
              />
              {block.caption && (
                <p className="text-center text-sm text-gray-400 italic">{block.caption}</p>
              )}
            </div>
          )}
          {block.type === 'video' && block.content && (
            <div className="space-y-2">
              <div className="aspect-video rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-black">
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
              {block.caption && (
                <p className="text-center text-sm text-gray-400 italic">{block.caption}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default BlockRenderer;
