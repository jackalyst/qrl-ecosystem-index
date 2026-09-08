package main

import (
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	_ "image/jpeg"
	"image/png"
	"io/fs"
	"math"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
	"unicode"

	"github.com/srwiley/oksvg"
	"github.com/srwiley/rasterx"
	xdraw "golang.org/x/image/draw"
	"golang.org/x/image/font"
	"golang.org/x/image/font/gofont/gobold"
	"golang.org/x/image/font/gofont/goregular"
	"golang.org/x/image/font/opentype"
	"golang.org/x/image/math/fixed"
	_ "golang.org/x/image/webp"
	"gopkg.in/yaml.v3"
)

type Project struct {
	ID                  string           `yaml:"id" json:"id"`
	Name                string           `yaml:"name" json:"name"`
	ProjectType         string           `yaml:"project_type" json:"project_type"`
	PrimaryCategory     string           `yaml:"primary_category" json:"primary_category"`
	SecondaryCategories []string         `yaml:"secondary_categories" json:"secondary_categories"`
	Capabilities        []string         `yaml:"capabilities" json:"capabilities"`
	Platforms           []string         `yaml:"platforms" json:"platforms"`
	Keywords            []string         `yaml:"keywords" json:"keywords"`
	Maturity            string           `yaml:"maturity" json:"maturity"`
	Availability        string           `yaml:"availability" json:"availability"`
	Maintenance         string           `yaml:"maintenance,omitempty" json:"maintenance,omitempty"`
	QRLRelationship     string           `yaml:"qrl_relationship" json:"qrl_relationship"`
	QRLSupport          []QRLSupport     `yaml:"qrl_support" json:"qrl_support"`
	Deployments         []Deployment     `yaml:"deployments,omitempty" json:"deployments,omitempty"`
	Description         string           `yaml:"description" json:"description"`
	Publisher           Publisher        `yaml:"publisher" json:"publisher"`
	Maintainers         []Maintainer     `yaml:"maintainers" json:"maintainers"`
	SourceAvailability  string           `yaml:"source_availability" json:"source_availability"`
	Repositories        []Repository     `yaml:"repositories" json:"repositories"`
	Links               []Link           `yaml:"links" json:"links"`
	SecurityReviews     []SecurityReview `yaml:"security_reviews,omitempty" json:"security_reviews,omitempty"`
	Evidence            []Evidence       `yaml:"evidence,omitempty" json:"evidence,omitempty"`
	Relationships       []Relationship   `yaml:"relationships,omitempty" json:"relationships,omitempty"`
	PreviousNames       []string         `yaml:"previous_names,omitempty" json:"previous_names,omitempty"`
	Assets              []Asset          `yaml:"assets,omitempty" json:"assets,omitempty"`
	ListedAt            string           `yaml:"listed_at" json:"listed_at"`
	DataUpdatedAt       string           `yaml:"data_updated_at" json:"data_updated_at"`
	ProjectLaunchedAt   string           `yaml:"project_launched_at,omitempty" json:"project_launched_at,omitempty"`
	LastReleaseAt       string           `yaml:"last_release_at,omitempty" json:"last_release_at,omitempty"`
	LastVerifiedAt      string           `yaml:"last_verified_at,omitempty" json:"last_verified_at,omitempty"`
	Logos               []Logo           `yaml:"logos,omitempty" json:"logos,omitempty"`
	Gallery             []GalleryItem    `yaml:"gallery,omitempty" json:"gallery,omitempty"`
	Features            []string         `yaml:"features" json:"features"`
	LongDescription     string           `yaml:"long_description,omitempty" json:"long_description,omitempty"`
}

type Classification struct {
	ProjectTypes []ProjectTypeDefinition `yaml:"project_types"`
	Categories   []CategoryDefinition    `yaml:"categories"`
	Capabilities []CapabilityDefinition  `yaml:"capabilities"`
	Platforms    []PlatformDefinition    `yaml:"platforms"`
	Networks     []NetworkDefinition     `yaml:"networks"`
}

type ProjectTypeDefinition struct {
	ID           string   `yaml:"id"`
	TaxonomySlug string   `yaml:"taxonomy_slug"`
	Label        string   `yaml:"label"`
	Description  string   `yaml:"description"`
	Ideas        []string `yaml:"ideas"`
}

type CapabilityDefinition struct {
	ID          string `yaml:"id"`
	Label       string `yaml:"label"`
	Description string `yaml:"description"`
}

type PlatformDefinition struct {
	ID          string `yaml:"id"`
	Label       string `yaml:"label"`
	Description string `yaml:"description"`
}

type NetworkDefinition struct {
	ID          string `yaml:"id"`
	Label       string `yaml:"label"`
	Generation  string `yaml:"generation"`
	Environment string `yaml:"environment"`
}

type CategoryDefinition struct {
	ID          string   `yaml:"id"`
	Label       string   `yaml:"label"`
	Description string   `yaml:"description"`
	Ideas       []string `yaml:"ideas"`
}

type Logo struct {
	Path        string `yaml:"path"`
	Description string `yaml:"description"`
}

type GalleryItem struct {
	Type    string `yaml:"type"`
	Path    string `yaml:"path,omitempty"`
	ID      string `yaml:"id,omitempty"`
	Caption string `yaml:"caption"`
}

type Publisher struct {
	Name string `yaml:"name" json:"name"`
	URL  string `yaml:"url,omitempty" json:"url,omitempty"`
}

type Maintainer struct {
	Name    string `yaml:"name" json:"name"`
	Contact string `yaml:"contact" json:"contact"`
}

type QRLSupport struct {
	Generation   string   `yaml:"generation" json:"generation"`
	Environments []string `yaml:"environments" json:"environments"`
	Evidence     []string `yaml:"evidence,omitempty" json:"evidence,omitempty"`
}

type Deployment struct {
	ID                 string                 `yaml:"id" json:"id"`
	Network            string                 `yaml:"network" json:"network"`
	OperationalState   string                 `yaml:"operational_state" json:"operational_state"`
	Identifiers        []DeploymentIdentifier `yaml:"identifiers" json:"identifiers"`
	Evidence           []string               `yaml:"evidence" json:"evidence"`
	SourceVerification string                 `yaml:"source_verification" json:"source_verification"`
}

type DeploymentIdentifier struct {
	Type  string `yaml:"type" json:"type"`
	Value string `yaml:"value" json:"value"`
	Role  string `yaml:"role,omitempty" json:"role,omitempty"`
}

type Repository struct {
	ID      string `yaml:"id" json:"id"`
	Role    string `yaml:"role" json:"role"`
	URL     string `yaml:"url" json:"url"`
	License string `yaml:"license" json:"license"`
}

type Link struct {
	Type     string `yaml:"type" json:"type"`
	URL      string `yaml:"url" json:"url"`
	Label    string `yaml:"label,omitempty" json:"label,omitempty"`
	Platform string `yaml:"platform,omitempty" json:"platform,omitempty"`
	Primary  bool   `yaml:"primary,omitempty" json:"primary,omitempty"`
}

type SecurityReview struct {
	Auditor           string   `yaml:"auditor" json:"auditor"`
	ReportURL         string   `yaml:"report_url" json:"report_url"`
	ReportDate        string   `yaml:"report_date,omitempty" json:"report_date,omitempty"`
	RepositoryID      string   `yaml:"repository_id,omitempty" json:"repository_id,omitempty"`
	Revision          string   `yaml:"revision,omitempty" json:"revision,omitempty"`
	Scope             string   `yaml:"scope" json:"scope"`
	DeploymentIDs     []string `yaml:"deployment_ids,omitempty" json:"deployment_ids,omitempty"`
	RemediationStatus string   `yaml:"remediation_status" json:"remediation_status"`
}

