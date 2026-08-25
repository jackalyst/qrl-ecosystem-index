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
    const sortDefinition = {
        parameter: "sort",
        defaultValue: "latest",
        selector: "[data-project-sort]",
        values: ["latest", "added", "oldest", "name-asc", "name-desc"],
    };
    const sortValues = new Set(sortDefinition.values);
    const definitionsByKey = new Map(filterDefinitions.map((definition) => [definition.key, definition]));
    const normalize = (value) => value.toString().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const values = (project, field) => (project.dataset[field] || "").split(/\s+/).filter(Boolean);
    const countActiveFilters = (state, excludedKeys = ["search"]) =>
        Object.entries(state).filter(([key, value]) => !excludedKeys.includes(key) && (value ?? "").toString().trim()).length;
    const projectNoun = (count) => count === 1 ? "project" : "projects";

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

    const readSortState = (search) => {
        const value = new URLSearchParams(search).get(sortDefinition.parameter) || "";
        return sortValues.has(value) ? value : sortDefinition.defaultValue;
    };

    const writeSortState = (search, value) => {
        const parameters = new URLSearchParams(search);
        const normalizedValue = sortValues.has(value) ? value : sortDefinition.defaultValue;
        parameters.delete(sortDefinition.parameter);

        if (normalizedValue !== sortDefinition.defaultValue) {
            parameters.set(sortDefinition.parameter, normalizedValue);
        }

        const serialized = parameters.toString();
        return serialized ? `?${serialized}` : "";
    };

    const buildDirectoryUrl = (pathname, search, hash, state, managedKeys, sortValue) => {
        const filteredSearch = writeFilterState(search, state, managedKeys);
        return `${pathname}${writeSortState(filteredSearch, sortValue)}${hash}`;
    };

    const compareProjectTitles = (first, second) =>
        normalize(first.dataset.sortTitle || "").localeCompare(normalize(second.dataset.sortTitle || ""));

    const compareProjectDates = (first, second, field, direction) => {
        const firstDate = first.dataset[field] || "";
        const secondDate = second.dataset[field] || "";

        if (!firstDate && !secondDate) {
            return 0;
        }
        if (!firstDate) {
            return 1;
        }
        if (!secondDate) {
            return -1;
        }

        return direction * firstDate.localeCompare(secondDate);
    };

    const sortProjects = (projects, requestedSort) => {
        const sortValue = sortValues.has(requestedSort) ? requestedSort : sortDefinition.defaultValue;

        return [...projects].sort((first, second) => {
            if (sortValue === "name-asc") {
                return compareProjectTitles(first, second);
            }
            if (sortValue === "name-desc") {
                return compareProjectTitles(second, first);
            }

            const field = sortValue === "added" ? "listedAt" : "recencyAt";
            const direction = sortValue === "oldest" ? 1 : -1;
            return compareProjectDates(first, second, field, direction) || compareProjectTitles(first, second);
        });
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = {
            buildDirectoryUrl,
            buildRelativeUrl,
            countActiveFilters,
            filterDefinitions,
            projectNoun,
            readFilterState,
            readSortState,
            sortDefinition,
            sortProjects,
            writeFilterState,
            writeSortState,
        };
    }

    if (typeof document === "undefined" || typeof window === "undefined") {
        return;
    }

    document.documentElement.classList.add("has-js");

    document.querySelectorAll("[data-project-directory]").forEach((directory) => {
        const projectList = directory.querySelector("[data-project-list]");
        const projects = Array.from(projectList?.querySelectorAll("[data-project]") || []);
        const controls = Object.fromEntries(filterDefinitions.map(({ key, selector }) => [key, directory.querySelector(selector)]));
        const sortControl = directory.querySelector(sortDefinition.selector);
        const count = directory.querySelector("[data-result-count]");
        const resultNoun = directory.querySelector("[data-result-noun]");
        const empty = directory.querySelector("[data-no-results]");
        const emptyCopy = directory.querySelector("[data-no-results-copy]");
        const ideasLink = directory.querySelector("[data-no-results-ideas]");
        const activeFilters = directory.querySelector("[data-active-filters]");
        const activeFilterList = directory.querySelector("[data-active-filter-list]");
        const clearFilterButtons = Array.from(directory.querySelectorAll("[data-clear-filters]"));
        const filterDialog = directory.querySelector("[data-filter-dialog]");
        const filterDialogOpen = directory.querySelector("[data-filter-dialog-open]");
        const filterDialogCloseButtons = Array.from(directory.querySelectorAll("[data-filter-dialog-close]"));
        const activeFilterCount = directory.querySelector("[data-active-filter-count]");
        const dialogResultCount = directory.querySelector("[data-dialog-result-count]");
        const dialogResultNoun = directory.querySelector("[data-dialog-result-noun]");
        const mobileFilterQuery = window.matchMedia("(max-width: 640px)");
        let restoreDialogFocus = false;

        if (!projectList || !controls.search || !controls.generation || !sortControl || !count || !empty) {
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
            if (!activeFilters || !activeFilterList || !clearFilterButtons.length) {
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

        const renderResultState = (visible) => {
            const noun = projectNoun(visible);
            const state = controlState();
            const selectedFilterCount = countActiveFilters(state);

            count.textContent = visible;
            if (resultNoun) {
                resultNoun.textContent = noun;
            }
            if (dialogResultCount) {
                dialogResultCount.textContent = visible;
            }
            if (dialogResultNoun) {
                dialogResultNoun.textContent = noun;
            }
            if (activeFilterCount) {
                activeFilterCount.textContent = selectedFilterCount;
                activeFilterCount.hidden = selectedFilterCount === 0;
            }
            if (filterDialogOpen) {
                filterDialogOpen.setAttribute(
                    "aria-label",
                    selectedFilterCount ? `Filters, ${selectedFilterCount} active` : "Filters"
                );
            }
        };

        const dialogIsModal = () => {
            if (!filterDialog) {
                return false;
            }
            try {
                return filterDialog.matches(":modal");
            } catch {
                return false;
            }
        };

        const syncDialogMode = () => {
            if (!filterDialog) {
                return;
            }

            restoreDialogFocus = false;
            document.documentElement.classList.remove("filter-dialog-active");
            if (mobileFilterQuery.matches) {
                if (filterDialog.open && !dialogIsModal()) {
                    filterDialog.close();
                }
            } else {
                if (dialogIsModal()) {
                    filterDialog.close();
                }
                filterDialog.setAttribute("open", "");
                filterDialogOpen?.setAttribute("aria-expanded", "false");
            }
        };

        const closeFilterDialog = () => {
            if (!filterDialog || !dialogIsModal()) {
                return;
            }
            restoreDialogFocus = true;
            filterDialog.close();
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

            sortControl.value = readSortState(window.location.search);
        };

        const syncUrl = (historyMode) => {
            const nextUrl = buildDirectoryUrl(
                window.location.pathname,
                window.location.search,
                window.location.hash,
                controlState(),
                managedKeys,
                sortControl.value
            );
            const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

            if (nextUrl !== currentUrl) {
                window.history[`${historyMode}State`](window.history.state, "", nextUrl);
            }
        };

        const update = (historyMode = "") => {
            sortProjects(projects, sortControl.value).forEach((project) => projectList.append(project));

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

            renderResultState(visible);
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
        sortControl.addEventListener("change", () => update("push"));

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

        clearFilterButtons.forEach((button) => {
            button.addEventListener("click", () => {
                Object.values(controls).filter(Boolean).forEach((control) => {
                    control.value = "";
                });
                update("push");
                if (!dialogIsModal()) {
                    controls.search.focus({ preventScroll: true });
                }
            });
        });

        filterDialogOpen?.addEventListener("click", () => {
            if (!filterDialog || !mobileFilterQuery.matches) {
                return;
            }
            if (filterDialog.open && !dialogIsModal()) {
                filterDialog.close();
            }
            filterDialog.showModal();
            document.documentElement.classList.add("filter-dialog-active");
            filterDialogOpen.setAttribute("aria-expanded", "true");
            filterDialog.querySelector("select")?.focus({ preventScroll: true });
        });

        filterDialogCloseButtons.forEach((button) => button.addEventListener("click", closeFilterDialog));

        filterDialog?.addEventListener("click", (event) => {
            if (event.target === filterDialog) {
                closeFilterDialog();
            }
        });

        filterDialog?.addEventListener("cancel", () => {
            restoreDialogFocus = true;
        });

        filterDialog?.addEventListener("close", () => {
            document.documentElement.classList.remove("filter-dialog-active");
            filterDialogOpen?.setAttribute("aria-expanded", "false");
            if (restoreDialogFocus && mobileFilterQuery.matches) {
                filterDialogOpen?.focus({ preventScroll: true });
            }
            restoreDialogFocus = false;
        });

        mobileFilterQuery.addEventListener("change", syncDialogMode);

        const restoreAndUpdate = () => {
            restoreFromUrl();
            update();
        };

        window.addEventListener("popstate", restoreAndUpdate);
        window.addEventListener("pageshow", restoreAndUpdate);
        syncDialogMode();
        restoreFromUrl();
        update();
    });
})();
