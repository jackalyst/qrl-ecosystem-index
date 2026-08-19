const test = require("node:test");
const assert = require("node:assert/strict");

const {
    buildRelativeUrl,
    filterDefinitions,
    readFilterState,
    writeFilterState,
} = require("../website/assets/js/project-filters.js");

test("uses stable, readable query parameter names for every filter", () => {
    assert.deepEqual(
        filterDefinitions.map(({ key, parameter }) => [key, parameter]),
        [
            ["search", "q"],
            ["type", "type"],
            ["category", "category"],
            ["capability", "capability"],
            ["platform", "platform"],
            ["generation", "generation"],
            ["maturity", "maturity"],
            ["availability", "availability"],
            ["environment", "environment"],
        ]
    );
});

test("reads the complete filter state from a shareable URL", () => {
    assert.deepEqual(
        readFilterState("?q=wallet&type=application&category=finance&capability=wallet&platform=web&generation=2.0&maturity=beta&availability=live&environment=testnet"),
        {
            search: "wallet",
            type: "application",
            category: "finance",
            capability: "wallet",
            platform: "web",
            generation: "2.0",
            maturity: "beta",
            availability: "live",
            environment: "testnet",
        }
    );
});

test("writes active filters while preserving unrelated parameters", () => {
    assert.equal(
        writeFilterState(
            "?utm_source=community&type=application&category=finance",
            { search: "qrl wallet", type: "protocol", category: "" },
            ["search", "type", "category"]
        ),
        "?utm_source=community&type=protocol&q=qrl+wallet"
    );
});

test("leaves filters that are not rendered on the current page untouched", () => {
    assert.equal(
        writeFilterState("?category=finance&generation=1.x", { generation: "2.0" }, ["generation"]),
        "?category=finance&generation=2.0"
    );
});

test("builds a relative URL without losing the page anchor", () => {
    assert.equal(
        buildRelativeUrl(
            "/projects/",
            "?ref=directory",
            "#results",
            { type: "protocol", capability: "node-client" },
            ["type", "capability"]
        ),
        "/projects/?ref=directory&type=protocol&capability=node-client#results"
    );
});
