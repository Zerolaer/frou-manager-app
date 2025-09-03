export type Goal = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  progress: number;
  status: string;
  deadline?: string;
  created_at: string;
};