type Evidence struct {
	Type      string `yaml:"type" json:"type"`
	URL       string `yaml:"url" json:"url"`
	Note      string `yaml:"note,omitempty" json:"note,omitempty"`
	CheckedAt string `yaml:"checked_at,omitempty" json:"checked_at,omitempty"`
}

type Relationship struct {
	Type      string `yaml:"type" json:"type"`
	ProjectID string `yaml:"project_id" json:"project_id"`
}

type Asset struct {
	Type         string `yaml:"type" json:"type"`
	Name         string `yaml:"name" json:"name"`
	Symbol       string `yaml:"symbol,omitempty" json:"symbol,omitempty"`
	DeploymentID string `yaml:"deployment_id,omitempty" json:"deployment_id,omitempty"`
	Identifier   string `yaml:"identifier,omitempty" json:"identifier,omitempty"`
	EvidenceURL  string `yaml:"evidence_url,omitempty" json:"evidence_url,omitempty"`
}

func main() {
	classification, err := loadClassification(filepath.Join("website", "data", "classification.yaml"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error loading project classification: %v\n", err)
		os.Exit(1)
	}

	// Ensure generated content and static asset directories exist.
	os.MkdirAll("website/content/projects", 0755)
	os.MkdirAll("website/static", 0755)

	var projects []Project

	// Process active projects
	processDir("projects/active", &projects)
	// Process archived projects
	processDir("projects/archived", &projects)
	if err := validateProjectClassifications(projects, classification); err != nil {
		fmt.Fprintf(os.Stderr, "Invalid project classification: %v\n", err)
		os.Exit(1)
	}

	removeStaleProjectPages(projects)

	// Generate individual project pages
	for _, p := range projects {
		generateProjectPage(p)
	}
	if err := generateSocialCards(projects, classification, "images", filepath.Join("website", "static", "images", "og")); err != nil {
		fmt.Fprintf(os.Stderr, "Error generating social preview cards: %v\n", err)
		os.Exit(1)
	}

	// Generate JSON index
	generateJSONIndex(projects)

	// Copy local project media into Hugo's published static tree.
	assetTrees := []struct {
		name        string
		source      string
		destination string
	}{
		{"logo", filepath.Join("images", "logos"), filepath.Join("website", "static", "images", "logos")},
		{"screenshot", filepath.Join("images", "screenshots"), filepath.Join("website", "static", "images", "screenshots")},
	}
	for _, assetTree := range assetTrees {
		if err := copyAssetTree(assetTree.source, assetTree.destination); err != nil {
			fmt.Fprintf(os.Stderr, "Error copying %s assets: %v\n", assetTree.name, err)
			os.Exit(1)
		}
	}

	fmt.Printf("Generated %d project pages\n", len(projects))
}

func loadClassification(path string) (Classification, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return Classification{}, err
	}

	var classification Classification
	if err := yaml.Unmarshal(data, &classification); err != nil {
		return Classification{}, err
	}
	if err := validateClassification(classification); err != nil {
		return Classification{}, err
	}
	return classification, nil
}

func validateClassification(classification Classification) error {
	if len(classification.ProjectTypes) == 0 || len(classification.Categories) == 0 || len(classification.Capabilities) == 0 || len(classification.Platforms) == 0 || len(classification.Networks) == 0 {
		return fmt.Errorf("project types, categories, capabilities, platforms, and networks are required")
	}
	seen := make(map[string]string)
	for _, projectType := range classification.ProjectTypes {
		if projectType.ID == "" || projectType.TaxonomySlug == "" || projectType.Label == "" || projectType.Description == "" {
			return fmt.Errorf("project types require id, taxonomy_slug, label, and description")
		}
		if previous := seen["type:"+projectType.ID]; previous != "" {
			return fmt.Errorf("duplicate project type %q", projectType.ID)
		}
		seen["type:"+projectType.ID] = projectType.ID
		if previous := seen["slug:"+projectType.TaxonomySlug]; previous != "" {
			return fmt.Errorf("duplicate project type taxonomy slug %q", projectType.TaxonomySlug)
		}
		seen["slug:"+projectType.TaxonomySlug] = projectType.ID
	}
	for _, category := range classification.Categories {
		if category.ID == "" || category.Label == "" || category.Description == "" {
			return fmt.Errorf("categories require id, label, and description")
		}
		if previous := seen["category:"+category.ID]; previous != "" {
			return fmt.Errorf("duplicate category %q", category.ID)
		}
		seen["category:"+category.ID] = category.ID
	}
	for _, capability := range classification.Capabilities {
		if capability.ID == "" || capability.Label == "" || capability.Description == "" {
			return fmt.Errorf("capabilities require id, label, and description")
		}
		if previous := seen["capability:"+capability.ID]; previous != "" {
			return fmt.Errorf("duplicate capability %q", capability.ID)
		}
		seen["capability:"+capability.ID] = capability.ID
	}
	for _, platform := range classification.Platforms {
		if platform.ID == "" || platform.Label == "" || platform.Description == "" {
			return fmt.Errorf("platforms require id, label, and description")
		}
		if previous := seen["platform:"+platform.ID]; previous != "" {
			return fmt.Errorf("duplicate platform %q", platform.ID)
		}
		seen["platform:"+platform.ID] = platform.ID
	}
	for _, network := range classification.Networks {
		if network.ID == "" || network.Label == "" || network.Generation == "" || network.Environment == "" {
			return fmt.Errorf("networks require id, label, generation, and environment")
		}
		if previous := seen["network:"+network.ID]; previous != "" {
			return fmt.Errorf("duplicate network %q", network.ID)
		}
		seen["network:"+network.ID] = network.ID
	}
	return nil
}

func validateProjectClassifications(projects []Project, classification Classification) error {
	projectTypes := make(map[string]bool, len(classification.ProjectTypes))
	for _, projectType := range classification.ProjectTypes {
		projectTypes[projectType.ID] = true
	}
	categories := make(map[string]bool, len(classification.Categories))
	for _, category := range classification.Categories {
		categories[category.ID] = true
	}
	capabilities := make(map[string]bool, len(classification.Capabilities))
	for _, capability := range classification.Capabilities {
		capabilities[capability.ID] = true
	}
	platforms := make(map[string]bool, len(classification.Platforms))
	for _, platform := range classification.Platforms {
		platforms[platform.ID] = true
	}
	usedCapabilities := make(map[string]bool, len(classification.Capabilities))

	for _, project := range projects {
		if !projectTypes[project.ProjectType] {
			return fmt.Errorf("%s uses unknown project type %q", project.ID, project.ProjectType)
		}
		if !categories[project.PrimaryCategory] {
			return fmt.Errorf("%s uses unknown primary category %q", project.ID, project.PrimaryCategory)
		}
		seenCategories := map[string]bool{project.PrimaryCategory: true}
		for _, category := range project.SecondaryCategories {
			if !categories[category] {
				return fmt.Errorf("%s uses unknown secondary category %q", project.ID, category)
			}
			if seenCategories[category] {
				return fmt.Errorf("%s repeats category %q", project.ID, category)
			}
			seenCategories[category] = true
		}
		if len(project.Capabilities) == 0 {
			return fmt.Errorf("%s has no capabilities", project.ID)
		}
		if len(project.Capabilities) > 4 {
			return fmt.Errorf("%s has more than four capabilities", project.ID)
		}
		seenCapabilities := make(map[string]bool, len(project.Capabilities))
		for _, capability := range project.Capabilities {
			if !capabilities[capability] {
				return fmt.Errorf("%s uses unknown capability %q", project.ID, capability)
			}
			if seenCapabilities[capability] {
				return fmt.Errorf("%s repeats capability %q", project.ID, capability)
			}
			seenCapabilities[capability] = true
			usedCapabilities[capability] = true
		}
		if len(project.Platforms) > 4 {
			return fmt.Errorf("%s has more than four platforms", project.ID)
		}
		seenPlatforms := make(map[string]bool, len(project.Platforms))
		for _, platform := range project.Platforms {
			if !platforms[platform] {
				return fmt.Errorf("%s uses unknown platform %q", project.ID, platform)
			}
			if seenPlatforms[platform] {
				return fmt.Errorf("%s repeats platform %q", project.ID, platform)
			}
			seenPlatforms[platform] = true
		}
	}
	for _, capability := range classification.Capabilities {
		if !usedCapabilities[capability.ID] {
			return fmt.Errorf("capability %q is not represented by any project", capability.ID)
		}
	}
	return nil
}

