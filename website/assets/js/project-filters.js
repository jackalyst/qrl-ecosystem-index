(() => {
    const filterDefinitions = [
        { key: "search", parameter: "q", label: "Search", selector: "[data-project-search]" },
        { key: "type", parameter: "type", label: "Project type", selector: "[data-project-type]" },
        { key: "category", parameter: "category", label: "Category", selector: "[data-project-category]" },
        { key: "capability", parameter: "capability", label: "Capability", selector: "[data-project-capability]" },
        { key: "platform", parameter: "platform", label: "Available on", selector: "[data-project-platform]" },
        { key: "generation", parameter: "generation", label: "QRL generation", selector: "[data-project-qrl-generation]" },
        { key: "maturity", parameter: "maturity", label: "Maturity", selector: "[data-project-maturity]" },
        { key: "availability", parameter: "availability", label: "Availability", selector: "[data-project-availability]" },
        { key: "environment", parameter: "environment", label: "Environment", selector: "[data-project-environment]" },
    ];
    const definitionsByKey = new Map(filterDefinitions.map((definition) => [definition.key, definition]));
    const normalize = (value) => value.toString().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const values = (project, field) => (project.dataset[field] || "").split(/\s+/).filter(Boolean);

    const readFilterState = (search) => {
        const parameters = new URLSearchParams(search);
        return Object.fromEntries(filterDefinitions.map(({ key, parameter }) => [key, parameters.get(parameter) || ""]));
    };

    const writeFilterState = (search, state, managedKeys = Object.keys(state)) => {
        const parameters = new URLSearchParams(search);

        managedKeys.forEach((key) => {
            const definition = definitionsByKey.get(key);
            if (!definition) {
                return;
            }

            const value = (state[key] || "").toString().trim();
            if (value) {
                parameters.set(definition.parameter, value);
            } else {
                parameters.delete(definition.parameter);
            }
        });

        const serialized = parameters.toString();
        return serialized ? `?${serialized}` : "";
    };

    const buildRelativeUrl = (pathname, search, hash, state, managedKeys) =>
        `${pathname}${writeFilterState(search, state, managedKeys)}${hash}`;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = { buildRelativeUrl, filterDefinitions, readFilterState, writeFilterState };
    }

    if (typeof document === "undefined" || typeof window === "undefined") {
        return;
    }

    document.querySelectorAll("[data-project-directory]").forEach((directory) => {
        const projects = Array.from(directory.querySelectorAll("[data-project-list] [data-project]"));
        const controls = Object.fromEntries(filterDefinitions.map(({ key, selector }) => [key, directory.querySelector(selector)]));
        const count = directory.querySelector("[data-result-count]");
        const empty = directory.querySelector("[data-no-results]");
        const emptyCopy = directory.querySelector("[data-no-results-copy]");
        const ideasLink = directory.querySelector("[data-no-results-ideas]");
        const activeFilters = directory.querySelector("[data-active-filters]");
        const activeFilterList = directory.querySelector("[data-active-filter-list]");
        const clearFilters = directory.querySelector("[data-clear-filters]");

        if (!controls.search || !controls.generation || !count || !empty) {
            return;
        }

        const controlState = () => Object.fromEntries(
            filterDefinitions
                .filter(({ key }) => controls[key])
                .map(({ key }) => [key, controls[key].value.trim()])
        );

        const managedKeys = filterDefinitions.filter(({ key }) => controls[key]).map(({ key }) => key);

        const optionLabel = (control, value) => {
            if (control === controls.search) {
                return `“${value}”`;
            }

            const option = Array.from(control.options || []).find((candidate) => candidate.value === value);
            return option?.dataset.label || option?.textContent.trim().replace(/\s+\(\d+\)$/, "") || value;
        };

        const renderActiveFilters = () => {
            if (!activeFilters || !activeFilterList || !clearFilters) {
                return;
            }

            const state = controlState();
            const selected = filterDefinitions.filter(({ key }) => controls[key] && state[key]);
            const items = selected.map(({ key, label }) => {
                const item = document.createElement("li");
                const button = document.createElement("button");
                const text = document.createElement("span");
                const remove = document.createElement("span");
                const valueLabel = optionLabel(controls[key], state[key]);

                button.type = "button";
                button.className = "active-filter-chip";
                button.dataset.removeFilter = key;
                button.setAttribute("aria-label", `Remove ${label}: ${valueLabel} filter`);
                text.textContent = `${label}: ${valueLabel}`;
                remove.className = "active-filter-chip-remove";
                remove.setAttribute("aria-hidden", "true");
                remove.textContent = "×";
                button.append(text, remove);
                item.append(button);
                return item;
            });

            activeFilterList.replaceChildren(...items);
            activeFilters.hidden = selected.length === 0;
        };

        const restoreFromUrl = () => {
            const state = readFilterState(window.location.search);

            filterDefinitions.forEach(({ key }) => {
                const control = controls[key];
                if (!control) {
                    return;
                }

                const value = state[key];
                if (control.options && value && !Array.from(control.options).some((option) => option.value === value)) {
                    control.value = "";
                    return;
                }

                control.value = value;
                const details = control.closest("details");
                if (details && value) {
                    details.open = true;
                }
            });
        };

        const syncUrl = (historyMode) => {
            const nextUrl = buildRelativeUrl(
                window.location.pathname,
                window.location.search,
                window.location.hash,
                controlState(),
                managedKeys
            );
            const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

            if (nextUrl !== currentUrl) {
                window.history[`${historyMode}State`](window.history.state, "", nextUrl);
            }
        };

        const update = (historyMode = "") => {
            const tokens = normalize(controls.search.value).trim().split(/\s+/).filter(Boolean);
            const matchesProject = (project, ignoredFacet = "") =>
                (!tokens.length || tokens.every((token) => normalize(project.dataset.search || "").includes(token))) &&
                (ignoredFacet === "type" || !controls.type || !controls.type.value || project.dataset.type === controls.type.value) &&
                (ignoredFacet === "category" || !controls.category || !controls.category.value || values(project, "categories").includes(controls.category.value)) &&
                (ignoredFacet === "capability" || !controls.capability || !controls.capability.value || values(project, "capabilities").includes(controls.capability.value)) &&
                (ignoredFacet === "platform" || !controls.platform || !controls.platform.value || values(project, "platforms").includes(controls.platform.value)) &&
                (!controls.generation.value || values(project, "qrlGenerations").includes(controls.generation.value)) &&
                (!controls.maturity || !controls.maturity.value || project.dataset.maturity === controls.maturity.value) &&
                (!controls.availability || !controls.availability.value || project.dataset.availability === controls.availability.value) &&
                (!controls.environment || !controls.environment.value || values(project, "environments").includes(controls.environment.value));

            const facetValues = {
                type: (project) => [project.dataset.type],
                category: (project) => values(project, "categories"),
                capability: (project) => values(project, "capabilities"),
                platform: (project) => values(project, "platforms"),
            };

            Object.entries(facetValues).forEach(([facet, projectValues]) => {
                const control = controls[facet];
                if (!control) {
                    return;
                }

                Array.from(control.options).forEach((option) => {
                    if (!option.value) {
                        return;
                    }

                    const available = projects.filter((project) =>
                        matchesProject(project, facet) && projectValues(project).includes(option.value)
                    ).length;
                    option.textContent = `${option.dataset.label} (${available})`;
                });
            });

            let visible = 0;
            projects.forEach((project) => {
                const matches = matchesProject(project);

                project.hidden = !matches;
                if (matches) {
                    visible += 1;
                }
            });

            count.textContent = visible;
            empty.hidden = visible !== 0;
            if (visible === 0 && controls.category && controls.category.value && ideasLink && emptyCopy) {
                const option = controls.category.selectedOptions[0];
                emptyCopy.textContent = `No ${option.dataset.label || "matching"} projects are listed yet.`;
                ideasLink.href = `${ideasLink.dataset.ideasBase}#category-${controls.category.value}`;
                ideasLink.hidden = false;
            } else if (emptyCopy && ideasLink) {
                emptyCopy.textContent = "No matching projects. Try a broader search or reset a filter.";
                ideasLink.hidden = true;
            }

            renderActiveFilters();
            if (historyMode) {
                syncUrl(historyMode);
            }
        };

        count.parentElement?.setAttribute("aria-live", "polite");
        count.parentElement?.setAttribute("aria-atomic", "true");

        controls.search.addEventListener("input", () => update("replace"));
        filterDefinitions.filter(({ key }) => key !== "search" && controls[key]).forEach(({ key }) => {
            controls[key].addEventListener("change", () => update("push"));
        });

        activeFilterList?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-remove-filter]");
            const control = button && controls[button.dataset.removeFilter];
            if (!control || !activeFilterList.contains(button)) {
                return;
            }

            control.value = "";
            update("push");
            control.focus({ preventScroll: true });
        });

        clearFilters?.addEventListener("click", () => {
            Object.values(controls).filter(Boolean).forEach((control) => {
                control.value = "";
            });
            update("push");
            controls.search.focus({ preventScroll: true });
        });

        const restoreAndUpdate = () => {
            restoreFromUrl();
            update();
        };

        window.addEventListener("popstate", restoreAndUpdate);
        window.addEventListener("pageshow", restoreAndUpdate);
        restoreFromUrl();
        update();
    });
})();
