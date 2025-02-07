// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as assert from "assert";
import * as sinon from "sinon";
import { MetricHandler } from "../../../../src/metrics";
import { AzureMonitorOpenTelemetryConfig } from "../../../../src/shared";
import { ExportResultCode } from "@opentelemetry/core";

describe("MetricHandler", () => {
  let sandbox: sinon.SinonSandbox;
  let handler: MetricHandler;
  let exportStub: sinon.SinonStub;
  const _config = new AzureMonitorOpenTelemetryConfig();
  if (_config.azureMonitorExporterConfig) {
    _config.azureMonitorExporterConfig.connectionString =
      "InstrumentationKey=1aa11111-bbbb-1ccc-8ddd-eeeeffff3333";
  }

  before(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    handler.shutdown();
    sandbox.restore();
  });

  function createHandler(config: AzureMonitorOpenTelemetryConfig) {
    handler = new MetricHandler(config, {
      collectionInterval: 100,
    });
    exportStub = sinon.stub(handler["_azureExporter"], "export").callsFake(
      (spans: any, resultCallback: any) =>
        new Promise((resolve) => {
          resultCallback({
            code: ExportResultCode.SUCCESS,
          });
          resolve(spans);
        })
    );
  }

  it("should create a meter", () => {
    createHandler(_config);
    assert.ok(handler.getCustomMetricsMeter(), "meter not available");
  });

  it("should observe instruments during collection", async () => {
    createHandler(_config);
    handler
      .getCustomMetricsMeter()
      .createCounter("testCounter", { description: "testDescription" });
    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.ok(exportStub.called);
    const resourceMetrics = exportStub.args[0][0];
    const scopeMetrics = resourceMetrics.scopeMetrics;
    assert.strictEqual(scopeMetrics.length, 1, "scopeMetrics count");
    const metrics = scopeMetrics[0].metrics;
    assert.strictEqual(metrics.length, 1, "metrics count");
    assert.equal(metrics[0].descriptor.name, "testCounter");
    assert.equal(metrics[0].descriptor.description, "testDescription");
  });

  it("should not collect when disabled", async () => {
    createHandler(_config);
    handler
      .getCustomMetricsMeter()
      .createCounter("testCounter", { description: "testDescription" });
    handler.shutdown();
    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.ok(exportStub.notCalled);
  });

  describe("#autoCollect", () => {
    it("performance enablement during start", () => {
      _config.enableAutoCollectPerformance = true;
      createHandler(_config);
      assert.ok(handler["_perfCounterMetrics"], "Performance counters not loaded");
    });

    it("standard metrics enablement during start", () => {
      _config.enableAutoCollectStandardMetrics = true;
      createHandler(_config);
      assert.ok(handler["_standardMetrics"], "Standard metrics not loaded");
    });
  });
});