func processDir(dir string, projects *[]Project) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return
		}
		fmt.Fprintf(os.Stderr, "Error reading directory %s: %v\n", dir, err)
		return
	}

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".yaml") {
			continue
		}

		filepath := filepath.Join(dir, entry.Name())
		data, err := os.ReadFile(filepath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error reading file %s: %v\n", filepath, err)
			continue
		}

		var project Project
		if err := yaml.Unmarshal(data, &project); err != nil {
			fmt.Fprintf(os.Stderr, "Error parsing YAML %s: %v\n", filepath, err)
			continue
		}
		*projects = append(*projects, project)
	}
}

func copyAssetTree(sourceDir, destinationDir string) error {
	if err := os.RemoveAll(destinationDir); err != nil {
		return err
	}
	if _, err := os.Stat(sourceDir); err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	return filepath.WalkDir(sourceDir, func(path string, entry fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		relativePath, err := filepath.Rel(sourceDir, path)
		if err != nil {
			return err
		}
		destinationPath := filepath.Join(destinationDir, relativePath)

		if entry.IsDir() {
			return os.MkdirAll(destinationPath, 0755)
		}
		if strings.HasPrefix(entry.Name(), ".") {
			return nil
		}

		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		info, err := entry.Info()
		if err != nil {
			return err
		}
		return os.WriteFile(destinationPath, data, info.Mode().Perm())
	})
}

func removeStaleProjectPages(projects []Project) {
	expected := make(map[string]bool, len(projects))
	for _, p := range projects {
		expected[projectOutputPath(p)] = true
	}

	for _, dir := range []string{
		filepath.Join("website", "content", "projects", "active"),
		filepath.Join("website", "content", "projects", "archived"),
	} {
		if err := filepath.WalkDir(dir, func(path string, entry fs.DirEntry, err error) error {
			if err != nil {
				fmt.Fprintf(os.Stderr, "Error reading generated project path %s: %v\n", path, err)
				return nil
			}
			if entry.IsDir() || filepath.Ext(path) != ".md" {
				return nil
			}
			if expected[path] {
				return nil
			}
			if err := os.Remove(path); err != nil {
				fmt.Fprintf(os.Stderr, "Error removing stale project page %s: %v\n", path, err)
			}
			return nil
		}); err != nil && !os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "Error scanning generated project pages in %s: %v\n", dir, err)
		}
	}
}

func generateProjectPage(p Project) {
	outputPath := projectOutputPath(p)
	if err := os.MkdirAll(filepath.Dir(outputPath), 0755); err != nil {
		fmt.Fprintf(os.Stderr, "Error creating directory for %s: %v\n", outputPath, err)
		return
	}

	categories := append([]string{p.PrimaryCategory}, p.SecondaryCategories...)
	maintainerNames := make([]string, 0, len(p.Maintainers))
	for _, maintainer := range p.Maintainers {
		maintainerNames = append(maintainerNames, maintainer.Name)
	}
	params := map[string]interface{}{
		"id":           p.ID,
		"url":          projectPermalink(p),
		"aliases":      legacyProjectAliases(p),
		"title":        p.Name,
		"project_type": p.ProjectType,
		"project-types": []string{
			projectTypeSlug(p.ProjectType),
		},
		"primary_category":     p.PrimaryCategory,
		"secondary_categories": p.SecondaryCategories,
		"categories":           categories,
		"capabilities":         p.Capabilities,
		"platforms":            p.Platforms,
		"keywords":             p.Keywords,
		"maturity":             p.Maturity,
		"availability":         p.Availability,
		"display_status":       displayStatus(p),
		"qrl_relationship":     p.QRLRelationship,
		"qrl_support":          p.QRLSupport,
		"qrl_generations":      qrlGenerations(p),
		"qrl_environments":     qrlEnvironments(p),
		"publisher":            p.Publisher,
		"publishers":           []string{p.Publisher.Name},
		"maintainer_records":   p.Maintainers,
		"maintainers":          maintainerNames,
		"source_availability":  p.SourceAvailability,
		"repositories":         p.Repositories,
		"links":                p.Links,
		"listed_at":            p.ListedAt,
		"data_updated_at":      p.DataUpdatedAt,
		"description":          strings.TrimSpace(p.Description),
		"features":             p.Features,
	}
	if len(p.Logos) > 0 {
		params["logos"] = p.Logos
	}
	if p.Maintenance != "" {
		params["maintenance"] = p.Maintenance
	}
	if len(p.Deployments) > 0 {
		params["deployments"] = p.Deployments
	}
	if len(p.SecurityReviews) > 0 {
		params["security_reviews"] = p.SecurityReviews
	}
	if len(p.Evidence) > 0 {
		params["evidence"] = p.Evidence
	}
	if len(p.Relationships) > 0 {
		params["relationships"] = p.Relationships
	}
	if len(p.PreviousNames) > 0 {
		params["previous_names"] = p.PreviousNames
	}
	if len(p.Assets) > 0 {
		params["assets"] = p.Assets
	}
	if p.ProjectLaunchedAt != "" {
		params["project_launched_at"] = p.ProjectLaunchedAt
	}
	if p.LastReleaseAt != "" {
		params["last_release_at"] = p.LastReleaseAt
	}
	if p.LastVerifiedAt != "" {
		params["last_verified_at"] = p.LastVerifiedAt
	}
	if len(p.Gallery) > 0 {
		params["gallery"] = p.Gallery
	}

	if link, ok := primaryLink(p); ok {
		params["primary_link"] = link
		params["primary_url"] = link.URL
	} else if len(p.Repositories) > 0 {
		params["primary_url"] = p.Repositories[0].URL
	}

	content, err := projectPageContent(params, p.LongDescription)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error generating front matter for %s: %v\n", p.ID, err)
		return
	}

	if err := os.WriteFile(outputPath, content, 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing %s: %v\n", outputPath, err)
	}
}

func projectPageContent(params map[string]interface{}, longDescription string) ([]byte, error) {
	frontMatter, err := yaml.Marshal(params)
	if err != nil {
		return nil, err
	}

	content := fmt.Sprintf("---\n%s---\n", frontMatter)
	if body := strings.TrimSpace(escapeMarkdown(longDescription)); body != "" {
		content += "\n" + body + "\n"
	}
	return []byte(content), nil
}

func projectOutputPath(p Project) string {
	// Archived records remain historical listings; every other availability is active.
	section := "projects/active"
	if p.Availability == "archived" {
		section = "projects/archived"
	}

	return filepath.Join("website", "content", section, p.ID+".md")
}

func projectPermalink(p Project) string {
	return "/projects/" + p.ID + "/"
}

func legacyProjectAliases(p Project) []string {
	return []string{
		"/projects/active/" + p.ID + "/",
		"/projects/archived/" + p.ID + "/",
	}
}

