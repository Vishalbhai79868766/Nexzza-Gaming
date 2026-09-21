import { ChatRoom } from "@/components/chat-room";
import { GLOBAL_ROOM } from "@/lib/validation";
export const metadata = { title: "Global lobby" };
export default function Page() {
  return (
    <ChatRoom
      conversation={{
        id: GLOBAL_ROOM,
        kind: "global",
        name: "The global lobby.",
        description: "",
        icon_id: null,
        owner_id: null,
        updated_at: "",
      }}
    />
  );
}
