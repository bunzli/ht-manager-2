import type { ChppPlayerAvatar } from "../chpp/types";
import type { ChppClient } from "../chpp/client";

export async function fetchSquadAvatars(chpp: Pick<ChppClient, "getAvatars">, teamId: string) {
  try {
    const response = await chpp.getAvatars(teamId);
    return new Map(response.players.map((avatar) => [avatar.playerId, avatar]));
  } catch {
    console.warn("[CHPP] Avatar refresh unavailable; retaining stored player images.");
    return new Map<number, ChppPlayerAvatar>();
  }
}

export function avatarSnapshotData(
  avatar: ChppPlayerAvatar | undefined,
  previous: { avatarBackground: string; avatarLayers: string } | null,
) {
  return {
    avatarBackground: avatar?.backgroundImage ?? previous?.avatarBackground ?? "",
    avatarLayers: avatar ? JSON.stringify(avatar.layers) : (previous?.avatarLayers ?? "[]"),
  };
}
