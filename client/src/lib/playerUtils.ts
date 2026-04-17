const HT_BASE = "https://www.hattrick.org/goto.ashx?path=";
const PLAYER_PATH = "/Club/Players/Player.aspx?playerId=";

export function displayName(player: {
  firstName: string;
  nickName: string;
  lastName: string;
}): string {
  return player.nickName
    ? `${player.firstName} "${player.nickName}" ${player.lastName}`
    : `${player.firstName} ${player.lastName}`;
}

export function hattrickPlayerUrl(playerId: number): string {
  return `${HT_BASE}${PLAYER_PATH}${playerId}`;
}