func generateJSONIndex(projects []Project) {
	type IndexProject struct {
		ID                  string       `json:"id"`
		Name                string       `json:"name"`
		ProjectType         string       `json:"project_type"`
		PrimaryCategory     string       `json:"primary_category"`
		SecondaryCategories []string     `json:"secondary_categories"`
		Capabilities        []string     `json:"capabilities"`
		Platforms           []string     `json:"platforms"`
		Keywords            []string     `json:"keywords"`
		Maturity            string       `json:"maturity"`
		Availability        string       `json:"availability"`
		Maintenance         string       `json:"maintenance,omitempty"`
		DisplayStatus       string       `json:"display_status"`
		QRLRelationship     string       `json:"qrl_relationship"`
		QRLSupport          []QRLSupport `json:"qrl_support"`
		Deployments         []Deployment `json:"deployments"`
		Description         string       `json:"description"`
		PrimaryURL          string       `json:"primary_url"`
		SourceAvailability  string       `json:"source_availability"`
		Repositories        []Repository `json:"repositories"`
		Links               []Link       `json:"links"`
		Logo                string       `json:"logo,omitempty"`
	}

	var index []IndexProject
	for _, p := range projects {
		deployments := p.Deployments
		if deployments == nil {
			deployments = []Deployment{}
		}
		primaryURL := ""
		if link, ok := primaryLink(p); ok {
			primaryURL = link.URL
		} else if len(p.Repositories) > 0 {
			primaryURL = p.Repositories[0].URL
		}
		index = append(index, IndexProject{
			ID:                  p.ID,
			Name:                p.Name,
			ProjectType:         p.ProjectType,
			PrimaryCategory:     p.PrimaryCategory,
			SecondaryCategories: p.SecondaryCategories,
			Capabilities:        p.Capabilities,
			Platforms:           p.Platforms,
			Keywords:            p.Keywords,
			Maturity:            p.Maturity,
			Availability:        p.Availability,
			Maintenance:         p.Maintenance,
			DisplayStatus:       displayStatus(p),
			QRLRelationship:     p.QRLRelationship,
			QRLSupport:          p.QRLSupport,
			Deployments:         deployments,
			Description:         strings.TrimSpace(p.Description),
			PrimaryURL:          primaryURL,
			SourceAvailability:  p.SourceAvailability,
			Repositories:        p.Repositories,
			Links:               p.Links,
			Logo:                defaultLogoURL(p),
		})
	}

	data, _ := json.MarshalIndent(map[string]interface{}{
		"schema_version": 6,
		"generated_at":   time.Now().UTC().Format(time.RFC3339),
		"count":          len(projects),
		"projects":       index,
	}, "", "  ")

	if err := os.WriteFile("website/static/index.json", append(data, '\n'), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "Error writing JSON index: %v\n", err)
	}
}

func escapeMarkdown(s string) string {
	return s
}

func primaryLink(p Project) (Link, bool) {
	for _, link := range p.Links {
		if link.Primary {
			return link, true
		}
	}
	if len(p.Links) > 0 {
		return p.Links[0], true
	}
	return Link{}, false
}

func defaultLogoURL(p Project) string {
	if len(p.Logos) == 0 || p.Logos[0].Path == "" {
		return ""
	}
	return "/images/logos/" + filepath.ToSlash(strings.TrimPrefix(p.Logos[0].Path, "/"))
}

func projectTypeSlug(projectType string) string {
	switch projectType {
	case "protocol":
		return "protocols"
	case "application":
		return "applications"
	case "resource":
		return "resources"
	default:
		return projectType
	}
}

func qrlGenerations(p Project) []string {
	values := make([]string, 0, len(p.QRLSupport))
	seen := make(map[string]bool)
	for _, support := range p.QRLSupport {
		if support.Generation != "" && !seen[support.Generation] {
			values = append(values, support.Generation)
			seen[support.Generation] = true
		}
	}
	return values
}

func qrlEnvironments(p Project) []string {
	var values []string
	seen := make(map[string]bool)
	for _, support := range p.QRLSupport {
		for _, environment := range support.Environments {
			if !seen[environment] {
				values = append(values, environment)
				seen[environment] = true
			}
		}
	}
	return values
}

func displayStatus(p Project) string {
	if p.Availability != "" && p.Availability != "live" {
		return strings.Title(strings.ReplaceAll(p.Availability, "-", " "))
	}
	maturity := strings.Title(strings.ReplaceAll(p.Maturity, "-", " "))
	environments := qrlEnvironments(p)
	if len(environments) == 0 {
		return maturity
	}
	labels := make([]string, 0, len(environments))
	for _, environment := range environments {
		labels = append(labels, strings.Title(strings.ReplaceAll(environment, "-", "/")))
	}
	return maturity + " · " + strings.Join(labels, " + ")
}

const (
	socialCardWidth  = 1200
	socialCardHeight = 630
)

var (
	cardPaper       = color.RGBA{R: 244, G: 242, B: 235, A: 255}
	cardInk         = color.RGBA{R: 20, G: 38, B: 49, A: 255}
	cardMuted       = color.RGBA{R: 83, G: 100, B: 107, A: 255}
	cardLine        = color.RGBA{R: 207, G: 214, B: 210, A: 255}
	cardAccent      = color.RGBA{R: 7, G: 93, B: 164, A: 255}
	cardAccentLight = color.RGBA{R: 219, G: 234, B: 242, A: 255}
	cardAmber       = color.RGBA{R: 191, G: 118, B: 16, A: 255}
	cardWhite       = color.RGBA{R: 255, G: 255, B: 255, A: 255}
)

type socialCardFonts struct {
	label   font.Face
	small   font.Face
	title   font.Face
	titleSm font.Face
	body    font.Face
	initial font.Face
}

type socialCollectionCard struct {
	Path        string
	Kicker      string
	Title       string
	Description string
	Count       int
	CountLabel  string
}

func generateSocialCards(projects []Project, classification Classification, assetRoot, outputRoot string) error {
	if err := os.RemoveAll(outputRoot); err != nil {
		return err
	}
	projectOutputRoot := filepath.Join(outputRoot, "projects")
	if err := os.MkdirAll(projectOutputRoot, 0755); err != nil {
		return err
	}

	fonts, err := newSocialCardFonts()
	if err != nil {
		return err
	}
	fixedCards := []struct {
		path string
		card image.Image
	}{
		{path: "default.png", card: renderHomepageSocialCard(fonts)},
		{path: "getting-started.png", card: renderGettingStartedSocialCard(fonts)},
		{path: filepath.Join("editorial", "about.png"), card: renderEditorialSocialCard("ABOUT THE INDEX", "A structured view of QRL projects.", "A community-maintained directory across QRL 1.x and QRL 2.0.", fonts)},
		{path: filepath.Join("editorial", "ideas.png"), card: renderEditorialSocialCard("QRL 2.0 IDEAS", "See what’s missing. Then build it.", "Coverage gaps and builder opportunities across the QRL 2.0 ecosystem.", fonts)},
	}
	for _, item := range fixedCards {
		if err := writeSocialCard(filepath.Join(outputRoot, item.path), item.card); err != nil {
			return err
		}
	}

	for _, collection := range socialCollectionCards(projects, classification) {
		card, err := renderCollectionSocialCard(collection, fonts)
		if err != nil {
			return fmt.Errorf("%s: %w", collection.Path, err)
		}
		if err := writeSocialCard(filepath.Join(outputRoot, collection.Path), card); err != nil {
			return err
		}
	}

	for _, project := range projects {
		card, err := renderProjectSocialCard(project, assetRoot, fonts)
		if err != nil {
			return fmt.Errorf("%s: %w", project.ID, err)
		}
		if err := writeSocialCard(filepath.Join(projectOutputRoot, project.ID+".png"), card); err != nil {
			return fmt.Errorf("%s: %w", project.ID, err)
		}
	}
	return nil
}

