// 區塊內容型別（BlockEditor 編、BlockRenderer 顯示）。
// 獨立成檔：讓 SSR/預渲染路徑（ArticleDetail → BlockRenderer）不必 import BlockEditor（避免把編輯器的 lucide 拉進 SSR bundle）。
export type BlockType = 'text' | 'image' | 'video';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  caption?: string;
}
