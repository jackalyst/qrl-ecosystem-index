{{- $projects := where site.RegularPages "Section" "projects" -}}
{{- $activeProjects := sort (where $projects "Params.availability" "!=" "archived") "Title" -}}
{{- $archivedProjects := sort (where $projects "Params.availability" "archived") "Title" -}}
# {{ site.Title }}

> {{ site.Params.description }}

The QRL Ecosystem Index is community-maintained and informational. Inclusion does not imply endorsement, security review, ownership verification, or affiliation.

## Core resources

{{ with site.GetPage "/projects" }}{{ with .OutputFormats.Get "markdown" -}}
- [Project directory]({{ .Permalink }})
{{- end }}{{ end }}
{{- with site.GetPage "/getting-started" }}{{ with .OutputFormats.Get "markdown" }}
- [Getting started on QRL 2.0]({{ .Permalink }})
{{- end }}{{ end }}
{{- with site.GetPage "/about" }}{{ with .OutputFormats.Get "markdown" }}
- [About the index]({{ .Permalink }})
{{- end }}{{ end }}
{{- with site.GetPage "/ideas" }}{{ with .OutputFormats.Get "markdown" }}
- [QRL 2.0 builder ideas]({{ .Permalink }})
{{- end }}{{ end }}
- [Structured schema v6 project index]({{ "index.json" | absURL }})

## Active projects

{{ range $activeProjects -}}
{{- $project := . -}}
{{- with $project.OutputFormats.Get "markdown" }}
- [{{ $project.Title }}]({{ .Permalink }}): {{ $project.Params.description | plainify }} Status: {{ $project.Params.display_status }}; type: {{ partial "project-type-label.html" $project.Params.project_type }}; primary category: {{ partial "category-label.html" $project.Params.primary_category }}; QRL generations: {{ delimit $project.Params.qrl_generations ", " }}.
{{- end }}
{{- end }}

{{ if $archivedProjects -}}
## Archived projects

{{ range $archivedProjects -}}
{{- $project := . -}}
{{- with $project.OutputFormats.Get "markdown" }}
- [{{ $project.Title }}]({{ .Permalink }}): {{ $project.Params.description | plainify }}
{{- end }}
{{- end }}
{{- end }}
