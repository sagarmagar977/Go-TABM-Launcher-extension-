# Go TABM Launcher

A local-only Brave/Chrome extension that turns the address bar into a fast launcher for open tabs and saved bookmarks.

Type `go`, press Space or Tab, then search your local browser state without using browser history, web search, or cloud services.

## What It Does

- Searches currently open tabs from the address bar.
- Searches saved bookmarks from the address bar.
- Switches to an existing tab instead of opening a duplicate.
- Opens bookmark results in a new tab.
- Searches bookmark title, URL, domain, folder name, and folder path.
- Runs fully locally in the browser.

## Commands

The fastest way to use the extension is from the address bar.

1. Press `Alt+D` to focus the address bar.
2. Type `go`.
3. Press Space or Tab to activate Go TABM Launcher.
4. Type a query or command mode.
5. Press Enter on the result you want.

Activate the extension:

```text
go [Space]
```

Then type one of these:

```text
youtube
```

Smart mode. Searches open tabs first. Bookmark fallback is planned.

```text
tab youtube
```

Tab-only mode. Searches open tabs by title, URL, and domain.

```text
bm chatgpt
```

Bookmark-only mode. Searches saved bookmarks.

```text
bm ai
```

Searches bookmarks by folder name or folder path, so bookmarks inside an `AI` folder can appear.

```text
?
```

Shows help suggestions.

## Current Status

Implemented:

- Manifest V3 extension setup
- `go` omnibox keyword
- command parser
- tab search
- tab switching
- bookmark search
- bookmark opening in a new tab
- local-only behavior

In progress / planned:

- smarter bookmark fallback for `go [query]`
- cleaner popup UI
- optional aliases such as `yt -> youtube`
- pinned or favorite local results

## Installation

1. Open Brave or Chrome.
2. Go to:

```text
brave://extensions
```

or:

```text
chrome://extensions
```

3. Enable Developer mode.
4. Click **Load unpacked**.
5. Select the `extension/` folder from this project.
6. In the address bar, type:

```text
go
```

7. Press Space or Tab to activate Go TABM Launcher.

Keyboard flow:

```text
Alt+D -> go -> Space -> tab youtube -> Enter
```

or:

```text
Alt+D -> go -> Space -> bm chatgpt -> Enter
```

## Project Structure

```text
bookmark-jump-v2/
  extension/
    manifest.json
    background.js
    popup.html
    icon.png
  reference_folder/
    PRD.md
    workflow/
      PLAN.md
      TRACK.md
  README.md
```

## Privacy

Go TABM Launcher is designed to be local-only.

- No remote API calls.
- No analytics.
- No cloud sync.
- No browser history search.
- No query data leaves the browser.

The extension uses these permissions:

| Permission | Why it is needed |
|---|---|
| `tabs` | Read open tab titles/URLs and switch to matching tabs. |
| `bookmarks` | Read saved bookmarks and bookmark folder paths. |
| `storage` | Reserved for local settings and future aliases. |

## Screenshots

Markdown supports `.png` images. Put screenshots in a folder such as:

```text
assets/
```

Then reference them like this:

```md
![Go TABM Launcher tab search](assets/tab-search.png)
```

Example section after adding screenshots:

```md
![Tab search](assets/tab-search.png)
![Bookmark search](assets/bookmark-search.png)
```

## Notes

Brave/Chrome controls the address bar UI. Extensions can provide omnibox suggestions after their keyword is activated, but they cannot fully disable every native browser suggestion from code.

For the cleanest experience, keep the extension activated with `go [Space]`, and use local commands such as `tab youtube` or `bm chatgpt`.