func socialCollectionCards(projects []Project, classification Classification) []socialCollectionCard {
	cards := []socialCollectionCard{
		{
			Path:        filepath.Join("collections", "categories-index.png"),
			Kicker:      "COLLECTION / USE-CASE CATEGORIES",
			Title:       "Explore QRL use cases.",
			Description: "Browse projects by the problem space they address.",
			Count:       len(classification.Categories),
			CountLabel:  "categories represented",
		},
		{
			Path:        filepath.Join("collections", "capabilities-index.png"),
			Kicker:      "COLLECTION / CAPABILITIES",
			Title:       "Find tools by capability.",
			Description: "Compare the practical building blocks available across the ecosystem.",
			Count:       len(classification.Capabilities),
			CountLabel:  "capabilities represented",
		},
		{
			Path:        filepath.Join("collections", "project-types-index.png"),
			Kicker:      "COLLECTION / PROJECT TYPES",
			Title:       "Browse the QRL project landscape.",
			Description: "Explore protocols, applications, infrastructure, tooling, and resources.",
			Count:       len(classification.ProjectTypes),
			CountLabel:  "project types represented",
		},
	}

	for _, category := range classification.Categories {
		cards = append(cards, socialCollectionCard{
			Path:        filepath.Join("collections", "categories", category.ID+".png"),
			Kicker:      "COLLECTION / CATEGORY",
			Title:       collectionTitle("category", category.Label),
			Description: category.Description,
			Count:       countCategoryProjects(projects, category.ID),
			CountLabel:  "projects in this view",
		})
	}
	for _, capability := range classification.Capabilities {
		cards = append(cards, socialCollectionCard{
			Path:        filepath.Join("collections", "capabilities", capability.ID+".png"),
			Kicker:      "COLLECTION / CAPABILITY",
			Title:       collectionTitle("capability", capability.Label),
			Description: capability.Description,
			Count:       countCapabilityProjects(projects, capability.ID),
			CountLabel:  "projects in this view",
		})
	}
	for _, projectType := range classification.ProjectTypes {
		cards = append(cards, socialCollectionCard{
			Path:        filepath.Join("collections", "project-types", projectType.TaxonomySlug+".png"),
			Kicker:      "COLLECTION / PROJECT TYPE",
			Title:       collectionTitle("project type", projectType.Label),
			Description: projectType.Description,
			Count:       countProjectTypeProjects(projects, projectType.ID),
			CountLabel:  "projects in this view",
		})
	}

	publisherCounts := make(map[string]int)
	publisherLabels := make(map[string]string)
	maintainerCounts := make(map[string]int)
	maintainerLabels := make(map[string]string)
	for _, project := range projects {
		if name := strings.TrimSpace(project.Publisher.Name); name != "" {
			slug := slugifyText(name)
			publisherCounts[slug]++
			publisherLabels[slug] = name
		}
		for _, maintainer := range project.Maintainers {
			name := strings.TrimSpace(maintainer.Name)
			if name == "" {
				continue
			}
			slug := slugifyText(name)
			maintainerCounts[slug]++
			maintainerLabels[slug] = name
		}
	}
	for _, slug := range sortedStringKeys(publisherLabels) {
		cards = append(cards, socialCollectionCard{
			Path:        filepath.Join("collections", "publishers", slug+".png"),
			Kicker:      "COLLECTION / PUBLISHER",
			Title:       collectionTitle("publisher", publisherLabels[slug]),
			Description: "Projects published by " + publisherLabels[slug] + ".",
			Count:       publisherCounts[slug],
			CountLabel:  "projects in this view",
		})
	}
	for _, slug := range sortedStringKeys(maintainerLabels) {
		cards = append(cards, socialCollectionCard{
			Path:        filepath.Join("collections", "maintainers", slug+".png"),
			Kicker:      "COLLECTION / MAINTAINER",
			Title:       collectionTitle("maintainer", maintainerLabels[slug]),
			Description: "Projects maintained by " + maintainerLabels[slug] + ".",
			Count:       maintainerCounts[slug],
			CountLabel:  "projects in this view",
		})
	}

	return cards
}

func countCategoryProjects(projects []Project, category string) int {
	count := 0
	for _, project := range projects {
		if project.PrimaryCategory == category || containsString(project.SecondaryCategories, category) {
			count++
		}
	}
	return count
}

func countCapabilityProjects(projects []Project, capability string) int {
	count := 0
	for _, project := range projects {
		if containsString(project.Capabilities, capability) {
			count++
		}
	}
	return count
}

func countProjectTypeProjects(projects []Project, projectType string) int {
	count := 0
	for _, project := range projects {
		if project.ProjectType == projectType {
			count++
		}
	}
	return count
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}

func sortedStringKeys(values map[string]string) []string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}

func collectionTitle(kind, label string) string {
	if kind == "category" && strings.EqualFold(label, "Developer experience") {
		return "Tools for building on QRL."
	}
	cleanLabel := strings.ToLower(strings.TrimSpace(label))
	switch kind {
	case "category":
		return "Explore " + cleanLabel + " on QRL."
	case "capability":
		return "Find " + cleanLabel + " tools on QRL."
	case "project type":
		return "Browse " + cleanLabel + " projects."
	case "publisher":
		return "Projects by " + label + "."
	case "maintainer":
		return "Projects maintained by " + label + "."
	default:
		return label
	}
}

func slugifyText(value string) string {
	var builder strings.Builder
	dashPending := false
	for _, r := range strings.ToLower(strings.TrimSpace(value)) {
		if unicode.IsLetter(r) || unicode.IsNumber(r) {
			if dashPending && builder.Len() > 0 {
				builder.WriteByte('-')
			}
			builder.WriteRune(r)
			dashPending = false
			continue
		}
		if builder.Len() > 0 {
			dashPending = true
		}
	}
	return strings.Trim(builder.String(), "-")
}

func newSocialCardFonts() (socialCardFonts, error) {
	regular, err := opentype.Parse(goregular.TTF)
	if err != nil {
		return socialCardFonts{}, err
	}
	bold, err := opentype.Parse(gobold.TTF)
	if err != nil {
		return socialCardFonts{}, err
	}
	makeFace := func(parsed *opentype.Font, size float64) (font.Face, error) {
		return opentype.NewFace(parsed, &opentype.FaceOptions{Size: size, DPI: 72, Hinting: font.HintingFull})
	}

	label, err := makeFace(bold, 18)
	if err != nil {
		return socialCardFonts{}, err
	}
	small, err := makeFace(bold, 14)
	if err != nil {
		return socialCardFonts{}, err
	}
	title, err := makeFace(bold, 66)
	if err != nil {
		return socialCardFonts{}, err
	}
	titleSm, err := makeFace(bold, 54)
	if err != nil {
		return socialCardFonts{}, err
	}
	body, err := makeFace(regular, 25)
	if err != nil {
		return socialCardFonts{}, err
	}
	initial, err := makeFace(bold, 108)
	if err != nil {
		return socialCardFonts{}, err
	}
	return socialCardFonts{
		label:   label,
		small:   small,
		title:   title,
		titleSm: titleSm,
		body:    body,
		initial: initial,
	}, nil
}

func newSocialCard() *image.RGBA {
	card := image.NewRGBA(image.Rect(0, 0, socialCardWidth, socialCardHeight))
	draw.Draw(card, card.Bounds(), &image.Uniform{C: cardPaper}, image.Point{}, draw.Src)
	drawCardBackground(card)
	return card
}

