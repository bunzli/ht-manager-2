import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseAvatars } from "../chpp/parsers";
import { avatarSnapshotData, fetchSquadAvatars } from "../services/avatar.service";

const avatar = {
  playerId: 7,
  backgroundImage: "https://images.example/background.png",
  layers: [{ x: 12, y: 20, image: "https://images.example/head.png" }],
};

describe("squad avatars", () => {
  it("parses single-player XML layers, coordinates and both player container shapes", () => {
    const players = {
      Player: {
        PlayerID: 7,
        Avatar: {
          BackgroundImage: avatar.backgroundImage,
          Layer: { "@_x": 12, "@_y": 20, Image: avatar.layers[0].image },
        },
      },
    };
    for (const data of [
      { Team: { TeamId: 1, Players: players } },
      { Team: { TeamID: 1 }, Players: players },
    ]) {
      assert.deepEqual(parseAvatars({ HattrickData: data }), { teamId: 1, players: [avatar] });
    }
  });
  it("keeps non-supporter silhouettes without layers", () => {
    const result = parseAvatars({
      HattrickData: {
        Team: {
          TeamId: 1,
          Players: { Player: { PlayerID: 7, Avatar: { BackgroundImage: avatar.backgroundImage } } },
        },
      },
    });
    assert.deepEqual(result.players[0].layers, []);
    assert.equal(result.players[0].backgroundImage, avatar.backgroundImage);
  });
  it("requests avatars once for the squad and persists layers without losing coordinates", async () => {
    let calls = 0;
    const map = await fetchSquadAvatars(
      {
        getAvatars: async (teamId) => {
          calls++;
          assert.equal(teamId, "1");
          return { teamId: 1, players: [avatar] };
        },
      },
      "1",
    );
    assert.equal(calls, 1);
    assert.deepEqual(JSON.parse(avatarSnapshotData(map.get(7), null).avatarLayers), avatar.layers);
  });
  it("survives CHPP failure and preserves previous images, including players omitted by CHPP", async () => {
    const map = await fetchSquadAvatars(
      {
        getAvatars: async () => {
          throw new Error("CHPP unavailable");
        },
      },
      "1",
    );
    const previous = {
      avatarBackground: avatar.backgroundImage,
      avatarLayers: JSON.stringify(avatar.layers),
    };
    assert.deepEqual(avatarSnapshotData(map.get(7), previous), previous);
    assert.deepEqual(avatarSnapshotData(undefined, null), {
      avatarBackground: "",
      avatarLayers: "[]",
    });
  });
});
