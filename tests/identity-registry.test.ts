import { describe, expect, it } from "vitest";

import {
  uintCV,
  stringUtf8CV,
  principalCV,
  trueCV,
  listCV,
  tupleCV,
  bufferCV,
} from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const address1 = accounts.get("wallet_1")!;
const address2 = accounts.get("wallet_2")!;

/*
  The test below is an example. To learn more, read the testing documentation here:
  https://docs.hiro.so/stacks/clarinet-js-sdk
*/

describe("identity-registry public functions", () => {
  it("register() registers a new agent successfully", () => {
    // arrange

    // act
    const { result } = simnet.callPublicFn(
      "identity-registry",
      "register",
      [],
      address1
    );

    // assert
    expect(result).toBeOk(uintCV(0n));
  });

  it("register-with-uri() registers a new agent with custom URI successfully", () => {
    // arrange

    // act
    const uri = stringUtf8CV("ipfs://test-uri");
    const { result } = simnet.callPublicFn(
      "identity-registry",
      "register-with-uri",
      [uri],
      address1
    );

    // assert
    expect(result).toBeOk(uintCV(0n));
  });

  it("register-full() registers a new agent with URI and metadata successfully", () => {
    // arrange
    const uri = stringUtf8CV("ipfs://full");
    const testKey = stringUtf8CV("test-key");
    const testValue = bufferCV(Buffer.from("test-value", "utf8"));
    const metadataEntry = tupleCV({ key: testKey, value: testValue });
    const metadata = listCV([metadataEntry]);

    // act
    const { result } = simnet.callPublicFn(
      "identity-registry",
      "register-full",
      [uri, metadata],
      address1
    );

    // assert
    expect(result).toBeOk(uintCV(0n));
  });

  it("set-agent-uri() allows owner to update agent URI", () => {
    // arrange
    simnet.callPublicFn("identity-registry", "register", [], address1);

    // act
    const newUri = stringUtf8CV("ipfs://updated");
    const { result } = simnet.callPublicFn(
      "identity-registry",
      "set-agent-uri",
      [uintCV(0n), newUri],
      address1
    );

    // assert
    expect(result).toBeOk(trueCV);
  });

  it("set-metadata() allows owner to set agent metadata", () => {
    // arrange
    simnet.callPublicFn("identity-registry", "register", [], address1);

    // act
    const key = stringUtf8CV("color");
    const value = bufferCV(Buffer.from("blue", "utf8"));
    const { result } = simnet.callPublicFn(
      "identity-registry",
      "set-metadata",
      [uintCV(0n), key, value],
      address1
    );

    // assert
    expect(result).toBeOk(trueCV);
  });

  it("set-approval-for-all() allows owner to approve operator", () => {
    // arrange
    simnet.callPublicFn("identity-registry", "register", [], address1);

    // act
    const { result } = simnet.callPublicFn(
      "identity-registry",
      "set-approval-for-all",
      [uintCV(0n), principalCV(address2), trueCV],
      address1
    );

    // assert
    expect(result).toBeOk(trueCV);
  });

  it("set-agent-uri() fails if caller not authorized", () => {
    // arrange
    simnet.callPublicFn("identity-registry", "register", [], address1);

    // act
    const newUri = stringUtf8CV("ipfs://updated");
    const { result } = simnet.callPublicFn(
      "identity-registry",
      "set-agent-uri",
      [uintCV(0n), newUri],
      address2
    );

    // assert
    expect(result).toBeErr(uintCV(1000n));
  });

  it("set-metadata() fails if caller not authorized", () => {
    // arrange
    simnet.callPublicFn("identity-registry", "register", [], address1);

    // act
    const key = stringUtf8CV("color");
    const value = bufferCV(Buffer.from("blue", "utf8"));
    const { result } = simnet.callPublicFn(
      "identity-registry",
      "set-metadata",
      [uintCV(0n), key, value],
      address2
    );

    // assert
    expect(result).toBeErr(uintCV(1000n));
  });

  it("set-approval-for-all() fails if caller not owner", () => {
    // arrange
    simnet.callPublicFn("identity-registry", "register", [], address1);

    // act
    const { result } = simnet.callPublicFn(
      "identity-registry",
      "set-approval-for-all",
      [uintCV(0n), principalCV(address2), trueCV],
      address2
    );

    // assert
    expect(result).toBeErr(uintCV(1000n));
  });
});

describe("identity-registry read-only functions", () => {
  it("owner-of() returns the owner of an agent", () => {
    // arrange
    simnet.callPublicFn("identity-registry", "register", [], address1);

    // act
    const { result } = simnet.callReadOnlyFn(
      "identity-registry",
      "owner-of",
      [uintCV(0n)],
      deployer
    );

    // assert
    expect(result).toBeSome(principalCV(address1));
  });

  it("get-uri() returns the URI of an agent", () => {
    // arrange
    const testUri = stringUtf8CV("ipfs://test");
    simnet.callPublicFn(
      "identity-registry",
      "register-with-uri",
      [testUri],
      address1
    );

    // act
    const { result } = simnet.callReadOnlyFn(
      "identity-registry",
      "get-uri",
      [uintCV(0n)],
      deployer
    );

    // assert
    expect(result).toBeSome(testUri);
  });

  it("get-metadata() returns the metadata value for a key", () => {
    // arrange
    simnet.callPublicFn("identity-registry", "register", [], address1);
    const key = stringUtf8CV("color");
    const value = bufferCV(Buffer.from("blue", "utf8"));
    simnet.callPublicFn(
      "identity-registry",
      "set-metadata",
      [uintCV(0n), key, value],
      address1
    );

    // act
    const { result } = simnet.callReadOnlyFn(
      "identity-registry",
      "get-metadata",
      [uintCV(0n), key],
      deployer
    );

    // assert
    expect(result).toBeSome(value);
  });

  it("is-approved-for-all() returns true if operator is approved", () => {
    // arrange
    simnet.callPublicFn("identity-registry", "register", [], address1);
    simnet.callPublicFn(
      "identity-registry",
      "set-approval-for-all",
      [uintCV(0n), principalCV(address2), trueCV],
      address1
    );

    // act
    const { result } = simnet.callReadOnlyFn(
      "identity-registry",
      "is-approved-for-all",
      [uintCV(0n), principalCV(address2)],
      deployer
    );

    // assert
    expect(result).toBeBool(true);
  });

  it("get-version() returns the contract version", () => {
    // arrange

    // act
    const { result } = simnet.callReadOnlyFn(
      "identity-registry",
      "get-version",
      [],
      deployer
    );

    // assert
    expect(result).toBeString("1.0.0");
  });
});
