# GhostView

**WiFi sensing that turns radio signals into spatial intelligence.**

GhostView reads the radio reflections that ordinary WiFi leaves on the people
in a room and turns them into presence, movement, breathing, heart-rate and
pose estimates — without a camera. It runs on low-cost edge hardware (ESP32
nodes) and ships with a sensing server, a web dashboard and 3D visualisations.

> **Origin and credit.** GhostView is a rebranded fork of
> [RuView](https://github.com/ruvnet/RuView) by rUv, taken at upstream commit
> `6115031`. The sensing code, firmware, models and documentation are the work
> of the RuView authors and remain under their licence (see [LICENSE](LICENSE)
> and [NOTICE](NOTICE)). Only the visible project name has changed; nothing in
> this fork has been built or tested separately from upstream.

## What is in this repository

| Path | Contents |
|------|----------|
| `v2/` | Rust workspace: signal processing, sensing server, desktop app |
| `firmware/` | ESP32 firmware that captures WiFi channel data (CSI) |
| `ui/`, `dashboard/` | Web UI, 3D observatory and dashboard |
| `python/`, `wifi_densepose/` | Python bindings and client |
| `harness/`, `tools/`, `plugins/` | Command-line tools, MCP server and agent tooling |
| `examples/` | Demos, Home Assistant blueprints, three.js scenes |
| `docs/` | User guide, architecture decisions, research notes |

## Getting the code

Several dependencies are git submodules that point at their upstream
repositories, so clone with submodules:

```bash
git clone --recurse-submodules https://github.com/Ghostfreakxx/3dmap-wartime-visual3dvideo.git
cd 3dmap-wartime-visual3dvideo
```

## Running it

Start with the [user guide](docs/user-guide.md). It covers the simulated demo
(no hardware needed), flashing an ESP32 node, and the full sensing setup.

The published packages still belong to the upstream project and keep their
upstream names — the Docker image `ruvnet/wifi-densepose`, the npm package
`@ruvnet/ruview`, and the Python packages `ruview` / `wifi-densepose`. Commands
and identifiers such as `ruview`, `RUVIEW_*` environment variables and the
`wifi-densepose-*` crates are unchanged in this fork, so the upstream
instructions apply as written.

## What was changed from upstream

- The project name in the README, user-facing guides, UI and dashboard text,
  and package descriptions now reads GhostView.
- Internal package, crate, command and environment-variable names are
  unchanged, so the code builds the same way as upstream.
- The changelog, release notes, architecture decision records, research notes,
  model card and proof document are upstream history and are left as written.
- Images under `assets/` still show the RuView name.
- Upstream's GitHub Actions workflows and agent configuration are not included.

The original upstream README is kept at
[docs/UPSTREAM_README.md](docs/UPSTREAM_README.md).

## Licence

Released under the terms in [LICENSE](LICENSE), copyright the original RuView
authors. Third-party material and its licences are listed in [NOTICE](NOTICE).
