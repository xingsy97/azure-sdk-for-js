// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Recorder } from "@azure-tools/test-recorder";
import { assert } from "chai";
import { Context } from "mocha";
import { DistributionPolicy, JobRouterAdministrationClient } from "../../../src";
import { getDistributionPolicyRequest } from "../utils/testData";
import { createRecordedRouterClientWithConnectionString } from "../../internal/utils/mockClient";
import { timeoutMs } from "../utils/constants";

describe("RouterClient", function () {
  let administrationClient: JobRouterAdministrationClient;
  let recorder: Recorder;

  const testRunId = "recorded-d-policies";

  const { distributionPolicyId, distributionPolicyRequest } =
    getDistributionPolicyRequest(testRunId);

  describe("Distribution Policy Operations", function () {
    this.beforeEach(async function (this: Context) {
      ({ administrationClient, recorder } = await createRecordedRouterClientWithConnectionString(
        this
      ));
    });

    this.afterEach(async function (this: Context) {
      if (!this.currentTest?.isPending() && recorder) {
        await recorder.stop();
      }
    });

    it("should create a distribution policy", async function () {
      const result = await administrationClient.createDistributionPolicy(
        distributionPolicyId,
        distributionPolicyRequest
      );

      assert.isDefined(result);
      assert.isDefined(result?.id);
      assert.equal(result.name, distributionPolicyRequest.name);
    }).timeout(timeoutMs);

    it("should get a distribution policy", async function () {
      const result = await administrationClient.getDistributionPolicy(distributionPolicyId);

      assert.equal(result.id, distributionPolicyId);
      assert.equal(result.name, distributionPolicyRequest.name);
      assert.equal(result.offerTtlSeconds, distributionPolicyRequest.offerTtlSeconds);
      assert.deepEqual(result.mode, distributionPolicyRequest.mode);
    }).timeout(timeoutMs);

    it("should update a distribution policy", async function () {
      const patch: DistributionPolicy = { ...distributionPolicyRequest, name: "new-name" };
      const result = await administrationClient.updateDistributionPolicy(
        distributionPolicyId,
        patch
      );

      assert.isDefined(result);
      assert.isDefined(result.id);
      assert.equal(result.name, patch.name);
    }).timeout(timeoutMs);

    it("should list distribution policies", async function () {
      const result: DistributionPolicy[] = [];
      for await (const policy of administrationClient.listDistributionPolicies({
        maxPageSize: 20,
      })) {
        result.push(policy.distributionPolicy!);
      }

      assert.isNotEmpty(result);
    }).timeout(timeoutMs);

    it("should delete a distribution policy", async function () {
      const result = await administrationClient.deleteDistributionPolicy(distributionPolicyId);

      assert.isDefined(result);
    }).timeout(timeoutMs);
  });
});
