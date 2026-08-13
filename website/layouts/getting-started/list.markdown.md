# {{ .Title }}

> {{ .Description }}

{{- with .OutputFormats.Get "html" }}

- Canonical page: [{{ $.Title }}]({{ .Permalink }})
{{- end }}

This guide currently covers QRL 2.0 through Testnet V2. Follow the journey from running a node to connecting a dApp, and refer to the official documentation for the latest commands and network configuration. Ecosystem listings are community-maintained and provided for information only; inclusion does not imply endorsement, security review, or compatibility.

## What you will finish with

- A synchronized local node
- A funded Testnet V2 wallet
- A deployed smart contract
- A wallet-connected dApp interaction

{{ range .Params.steps -}}
## {{ .number }}. {{ .title }}

{{ .summary }}

{{- with .platform_guides }}

### Platform guides

{{- range . }}
- **{{ .name }}:** [Install]({{ .install_url }}) · [Run]({{ .run_url }})
{{- end }}
{{- end }}

{{- with .links }}

### Official guide

{{- range . }}
- [{{ .label }}]({{ .url }}){{ with .description }}: {{ . }}{{ end }}
{{- end }}
{{- end }}

{{- with .note }}

> **Keep in mind:** {{ . }}
{{- end }}

{{- range .ecosystem_groups }}
{{- $group := . }}
{{- $projects := partial "getting-started/project-pages.html" (dict "site" site "group" $group) }}
{{- with $projects }}
{{- $groupMeta := index $.Params.resource_groups $group }}

### {{ $groupMeta.title }}

{{ $groupMeta.description }} Shown alphabetically from active listings; no ranking or recommendation is implied.

{{- range . }}
{{- $project := . }}
{{- $metadata := $project.Params.platforms | default (slice) }}
{{- if not $metadata }}{{ $metadata = $project.Params.supported_networks | default (slice) }}{{ end }}
{{- if and (not $metadata) $project.Params.network }}{{ $metadata = slice $project.Params.network }}{{ end }}
{{- if not $metadata }}{{ $metadata = $project.Params.languages | default (slice) }}{{ end }}
{{- with $project.OutputFormats.Get "markdown" }}
- [{{ $project.Title }}]({{ .Permalink }}): {{ $project.Params.description | plainify }} Status: {{ $project.Params.status }}{{ with $metadata }}; platforms or networks: {{ delimit . ", " }}{{ end }}.
{{- end }}
{{- end }}
{{- end }}
{{- end }}

**Ready for the next step when:** {{ .completion }}

{{ end -}}
## Keep building

Explore [builder ideas]({{ with site.GetPage "/ideas" }}{{ .Permalink }}{{ end }}) and [submit your project](https://github.com/theqrl-community/qrl-ecosystem-index/blob/main/CONTRIBUTING.md) when it is ready to share.
