import crypto from "crypto";
import OAuth from "oauth-1.0a";
import { XMLParser } from "fast-xml-parser";
import {
  ChppPlayersResponse,
  ChppPlayerDetails,
  TransferSearchParams,
  TransferSearchResponse,
  PlayerTransfersResponse,
  ChppAvatarsResponse,
} from "./types";
import {
  parsePlayers,
  parsePlayerDetails,
  parseTransferSearch,
  parsePlayerTransfers,
  parseAvatars,
} from "./parsers";

const BASE_URL = "https://chpp.hattrick.org/chppxml.ashx";

interface ChppClientConfig {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export class ChppClient {
  private oauth: OAuth;
  private token: OAuth.Token;
  private xmlParser: XMLParser;

  constructor(config: ChppClientConfig) {
    this.oauth = new OAuth({
      consumer: {
        key: config.consumerKey,
        secret: config.consumerSecret,
      },
      signature_method: "HMAC-SHA1",
      hash_function(baseString, key) {
        return crypto
          .createHmac("sha1", key)
          .update(baseString)
          .digest("base64");
      },
    });

    this.token = {
      key: config.accessToken,
      secret: config.accessTokenSecret,
    };

    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
    });
  }

  private async request(
    params: Record<string, string | number>,
  ): Promise<Record<string, unknown>> {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      searchParams.set(key, String(value));
    }

    const url = `${BASE_URL}?${searchParams.toString()}`;

    const authHeader = this.oauth.toHeader(
      this.oauth.authorize({ url, method: "GET" }, this.token),
    );

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...authHeader,
        "Content-Type": "application/xml",
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `CHPP API error ${response.status}: ${text.slice(0, 500)}`,
      );
    }

    const xml = await response.text();
    return this.xmlParser.parse(xml) as Record<string, unknown>;
  }

  async getPlayers(teamId: number | string): Promise<ChppPlayersResponse> {
    const data = await this.request({
      file: "players",
      version: "2.8",
      teamID: teamId,
    });
    return parsePlayers(data);
  }

  async getPlayerDetails(playerId: number | string): Promise<ChppPlayerDetails> {
    const data = await this.request({
      file: "playerdetails",
      version: "3.2",
      playerID: playerId,
    });
    return parsePlayerDetails(data);
  }

  async searchTransfers(
    params: TransferSearchParams,
  ): Promise<TransferSearchResponse> {
    const reqParams: Record<string, string | number> = {
      file: "transfersearch",
      version: "1.1",
      ageMin: params.ageMin,
      ageMax: params.ageMax,
      skillType1: params.skillType1,
      minSkillValue1: params.minSkillValue1,
      maxSkillValue1: params.maxSkillValue1,
    };

    const optionalFields: Array<keyof TransferSearchParams> = [
      "ageDaysMin",
      "ageDaysMax",
      "skillType2",
      "minSkillValue2",
      "maxSkillValue2",
      "skillType3",
      "minSkillValue3",
      "maxSkillValue3",
      "skillType4",
      "minSkillValue4",
      "maxSkillValue4",
      "specialty",
      "nativeCountryId",
      "tsiMin",
      "tsiMax",
      "priceMin",
      "priceMax",
      "pageSize",
      "pageIndex",
    ];

    for (const field of optionalFields) {
      if (params[field] !== undefined) {
        reqParams[field] = params[field]!;
      }
    }

    const data = await this.request(reqParams);
    return parseTransferSearch(data);
  }

  async getAvatars(teamId: number | string): Promise<ChppAvatarsResponse> {
    const data = await this.request({
      file: "avatars",
      version: "1.1",
      actionType: "players",
      teamID: teamId,
    });
    return parseAvatars(data);
  }

  async getPlayerTransfers(
    playerId: number | string,
  ): Promise<PlayerTransfersResponse> {
    const data = await this.request({
      file: "transfersplayer",
      version: "1.1",
      playerID: playerId,
    });
    return parsePlayerTransfers(data);
  }
}

export function createChppClient(): ChppClient {
  const consumerKey = process.env.CHPP_CONSUMER_KEY;
  const consumerSecret = process.env.CHPP_CONSUMER_SECRET;
  const accessToken = process.env.CHPP_ACCESS_TOKEN;
  const accessTokenSecret = process.env.CHPP_ACCESS_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    throw new Error(
      "Missing CHPP credentials. Set CHPP_CONSUMER_KEY, CHPP_CONSUMER_SECRET, CHPP_ACCESS_TOKEN, CHPP_ACCESS_TOKEN_SECRET in .env",
    );
  }

  return new ChppClient({
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
  });
}
