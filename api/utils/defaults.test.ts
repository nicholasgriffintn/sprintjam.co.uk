import { describe, expect, it } from "vitest";
import {
  createInitialRoomData,
  getDefaultEstimateOptions,
  getDefaultExtraVoteOptions,
  getDefaultRoomSettings,
  getDefaultStructuredVotingOptions,
  getVotingTemplates,
  getServerDefaults,
} from "./defaults";
import { VOTING_OPTIONS, STRUCTURED_VOTING_OPTIONS } from '../config/constants';
import { generateVoteOptionsMetadata } from "./votes";
import { DEFAULT_EXTRA_VOTE_OPTIONS, DEFAULT_VOTING_SEQUENCE_ID } from "../config/voting";

describe("defaults utils", () => {
  describe("default option helpers", () => {
    it("returns a copy of the default estimate options", () => {
      const options = getDefaultEstimateOptions();
      expect(options).toEqual(VOTING_OPTIONS);
      expect(options).not.toBe(VOTING_OPTIONS);
      DEFAULT_EXTRA_VOTE_OPTIONS.filter((extra) => extra.enabled !== false).forEach(
        (extra) => {
          expect(options).toContain(extra.value);
        },
      );
    });

    it("returns a copy of the structured voting options", () => {
      const options = getDefaultStructuredVotingOptions();
      expect(options).toEqual(STRUCTURED_VOTING_OPTIONS);
      expect(options).not.toBe(STRUCTURED_VOTING_OPTIONS);
    });
  });

  describe("getDefaultRoomSettings", () => {
    it("fills all defaults and generates metadata", () => {
      const settings = getDefaultRoomSettings();
      expect(settings.estimateOptions).toEqual(VOTING_OPTIONS);
      expect(settings.voteOptionsMetadata).toEqual(
        generateVoteOptionsMetadata([...VOTING_OPTIONS]),
      );
      expect(settings.enableStructuredVoting).toBe(false);
      expect(settings.showTimer).toBe(true);
      expect(settings.votingSequenceId).toBe(DEFAULT_VOTING_SEQUENCE_ID);
      expect(settings.extraVoteOptions).toEqual(DEFAULT_EXTRA_VOTE_OPTIONS);
      expect(
        settings.resultsDisplay?.criteriaBreakdown?.consensusLabels,
      ).toMatchObject({
        high: "Consensus",
        medium: "Some Split",
        low: "Wide Split",
      });
    });

    it("merges provided settings while keeping defaults", () => {
      const customOptions = [1, 2, 3];
      const settings = getDefaultRoomSettings({
        estimateOptions: customOptions,
        showTimer: false,
        allowOthersToShowEstimates: true,
      });

      expect(settings.showTimer).toBe(false);
      expect(settings.allowOthersToShowEstimates).toBe(true);
      expect(settings.estimateOptions.slice(0, customOptions.length)).toEqual(
        customOptions,
      );
      expect(
        settings.estimateOptions.slice(customOptions.length),
      ).toEqual(
        DEFAULT_EXTRA_VOTE_OPTIONS.filter((option) => option.enabled !== false).map(
          (option) => option.value,
        ),
      );
      expect(settings.voteOptionsMetadata).toEqual(
        generateVoteOptionsMetadata(settings.estimateOptions),
      );
      // unchanged defaults remain intact
      expect(settings.enableJudge).toBe(true);
      expect(settings.topVotesCount).toBe(4);
    });

    it("disables judge by default when using non-numeric presets", () => {
      const settings = getDefaultRoomSettings({
        votingSequenceId: "tshirt",
      });

      expect(settings.votingSequenceId).toBe("tshirt");
      expect(settings.enableJudge).toBe(false);
    });

    it("forces fibonacci short sequence when structured voting is enabled", () => {
      const settings = getDefaultRoomSettings({
        enableStructuredVoting: true,
        votingSequenceId: "tshirt",
      });

      expect(settings.votingSequenceId).toBe("fibonacci-short");
      expect(settings.enableStructuredVoting).toBe(true);
      expect(settings.estimateOptions).toEqual(VOTING_OPTIONS);
    });
  });

  describe("createInitialRoomData", () => {
    it("populates room data with defaults and supplied values", () => {
      const data = createInitialRoomData({
        key: "ROOM1",
        users: ["alice"],
        moderator: "alice",
        connectedUsers: { alice: true },
        passcodeHash: { hash: "hash", salt: "salt", iterations: 1 },
        settings: { allowOthersToShowEstimates: true },
      });

      expect(data).toMatchObject({
        key: "ROOM1",
        users: ["alice"],
        votes: {},
        structuredVotes: {},
        showVotes: false,
        moderator: "alice",
        connectedUsers: { alice: true },
        judgeScore: null,
        passcodeHash: { hash: "hash", salt: "salt", iterations: 1 },
      });
      expect(data.settings.allowOthersToShowEstimates).toBe(true);
      expect(data.settings.voteOptionsMetadata).toEqual(
        generateVoteOptionsMetadata(data.settings.estimateOptions),
      );
    });
  });

  describe("getServerDefaults", () => {
    it("returns server defaults derived from room settings", () => {
      const defaults = getServerDefaults();
      const expectedRoomSettings = getDefaultRoomSettings();

      expect(defaults.roomSettings).toEqual(expectedRoomSettings);
      expect(defaults.votingCriteria).toEqual(
        expectedRoomSettings.votingCriteria,
      );
      expect(defaults.structuredVotingOptions).toEqual(
        getDefaultStructuredVotingOptions(),
      );
      expect(defaults.votingSequences).toEqual(getVotingTemplates());
      expect(defaults.extraVoteOptions).toEqual(getDefaultExtraVoteOptions());
    });
  });
});
