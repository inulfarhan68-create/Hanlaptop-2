"use client";

export type SyncEventPayload = {
  type: string;
  route: string;
  method: string;
  timestamp: number;
};

class SyncBroadcastChannel {
  private static instance: BroadcastChannel | null = null;
  private static readonly CHANNEL_NAME = 'hanlaptop-sync';

  public static getInstance(): BroadcastChannel {
    if (!this.instance && typeof window !== "undefined") {
      this.instance = new BroadcastChannel(this.CHANNEL_NAME);
    }
    return this.instance as BroadcastChannel;
  }

  public static broadcastMutation(route: string, method: string) {
    if (typeof window === "undefined") return;
    const channel = this.getInstance();
    const payload: SyncEventPayload = {
      type: 'api.mutated',
      route,
      method,
      timestamp: Date.now(),
    };
    channel.postMessage(payload);
  }
}

export const syncChannel = SyncBroadcastChannel;
