import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseWorldCountries } from "../chpp/parsers";

describe("nationality flags", () => {
  it("uses league IDs for flag images while looking up player nationalities by country ID", () => {
    const leagues = [
      { LeagueID: 11, EnglishName: "Denmark", Country: { CountryID: 10, CountryName: "Danmark" } },
      { LeagueID: 12, EnglishName: "Finland", Country: { CountryID: 11 } },
      { LeagueID: 18, EnglishName: "Chile", Country: { CountryID: 17 } },
      { LeagueID: 1000, EnglishName: "International" },
    ];
    assert.deepEqual(parseWorldCountries({ HattrickData: { LeagueList: { League: leagues } } }), [
      { countryId: 10, leagueId: 11, name: "Denmark" },
      { countryId: 11, leagueId: 12, name: "Finland" },
      { countryId: 17, leagueId: 18, name: "Chile" },
    ]);
  });

  it("accepts a single league and absent country lists", () => {
    assert.deepEqual(parseWorldCountries({ HattrickData: {} }), []);
    assert.deepEqual(
      parseWorldCountries({
        HattrickData: {
          LeagueList: {
            League: {
              LeagueID: 3,
              EnglishName: "Germany",
              Country: { CountryID: 3 },
            },
          },
        },
      }),
      [{ countryId: 3, leagueId: 3, name: "Germany" }],
    );
  });
});
