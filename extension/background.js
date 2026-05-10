// Go Local Launcher - background.js
// Fully offline omnibox launcher for open tabs and saved bookmarks.

const MODES = {
  HELP: "help",
  SMART: "smart",
  TAB: "tab",
  BOOKMARK: "bookmark"
};

const STORAGE_KEYS = {
  LAUNCHER_ENABLED: "launcherEnabled"
};

async function isLauncherEnabled() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.LAUNCHER_ENABLED);
  return result[STORAGE_KEYS.LAUNCHER_ENABLED] !== false;
}

function parseCommand(input) {
  const raw = String(input || "");
  const trimmed = raw.trim();

  if (!trimmed) {
  return {
    mode: MODES.TAB,
    query: ""
  };
}

if (trimmed === "?") {
  return {
    mode: MODES.HELP,
    query: ""
  };
}

  const parts = trimmed.split(/\s+/);
  const command = parts[0].toLowerCase();

  if (command === "tab") {
    return {
      mode: MODES.TAB,
      query: parts.slice(1).join(" ").trim()
    };
  }

  if (command === "bm") {
    return {
      mode: MODES.BOOKMARK,
      query: parts.slice(1).join(" ").trim()
    };
  }

  return {
    mode: MODES.SMART,
    query: trimmed
  };
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getHelpSuggestions() {
  return [
    {
      content: "noop:help",
      description: "[HELP] go chatgpt - Search open tabs first, then bookmarks"
    },
    {
      content: "noop:help",
      description: "[HELP] go tab gta - Search open tabs only"
    },
    {
      content: "noop:help",
      description: "[HELP] go bm ai - Search bookmarks only"
    }
  ];
}


function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function normalizeText(value) {
  return String(value || "").toLowerCase().trim();
}

function fuzzyScore(query, text) {
  const q = normalizeText(query);
  const t = normalizeText(text);

  if (!q || !t) return -1;
  if (t === q) return 1000;
  if (t.includes(q)) return 700 - t.indexOf(q);

  let queryIndex = 0;
  let score = 0;
  let lastMatchIndex = -1;

  for (let textIndex = 0; textIndex < t.length && queryIndex < q.length; textIndex++) {
    if (t[textIndex] === q[queryIndex]) {
      score += lastMatchIndex === textIndex - 1 ? 20 : 5;
      lastMatchIndex = textIndex;
      queryIndex++;
    }
  }

  return queryIndex === q.length ? score : -1;
}

async function getOpenTabs() {
  const tabs = await chrome.tabs.query({});

  return tabs
    .filter((tab) => typeof tab.id === "number" && tab.url)

    .map((tab) => ({
      type: "tab",
      id: tab.id,
      windowId: tab.windowId,
      title: tab.title || "",
      url: tab.url || "",
      domain: getDomain(tab.url || "")
    }));
}


async function getBookmarkTree() {
  return chrome.bookmarks.getTree();
}

function flattenBookmarksWithPaths(nodes, path = [], out = []) {
  for (const node of nodes) {
    const currentPath = node.title ? [...path, node.title] : path;

    if (node.url) {
      const folderPath = path.join(" > ");
      const folderName = path[path.length - 1] || "";

      out.push({
        type: "bookmark",
        id: node.id,
        title: node.title || "",
        url: node.url,
        domain: getDomain(node.url),
        folderName,
        folderPath
      });
    }

    if (node.children) {
      flattenBookmarksWithPaths(node.children, currentPath, out);
    }
  }

  return out;
}

async function getAllBookmarks() {
  const tree = await getBookmarkTree();
  return flattenBookmarksWithPaths(tree);
}

async function searchBookmarks(query, limit = 20) {
  const q = normalizeText(query);
  const bookmarks = await getAllBookmarks();

  if (!q) {
    return bookmarks.slice(0, limit).map((bookmark, index) => ({
      ...bookmark,
      score: limit - index
    }));
  }

  return bookmarks
    .map((bookmark) => {
      const title = normalizeText(bookmark.title);
      const url = normalizeText(bookmark.url);
      const domain = normalizeText(bookmark.domain);
      const folderName = normalizeText(bookmark.folderName);
      const folderPath = normalizeText(bookmark.folderPath);

      const score = Math.max(
        title === q ? 1000 : -1,
        domain === q ? 950 : -1,
        folderName === q ? 900 : -1,
        title.includes(q) ? 800 - title.indexOf(q) : -1,
        folderName.includes(q) ? 760 - folderName.indexOf(q) : -1,
        folderPath.includes(q) ? 730 - folderPath.indexOf(q) : -1,
        domain.includes(q) ? 700 - domain.indexOf(q) : -1,
        url.includes(q) ? 600 - url.indexOf(q) : -1,
        fuzzyScore(q, title),
        fuzzyScore(q, folderPath),
        fuzzyScore(q, url)
      );

      return { ...bookmark, score };
    })
    .filter((bookmark) => bookmark.score > -1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}


function formatBookmarkSuggestion(bookmark) {
  const label = bookmark.title || bookmark.domain || bookmark.url;
  const location = bookmark.folderPath || bookmark.domain;

  return {
    content: `bookmark:${bookmark.url}`,
    description: `[BM] ${escapeXml(label)} - <url>${escapeXml(location)}</url>`
  };
}


async function searchTabs(query, limit = 20) {
  const q = normalizeText(query);
  const tabs = await getOpenTabs();

  if (!q) {
    return tabs.slice(0, limit).map((tab, index) => ({
      ...tab,
      score: limit - index
    }));
  }

  return tabs
    .map((tab) => {
      const domain = normalizeText(tab.domain);
      const title = normalizeText(tab.title);
      const url = normalizeText(tab.url);

      let score = Math.max(
        domain === q ? 1000 : -1,
        title.includes(q) ? 800 - title.indexOf(q) : -1,
        domain.includes(q) ? 750 - domain.indexOf(q) : -1,
        url.includes(q) ? 600 - url.indexOf(q) : -1,
        fuzzyScore(q, title),
        fuzzyScore(q, url)
      );

      return { ...tab, score };
    })
    .filter((tab) => tab.score > -1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function formatTabSuggestion(tab) {
  return {
    content: `tab:${tab.id}`,
    description: `[TAB] ${escapeXml(tab.title || tab.domain || "Untitled tab")} - <url>${escapeXml(tab.domain || tab.url)}</url>`
  };
}

async function getSmartSuggestions(query) {
  const tabs = await searchTabs(query);

  if (tabs.length > 0) {
    return tabs.map(formatTabSuggestion);
  }

  const bookmarks = await searchBookmarks(query);

  if (bookmarks.length > 0) {
    return bookmarks.map(formatBookmarkSuggestion);
  }

  return [
    {
      content: "noop:no-smart-results",
      description: `[LOCAL] No tab or bookmark found for "${escapeXml(query)}"`
    }
  ];
}


async function switchToTab(tabId) {
  const numericTabId = Number(tabId);
  const tab = await chrome.tabs.get(numericTabId);

  if (!tab || !tab.id || !tab.windowId) {
    return;
  }

  await chrome.windows.update(tab.windowId, { focused: true });
  await chrome.tabs.update(tab.id, { active: true });
}



chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({
    description: "Type a query or use tab / bm / ?"
  });
});

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  if (!(await isLauncherEnabled())) {
    suggest([
      {
        content: "noop:disabled",
        description: "[OFF] Go TABM Launcher is inactive. Enable it from the extension popup."
      }
    ]);
    return;
  }

  const command = parseCommand(text);

  if (command.mode === MODES.HELP) {
    suggest(getHelpSuggestions());
    return;
  }

  if (command.mode === MODES.TAB) {
    const tabs = await searchTabs(command.query);

    if (!tabs.length) {
      suggest([
        {
          content: "noop:no-tab-results",
          description: `[TAB] No open tab found for "${escapeXml(command.query)}"`
        }
      ]);
      return;
    }

    suggest(tabs.map(formatTabSuggestion));
    return;
  }

  if (command.mode === MODES.BOOKMARK) {
    const bookmarks = await searchBookmarks(command.query);

    if (!bookmarks.length) {
      suggest([
        {
          content: "noop:no-bookmark-results",
          description: `[BM] No bookmark found for "${escapeXml(command.query)}"`
        }
      ]);
      return;
    }

    suggest(bookmarks.map(formatBookmarkSuggestion));
    return;
  }

  if (command.mode === MODES.SMART) {
    const suggestions = await getSmartSuggestions(command.query);
    suggest(suggestions);
    return;
  }

  suggest([
    {
      content: "noop:debug",
      description: `[DEBUG] mode=${command.mode}, query="${escapeXml(command.query)}"`
    }
  ]);
});

chrome.omnibox.onInputEntered.addListener(async (text) => {
  if (!(await isLauncherEnabled())) {
    return;
  }

  if (text.startsWith("tab:")) {
    const tabId = text.slice("tab:".length);
    await switchToTab(tabId);
    return;
  }


  if (text.startsWith("bookmark:")) {
    const url = text.slice("bookmark:".length);
    await chrome.tabs.create({ url, active: true });
    return;
  }


  if (text.startsWith("noop:")) {
    return;
  }

  const command = parseCommand(text);
  console.log("Entered command:", command);
});