func renderHomepageSocialCard(fonts socialCardFonts) image.Image {
	card := newSocialCard()
	drawLabel(card, fonts.label, "HOMEPAGE / ECOSYSTEM INDEX", 80, 92, cardAmber)
	drawWrappedTextNoEllipsis(card, fonts.title, "A clearer view of\nwhat’s being built\non QRL.", 80, 190, 570, 3, 70, cardInk)
	drawWrappedTextNoEllipsis(card, fonts.body, "Projects and tools across QRL 1.x + 2.0.", 80, 395, 520, 2, 34, cardMuted)

	panel := image.Rect(720, 80, 1120, 512)
	drawPanelShadow(card, panel, 12)
	drawRoundedRect(card, panel, 24, cardInk)
	drawLabel(card, fonts.label, "EXPLORE THE ECOSYSTEM", 758, 140, cardAccentLight)
	drawSignalRow(card, fonts, "QRL 1.x", "Established chain", 758, 222)
	drawSignalRow(card, fonts, "QRL 2.0", "Build the next layer", 758, 330)
	draw.Draw(card, image.Rect(758, 405, 1080, 407), &image.Uniform{C: color.RGBA{R: 91, G: 111, B: 122, A: 255}}, image.Point{}, draw.Src)
	drawLabel(card, fonts.label, "INDEX", 758, 462, cardPaper)
	drawLabel(card, fonts.label, "BROWSE BY NEED", 915, 462, cardPaper)
	drawCardFooter(card, fonts, false)
	return card
}

func renderGettingStartedSocialCard(fonts socialCardFonts) image.Image {
	card := newSocialCard()
	drawLabel(card, fonts.label, "GETTING STARTED / QRL 2.0 TESTNET V2", 80, 92, cardAmber)
	drawWrappedTextNoEllipsis(card, fonts.title, "From zero to\ndeployed on\nQRL 2.0.", 80, 190, 570, 3, 70, cardInk)
	drawWrappedTextNoEllipsis(card, fonts.body, "A path from node to wallet-connected dApp.", 80, 395, 520, 2, 34, cardMuted)

	panel := image.Rect(720, 80, 1120, 512)
	drawPanelShadow(card, panel, 12)
	drawRoundedRect(card, panel, 24, cardAccent)
	drawLabel(card, fonts.label, "DEVELOPER PATH", 758, 140, cardAccentLight)
	steps := []string{"01 NODE", "02 SYNC", "03 WALLET", "04 FUNDS", "05 CONTRACT", "06 DAPP"}
	for index, step := range steps {
		column := index % 3
		row := index / 3
		x := 758 + column*106
		y := 220 + row*104
		draw.Draw(card, image.Rect(x, y-24, x+92, y-22), &image.Uniform{C: cardAccentLight}, image.Point{}, draw.Src)
		drawLabel(card, fonts.small, step, x, y, cardWhite)
	}
	drawLabel(card, fonts.small, "RUN  →  FUND  →  DEPLOY  →  CONNECT", 758, 462, cardWhite)
	drawCardFooter(card, fonts, false)
	return card
}

func renderEditorialSocialCard(kicker, title, description string, fonts socialCardFonts) image.Image {
	card := newSocialCard()
	drawLabel(card, fonts.label, kicker, 80, 92, cardAmber)
	drawWrappedTextNoEllipsis(card, fonts.title, title, 80, 205, 580, 3, 72, cardInk)
	drawWrappedTextNoEllipsis(card, fonts.body, description, 80, 405, 540, 3, 34, cardMuted)

	panel := image.Rect(760, 104, 1120, 490)
	drawPanelShadow(card, panel, 12)
	drawRoundedRect(card, panel, 24, cardInk)
	drawLabel(card, fonts.label, "QRL / ECOSYSTEM INDEX", 800, 174, cardAccentLight)
	drawLabel(card, fonts.titleSm, "READ", 800, 300, cardAccentLight)
	drawLabel(card, fonts.label, "STRUCTURED CONTEXT", 800, 354, cardPaper)
	drawLabel(card, fonts.label, "COMMUNITY MAINTAINED", 800, 414, cardPaper)
	drawCardFooter(card, fonts, false)
	return card
}

func renderCollectionSocialCard(collection socialCollectionCard, fonts socialCardFonts) (image.Image, error) {
	card := newSocialCard()
	drawLabel(card, fonts.label, collection.Kicker, 80, 92, cardAmber)
	titleFace := fonts.title
	if len([]rune(collection.Title)) > 28 {
		titleFace = fonts.titleSm
	}
	drawWrappedTextNoEllipsis(card, titleFace, collection.Title, 80, 205, 570, 3, 72, cardInk)
	drawWrappedTextNoEllipsis(card, fonts.body, compactCardText(collection.Description, 14), 80, 405, 540, 3, 34, cardMuted)

	panel := image.Rect(720, 80, 1120, 512)
	drawPanelShadow(card, panel, 12)
	drawRoundedRect(card, panel, 24, cardAccent)
	drawLabel(card, fonts.label, fmt.Sprintf("%d", collection.Count), 758, 270, cardWhite)
	drawLabel(card, fonts.label, strings.ToUpper(collection.CountLabel), 758, 322, cardAccentLight)
	draw.Draw(card, image.Rect(758, 370, 1080, 372), &image.Uniform{C: cardAccentLight}, image.Point{}, draw.Src)
	drawLabel(card, fonts.label, "QRL 1.X + 2.0", 758, 426, cardWhite)
	drawLabel(card, fonts.label, "COMMUNITY MAINTAINED", 758, 466, cardWhite)
	drawCardFooter(card, fonts, false)
	return card, nil
}

func renderProjectSocialCard(project Project, assetRoot string, fonts socialCardFonts) (image.Image, error) {
	card := newSocialCard()
	drawLabel(card, fonts.label, "PROJECT / "+strings.ToUpper(projectTypeLabel(project.ProjectType)), 80, 92, cardAmber)

	titleFace := fonts.title
	if len([]rune(project.Name)) > 18 || len(wrapText(titleFace, project.Name, 540)) > 2 {
		titleFace = fonts.titleSm
	}
	drawWrappedTextNoEllipsis(card, titleFace, project.Name, 80, 210, 560, 2, 68, cardInk)
	drawWrappedTextNoEllipsis(card, fonts.body, projectDescriptor(project), 80, 350, 520, 2, 34, cardMuted)
	drawBadgeRow(card, fonts, projectCardBadges(project), 80, 452)

	if galleryImage, ok := firstGalleryImage(project.Gallery); ok {
		screenshotPath := filepath.Join(assetRoot, "screenshots", filepath.FromSlash(galleryImage.Path))
		screenshot, err := loadRasterImage(screenshotPath)
		if err != nil {
			return nil, fmt.Errorf("load first screenshot: %w", err)
		}
		drawScreenshotPanel(card, screenshot)
	} else {
		drawProjectFallbackPanel(card, project, assetRoot, fonts)
	}

	drawCardFooter(card, fonts, false)
	return card, nil
}

func firstGalleryImage(gallery []GalleryItem) (GalleryItem, bool) {
	for _, item := range gallery {
		if item.Type == "image" && item.Path != "" {
			return item, true
		}
	}
	return GalleryItem{}, false
}

func projectDescriptor(project Project) string {
	return compactCardText(project.Description, 10)
}

func compactCardText(value string, maxWords int) string {
	value = strings.TrimSpace(strings.Join(strings.Fields(value), " "))
	if value == "" {
		return "QRL ecosystem project"
	}
	lower := strings.ToLower(value)
	cutAt := -1
	for _, marker := range []string{" for the qrl ", " for qrl ", ": ", " — "} {
		if index := strings.Index(lower, marker); index > 24 && (cutAt == -1 || index < cutAt) {
			cutAt = index
		}
	}
	if cutAt > 0 {
		value = strings.TrimSpace(value[:cutAt])
	}
	if sentenceEnd := strings.IndexAny(value, ".!? "); sentenceEnd > 0 && sentenceEnd < len(value)-1 && value[sentenceEnd] == '.' {
		value = strings.TrimSpace(value[:sentenceEnd])
	}
	words := strings.Fields(value)
	if len(words) > maxWords {
		words = words[:maxWords]
	}
	return strings.Trim(strings.Join(words, " "), " ,;:")
}

