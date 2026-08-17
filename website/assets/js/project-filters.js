(() => {
    const normalize = (value) => value.toString().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    document.querySelectorAll("[data-project-directory]").forEach((directory) => {
        const projects = Array.from(directory.querySelectorAll("[data-project-list] [data-project]"));
        const search = directory.querySelector("[data-project-search]");
        const type = directory.querySelector("[data-project-type]");
        const category = directory.querySelector("[data-project-category]");
        const qrlVersion = directory.querySelector("[data-project-qrl-version]");
        const status = directory.querySelector("[data-project-status]");
        const count = directory.querySelector("[data-result-count]");
        const empty = directory.querySelector("[data-no-results]");
        const emptyCopy = directory.querySelector("[data-no-results-copy]");
        const ideasLink = directory.querySelector("[data-no-results-ideas]");

        if (!search || !qrlVersion || !count || !empty) {
            return;
        }

        const configureCategories = () => {
            if (!type || !category) {
                return;
            }

            const selectedType = type.value;
            const selectedOption = category.selectedOptions[0];
            if (selectedOption && selectedOption.dataset.parent && selectedOption.dataset.parent !== selectedType) {
                category.value = "";
            }

            category.disabled = !selectedType;
            category.options[0].textContent = selectedType ? "All categories" : "Select a project type first";
            Array.from(category.options).slice(1).forEach((option) => {
                const visible = option.dataset.parent === selectedType;
                option.hidden = !visible;
                option.disabled = !visible;
            });
        };

        const update = () => {
            const tokens = normalize(search.value).trim().split(/\s+/).filter(Boolean);
            let visible = 0;
            projects.forEach((project) => {
                const qrlVersions = (project.dataset.qrlVersions || "").split(/\s+/).filter(Boolean);
                const matches =
                    (!tokens.length || tokens.every((token) => normalize(project.dataset.search || "").includes(token))) &&
                    (!type || !type.value || project.dataset.type === type.value) &&
                    (!category || !category.value || project.dataset.category === category.value) &&
                    (!qrlVersion.value || qrlVersions.includes(qrlVersion.value)) &&
                    (!status || !status.value || project.dataset.status === status.value);

                project.hidden = !matches;
                if (matches) {
                    visible += 1;
                }
            });

            count.textContent = visible;
            empty.hidden = visible !== 0;
            if (visible === 0 && category && category.value && ideasLink && emptyCopy) {
                const selectedOption = category.selectedOptions[0];
                emptyCopy.textContent = `No ${selectedOption.dataset.label || "matching"} projects are listed yet.`;
                ideasLink.href = `${ideasLink.dataset.ideasBase}#category-${category.value}`;
                ideasLink.hidden = false;
            } else if (emptyCopy && ideasLink) {
                emptyCopy.textContent = "No matching projects. Try a broader search or reset a filter.";
                ideasLink.hidden = true;
            }
        };

        if (type) {
            type.addEventListener("change", () => {
                configureCategories();
                update();
            });
        }
        [search, category, qrlVersion, status].filter(Boolean).forEach((control) => {
            control.addEventListener("input", update);
            control.addEventListener("change", update);
        });
        window.addEventListener("pageshow", () => {
            configureCategories();
            update();
        });

        configureCategories();
        update();
    });
})();
