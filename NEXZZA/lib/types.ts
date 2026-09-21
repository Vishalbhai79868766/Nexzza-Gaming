export type Profile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  games: string[];
  avatar_id: string | null;
  status: "online" | "idle" | "dnd" | "offline";
  theme: "dark" | "light";
  show_last_seen: boolean;
  created_at: string;
};
export type Role = {
  user_id: string;
  role: "player" | "moderator" | "administrator";
  state: string;
  suspended_until: string | null;
};
export type Asset = {
  id: string;
  mime: string;
  filename: string;
  size: number;
};
export type Conversation = {
  id: string;
  kind: "global" | "group" | "direct";
  name: string;
  description: string;
  icon_id: string | null;
  owner_id: string | null;
  updated_at: string;
};
export type Member = {
  user_id: string;
  role: string;
  muted: boolean;
  profiles: Profile;
};
export type ChatMessage = {
  id: string;
  conversation_id: string;
  author_id: string;
  content: string;
  reply_to: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  profiles: Profile;
  message_attachments: { media_assets: Asset }[];
  message_reactions: { emoji: string; user_id: string }[];
  message_receipts: { user_id: string; read_at: string | null }[];
};
export type NewsPost = {
  id: string;
  author_id: string;
  headline: string;
  body: string;
  game: string;
  platform: string;
  category: string;
  tags: string[];
  source_type: string;
  source_url: string;
  cover_id: string;
  video_id: string | null;
  state: string;
  verified: boolean;
  published_at: string;
  updated_at: string;
  profiles: Profile;
  likes: number;
  comments: number;
  bookmarks: number;
  views: number;
};
export type Comment = {
  id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  profiles: Profile;
};