func projectCardBadges(project Project) []string {
	badges := make([]string, 0, 3)
	for _, generation := range qrlGenerations(project) {
		if len(badges) == 2 {
			break
		}
		badges = append(badges, "QRL "+generation)
	}
	for _, platform := range project.Platforms {
		if len(badges) == 3 {
			break
		}
		badges = append(badges, strings.Title(strings.ReplaceAll(platform, "-", " ")))
	}
	if len(badges) < 3 {
		for _, environment := range qrlEnvironments(project) {
			if len(badges) == 3 {
				break
			}
			label := strings.Title(strings.ReplaceAll(environment, "-", "/"))
			if !containsString(badges, label) {
				badges = append(badges, label)
			}
		}
	}
	return badges
}

func drawCardBackground(card *image.RGBA) {
	draw.Draw(card, image.Rect(0, 0, 14, socialCardHeight), &image.Uniform{C: cardAccent}, image.Point{}, draw.Src)
	gridInk := color.RGBA{R: 224, G: 222, B: 212, A: 255}
	for x := 680; x < 1160; x += 48 {
		draw.Draw(card, image.Rect(x, 54, x+1, 548), &image.Uniform{C: gridInk}, image.Point{}, draw.Over)
	}
	for y := 54; y < 548; y += 48 {
		draw.Draw(card, image.Rect(680, y, 1160, y+1), &image.Uniform{C: gridInk}, image.Point{}, draw.Over)
	}
}

func drawScreenshotPanel(card *image.RGBA, screenshot image.Image) {
	contentWidth, contentHeight := fitImageDimensions(screenshot.Bounds(), 390, 410)
	frameWidth := contentWidth + 36
	frameHeight := contentHeight + 36
	available := image.Rect(692, 72, 1132, 520)
	left := available.Min.X + (available.Dx()-frameWidth)/2
	top := available.Min.Y + (available.Dy()-frameHeight)/2
	panelRect := image.Rect(left, top, left+frameWidth, top+frameHeight)
	shadowRect := panelRect.Add(image.Pt(11, 11))
	drawRoundedRect(card, shadowRect, 24, color.RGBA{R: 20, G: 38, B: 49, A: 35})
	drawRoundedRect(card, panelRect, 24, cardWhite)
	drawRoundedBorder(card, panelRect, 24, cardLine, 2)

	imageRect := panelRect.Inset(18)
	fitted := resizeImage(screenshot, imageRect.Dx(), imageRect.Dy())
	mask := roundedMask(imageRect.Dx(), imageRect.Dy(), 14)
	draw.DrawMask(card, imageRect, fitted, image.Point{}, mask, image.Point{}, draw.Over)
}

func drawProjectFallbackPanel(card *image.RGBA, project Project, assetRoot string, fonts socialCardFonts) {
	panel := image.Rect(720, 80, 1120, 512)
	drawPanelShadow(card, panel, 12)
	drawRoundedRect(card, panel, 24, cardInk)
	drawLabel(card, fonts.label, "NO PREVIEW IMAGE", 758, 140, cardAccentLight)
	markBounds := image.Rect(808, 174, 1032, 398)
	drawCircle(card, image.Pt(920, 286), 106, cardAccent)
	drawCircle(card, image.Pt(920, 286), 94, cardAccentLight)
	drawCenteredText(card, fonts.initial, projectInitials(project.Name), markBounds, cardInk)
	if len(project.Logos) > 0 && project.Logos[0].Path != "" {
		logoPath := filepath.Join(assetRoot, "logos", filepath.FromSlash(project.Logos[0].Path))
		if logo, err := loadProjectLogo(logoPath, 72, 72); err == nil {
			drawImageContain(card, logo, image.Rect(884, 250, 956, 322))
		}
	}
	drawLabel(card, fonts.label, "PROJECT MARK", 850, 458, cardPaper)
}

func drawPanelShadow(card *image.RGBA, panel image.Rectangle, offset int) {
	drawRoundedRect(card, panel.Add(image.Pt(offset, offset)), 24, cardAccentLight)
}

func drawSignalRow(card *image.RGBA, fonts socialCardFonts, title, subtitle string, x, baseline int) {
	draw.Draw(card, image.Rect(x, baseline-62, 1080, baseline-60), &image.Uniform{C: color.RGBA{R: 91, G: 111, B: 122, A: 255}}, image.Point{}, draw.Src)
	drawLabel(card, fonts.titleSm, title, x, baseline, cardPaper)
	drawLabel(card, fonts.label, subtitle, x, baseline+34, cardAccentLight)
}

func drawBadgeRow(card *image.RGBA, fonts socialCardFonts, badges []string, x, baseline int) {
	currentX := x
	for _, badge := range badges {
		width := measureText(fonts.label, strings.ToUpper(badge)) + 28
		bounds := image.Rect(currentX, baseline-26, currentX+width, baseline+12)
		drawRoundedRect(card, bounds, 18, cardWhite)
		drawRoundedBorder(card, bounds, 18, cardLine, 2)
		drawCenteredText(card, fonts.label, strings.ToUpper(badge), bounds, cardMuted)
		currentX += width + 12
	}
}

func drawCardMotif(card *image.RGBA, initials string, fonts socialCardFonts, x, y, width, height int) {
	rect := image.Rect(x, y, x+width, y+height)
	drawRoundedRect(card, rect, 28, cardInk)
	circleCenter := image.Pt(rect.Min.X+width/2, rect.Min.Y+height/2)
	drawCircle(card, circleCenter, minInt(width, height)/3, cardAccent)
	drawCircle(card, circleCenter, minInt(width, height)/3-12, cardAccentLight)
	drawCenteredText(card, fonts.initial, initials, image.Rect(circleCenter.X-130, circleCenter.Y-100, circleCenter.X+130, circleCenter.Y+100), cardInk)
}

func drawCardFooter(card *image.RGBA, fonts socialCardFonts, dark bool) {
	lineColor := color.Color(cardLine)
	textColor := color.Color(cardMuted)
	if dark {
		lineColor = color.RGBA{R: 91, G: 111, B: 122, A: 255}
		textColor = cardPaper
	}
	draw.Draw(card, image.Rect(80, 559, 1120, 561), &image.Uniform{C: lineColor}, image.Point{}, draw.Src)
	drawLabel(card, fonts.label, "QRL / ECOSYSTEM INDEX", 80, 594, textColor)
	drawLabel(card, fonts.label, "QRLECOSYSTEM.COM", 928, 594, textColor)
}

func drawFooter(card *image.RGBA, fonts socialCardFonts) {
	draw.Draw(card, image.Rect(72, 579, 1128, 581), &image.Uniform{C: cardLine}, image.Point{}, draw.Src)
	drawLabel(card, fonts.label, "QRLECOSYSTEM.COM", 72, 610, cardMuted)
}

func loadProjectLogo(path string, width, height int) (image.Image, error) {
	if strings.EqualFold(filepath.Ext(path), ".svg") {
		file, err := os.Open(path)
		if err != nil {
			return nil, err
		}
		defer file.Close()
		icon, err := oksvg.ReadIconStream(file)
		if err != nil {
			return nil, err
		}
		icon.SetTarget(0, 0, float64(width), float64(height))
		canvas := image.NewRGBA(image.Rect(0, 0, width, height))
		scanner := rasterx.NewScannerGV(width, height, canvas, canvas.Bounds())
		dasher := rasterx.NewDasher(width, height, scanner)
		icon.Draw(dasher, 1)
		return canvas, nil
	}
	return loadRasterImage(path)
}

