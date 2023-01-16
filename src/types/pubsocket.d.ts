declare type ActionType = '' | 'transfer' | 'connected.agent' | 'attachment' | "ended" | "error" | "agent.typing";

declare type Message = {
  time: number;
  actionType: ActionType;
  author: string;
  content: string;
  customerInitiated: boolean;
  meta: { [key: string]: string };

  undelivered: boolean;
}
