import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseMatchesArchive,
  parseMatchLineup,
} from "../chpp/parsers";
import { selectPlayerAppearances } from "../services/match.service";

describe("CHPP match history parsing", () => {
  it("parses archived matches and nullable scores", () => {
    const result = parseMatchesArchive({
      HattrickData: {
        Team: {
          TeamID: 12,
          TeamName: "Codex FC",
          MatchList: {
            Match: [
              {
                MatchID: 101,
                MatchDate: "2026-07-12 20:00:00",
                MatchType: 1,
                HomeTeam: { HomeTeamID: 12, HomeTeamName: "Codex FC" },
                AwayTeam: { AwayTeamID: 34, AwayTeamName: "Visitors" },
                HomeGoals: 2,
                AwayGoals: 1,
              },
            ],
          },
        },
      },
    });

    assert.equal(result.TeamID, 12);
    assert.equal(result.Matches[0].MatchID, 101);
    assert.equal(result.Matches[0].AwayTeamName, "Visitors");
    assert.equal(result.Matches[0].HomeGoals, 2);
    assert.ok(!Number.isNaN(new Date(result.Matches[0].MatchDate).getTime()));
  });

  it("parses a single lineup player without requiring an array", () => {
    const result = parseMatchLineup({
      HattrickData: {
        MatchID: 101,
        Team: {
          TeamID: 12,
          TeamName: "Codex FC",
          Lineup: {
            Player: {
              PlayerID: 99,
              PlayerName: "Ada Striker",
              RoleID: 111,
              PositionCode: 111,
              Behaviour: 0,
              RatingStars: 6.5,
            },
          },
        },
      },
    });

    assert.equal(result.Players.length, 1);
    assert.equal(result.Players[0].PlayerID, 99);
    assert.equal(result.Players[0].RatingStars, 6.5);
  });
});

describe("selectPlayerAppearances", () => {
  it("excludes unused substitutes and deduplicates special roles", () => {
    const appearances = selectPlayerAppearances([
      {
        PlayerID: 99,
        PlayerName: "Ada Striker",
        RoleID: 111,
        PositionCode: 111,
        Behaviour: 0,
        RatingStars: 6.5,
      },
      {
        PlayerID: 99,
        PlayerName: "Ada Striker",
        RoleID: 18,
        PositionCode: null,
        Behaviour: null,
        RatingStars: null,
      },
      {
        PlayerID: 100,
        PlayerName: "Unused Substitute",
        RoleID: 118,
        PositionCode: null,
        Behaviour: 0,
        RatingStars: null,
      },
    ]);

    assert.deepEqual(appearances.map((player) => player.PlayerID), [99]);
    assert.equal(appearances[0].RoleID, 111);
  });
});