func loadRasterImage(path string) (image.Image, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	decoded, _, err := image.Decode(file)
	if err != nil {
		return nil, err
	}
	return decoded, nil
}

func drawImageContain(destination *image.RGBA, source image.Image, bounds image.Rectangle) {
	sourceBounds := source.Bounds()
	if sourceBounds.Dx() == 0 || sourceBounds.Dy() == 0 {
		return
	}
	scale := math.Min(float64(bounds.Dx())/float64(sourceBounds.Dx()), float64(bounds.Dy())/float64(sourceBounds.Dy()))
	width := maxInt(1, int(math.Round(float64(sourceBounds.Dx())*scale)))
	height := maxInt(1, int(math.Round(float64(sourceBounds.Dy())*scale)))
	x := bounds.Min.X + (bounds.Dx()-width)/2
	y := bounds.Min.Y + (bounds.Dy()-height)/2
	xdraw.CatmullRom.Scale(destination, image.Rect(x, y, x+width, y+height), source, sourceBounds, draw.Over, nil)
}

func fitImageDimensions(source image.Rectangle, maxWidth, maxHeight int) (int, int) {
	if source.Dx() == 0 || source.Dy() == 0 {
		return maxWidth, maxHeight
	}
	scale := math.Min(float64(maxWidth)/float64(source.Dx()), float64(maxHeight)/float64(source.Dy()))
	return maxInt(1, int(math.Round(float64(source.Dx())*scale))), maxInt(1, int(math.Round(float64(source.Dy())*scale)))
}

func resizeImage(source image.Image, width, height int) image.Image {
	sourceBounds := source.Bounds()
	destination := image.NewRGBA(image.Rect(0, 0, width, height))
	if sourceBounds.Dx() == 0 || sourceBounds.Dy() == 0 {
		return destination
	}
	xdraw.CatmullRom.Scale(destination, destination.Bounds(), source, sourceBounds, draw.Src, nil)
	return destination
}

func writeSocialCard(path string, card image.Image) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}
	file, err := os.Create(path)
	if err != nil {
		return err
	}
	defer file.Close()
	encoder := png.Encoder{CompressionLevel: png.BestCompression}
	return encoder.Encode(file, card)
}

func drawLabel(destination draw.Image, face font.Face, text string, x, baseline int, ink color.Color) {
	drawer := font.Drawer{Dst: destination, Src: &image.Uniform{C: ink}, Face: face, Dot: fixedPoint(x, baseline)}
	drawer.DrawString(text)
}

func drawWrappedText(destination draw.Image, face font.Face, text string, x, baseline, maxWidth, maxLines, lineHeight int, ink color.Color) {
	lines := wrapText(face, text, maxWidth)
	if len(lines) > maxLines {
		lines = lines[:maxLines]
		lines[maxLines-1] = ellipsize(face, lines[maxLines-1], maxWidth)
	}
	for index, line := range lines {
		drawLabel(destination, face, line, x, baseline+index*lineHeight, ink)
	}
}

func drawWrappedTextNoEllipsis(destination draw.Image, face font.Face, text string, x, baseline, maxWidth, maxLines, lineHeight int, ink color.Color) {
	lines := wrapText(face, text, maxWidth)
	if len(lines) > maxLines {
		lines = lines[:maxLines]
	}
	for index, line := range lines {
		drawLabel(destination, face, line, x, baseline+index*lineHeight, ink)
	}
}

func wrapText(face font.Face, text string, maxWidth int) []string {
	var lines []string
	for _, paragraph := range strings.Split(text, "\n") {
		words := strings.Fields(paragraph)
		if len(words) == 0 {
			lines = append(lines, "")
			continue
		}
		current := words[0]
		for _, word := range words[1:] {
			candidate := current + " " + word
			if measureText(face, candidate) <= maxWidth {
				current = candidate
				continue
			}
			lines = append(lines, current)
			current = word
		}
		lines = append(lines, current)
	}
	return lines
}

func ellipsize(face font.Face, text string, maxWidth int) string {
	text = strings.TrimSpace(text)
	for measureText(face, text+"…") > maxWidth && len(text) > 0 {
		runes := []rune(text)
		text = strings.TrimSpace(string(runes[:len(runes)-1]))
	}
	return text + "…"
}

func measureText(face font.Face, text string) int {
	drawer := font.Drawer{Face: face}
	return drawer.MeasureString(text).Ceil()
}

func drawCenteredText(destination draw.Image, face font.Face, text string, bounds image.Rectangle, ink color.Color) {
	metrics := face.Metrics()
	width := measureText(face, text)
	height := (metrics.Ascent + metrics.Descent).Ceil()
	x := bounds.Min.X + (bounds.Dx()-width)/2
	baseline := bounds.Min.Y + (bounds.Dy()-height)/2 + metrics.Ascent.Ceil()
	drawLabel(destination, face, text, x, baseline, ink)
}

func projectInitials(name string) string {
	words := strings.FieldsFunc(name, func(r rune) bool { return !unicode.IsLetter(r) && !unicode.IsNumber(r) })
	if len(words) >= 2 {
		return strings.ToUpper(string([]rune(words[0])[:1]) + string([]rune(words[1])[:1]))
	}
	clean := []rune(strings.TrimSpace(name))
	if len(clean) == 0 {
		return "QI"
	}
	if len(clean) == 1 {
		return strings.ToUpper(string(clean))
	}
	return strings.ToUpper(string(clean[:2]))
}

func projectTypeLabel(projectType string) string {
	switch projectType {
	case "protocol":
		return "Protocol"
	case "application":
		return "Application"
	case "infrastructure":
		return "Infrastructure"
	case "tooling":
		return "Tooling"
	case "resource":
		return "Community & Resource"
	default:
		return projectType
	}
}

func drawRoundedRect(destination draw.Image, rect image.Rectangle, radius int, fill color.Color) {
	mask := roundedMask(rect.Dx(), rect.Dy(), radius)
	draw.DrawMask(destination, rect, &image.Uniform{C: fill}, image.Point{}, mask, image.Point{}, draw.Over)
}

func drawRoundedBorder(destination draw.Image, rect image.Rectangle, radius int, border color.Color, thickness int) {
	drawRoundedRect(destination, rect, radius, border)
	inner := rect.Inset(thickness)
	drawRoundedRect(destination, inner, maxInt(0, radius-thickness), cardWhite)
}

func roundedMask(width, height, radius int) *image.Alpha {
	mask := image.NewAlpha(image.Rect(0, 0, width, height))
	radius = minInt(radius, minInt(width/2, height/2))
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			dx := maxInt(radius-x, maxInt(0, x-(width-radius-1)))
			dy := maxInt(radius-y, maxInt(0, y-(height-radius-1)))
			if dx == 0 || dy == 0 || dx*dx+dy*dy <= radius*radius {
				mask.SetAlpha(x, y, color.Alpha{A: 255})
			}
		}
	}
	return mask
}

func drawCircle(destination draw.Image, center image.Point, radius int, fill color.Color) {
	for y := -radius; y <= radius; y++ {
		halfWidth := int(math.Sqrt(float64(radius*radius - y*y)))
		draw.Draw(destination, image.Rect(center.X-halfWidth, center.Y+y, center.X+halfWidth+1, center.Y+y+1), &image.Uniform{C: fill}, image.Point{}, draw.Over)
	}
}

func fixedPoint(x, y int) fixed.Point26_6 {
	return fixed.P(x, y)
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
