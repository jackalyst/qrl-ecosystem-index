const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const browserModule = { exports: {} };
const browserScript = fs.readFileSync(
    path.join(__dirname, "../website/assets/js/project-filters.js"),
    "utf8"
);
vm.runInNewContext(browserScript, { module: browserModule, URLSearchParams });
const toPlain = (value) => JSON.parse(JSON.stringify(value));

const {
    buildDirectoryUrl,
    buildRelativeUrl,
    filterDefinitions,
    readFilterState,
    readSortState,
    sortProjects,
    writeFilterState,
    writeSortState,
} = browserModule.exports;

test("uses stable, readable query parameter names for every filter", () => {
    assert.deepEqual(
        toPlain(filterDefinitions.map(({ key, parameter }) => [key, parameter])),
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
        toPlain(readFilterState("?q=wallet&type=application&category=finance&capability=wallet&platform=web&generation=2.0&maturity=beta&availability=live&environment=testnet")),
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

test("defaults to the latest added or released sort without adding URL noise", () => {
    assert.equal(readSortState("?q=wallet"), "latest");
    assert.equal(writeSortState("?q=wallet&sort=latest", "latest"), "?q=wallet");
});

test("persists a non-default sort alongside filters and unrelated parameters", () => {
    assert.equal(
        buildDirectoryUrl(
            "/projects/",
            "?ref=directory&sort=oldest",
            "#results",
            { search: "wallet", type: "application" },
            ["search", "type"],
            "name-asc"
        ),
        "/projects/?ref=directory&q=wallet&type=application&sort=name-asc#results"
    );
});

test("sorts by latest added or released date with names as a stable tie-breaker", () => {
    const projects = [
        { dataset: { sortTitle: "Zulu", listedAt: "2026-08-20", recencyAt: "2026-08-20" } },
        { dataset: { sortTitle: "Beta", listedAt: "2026-08-21", recencyAt: "2026-08-23" } },
        { dataset: { sortTitle: "Alpha", listedAt: "2026-08-23", recencyAt: "2026-08-23" } },
    ];

    assert.deepEqual(
        toPlain(sortProjects(projects, "latest").map((project) => project.dataset.sortTitle)),
        ["Alpha", "Beta", "Zulu"]
    );
    assert.deepEqual(
        toPlain(sortProjects(projects, "added").map((project) => project.dataset.sortTitle)),
        ["Alpha", "Beta", "Zulu"]
    );
    assert.deepEqual(
        toPlain(sortProjects(projects, "oldest").map((project) => project.dataset.sortTitle)),
        ["Zulu", "Alpha", "Beta"]
    );
});

test("sorts project names in either direction", () => {
    const projects = [
        { dataset: { sortTitle: "Zulu", listedAt: "2026-08-20", recencyAt: "2026-08-20" } },
        { dataset: { sortTitle: "alpha", listedAt: "2026-08-23", recencyAt: "2026-08-23" } },
        { dataset: { sortTitle: "Beta", listedAt: "2026-08-21", recencyAt: "2026-08-21" } },
    ];

    assert.deepEqual(
        toPlain(sortProjects(projects, "name-asc").map((project) => project.dataset.sortTitle)),
        ["alpha", "Beta", "Zulu"]
    );
    assert.deepEqual(
        toPlain(sortProjects(projects, "name-desc").map((project) => project.dataset.sortTitle)),
        ["Zulu", "Beta", "alpha"]
    );
});
