/* src/features/notes/types.ts */
export type Note = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
};
