const STORAGE_KEY = "research-fitness-english-planner-v2";
const LEGACY_STORAGE_KEY = "research-fitness-english-planner-v1";
const CLOUD_CONFIG_KEY = "planner-cloud-config-v1";
const TITLE_SETTINGS_KEY = "planner-title-settings-v1";
const TITLE_SETTINGS_UPDATED_KEY = "planner-title-settings-updated-v1";
const THEME_SETTINGS_KEY = "planner-theme-settings-v1";
const THEME_SETTINGS_UPDATED_KEY = "planner-theme-settings-updated-v1";
const AI_SETTINGS_KEY = "planner-ai-settings-v1";
const HEIGHT_KEY = "planner-height-cm-v1";
const COLLECTIONS = ["research", "fitness", "english", "ideas", "notes"];

const initialState = {
  research: [],
  fitness: [],
  english: [],
  ideas: [],
  notes: []
};

const defaultCloudConfig = {
  url: "https://laorqicotmbrkbtxnodx.supabase.co",
  key: "sb_publishable_57BNktBbFB5wNfodtPQAQQ_FV91yTNP"
};

const defaultTitles = {
  appTitle: "日常规划台",
  overviewTitle: "今日概览",
  quickTitle: "快速记录",
  settingsTitle: "标题设置",
  syncTitle: "云同步",
  backupTitle: "备份",
  researchTitle: "科研",
  fitnessTitle: "健身",
  englishTitle: "英语",
  notesTitle: "科研笔记",
  ideasTitle: "科研 Idea",
  researchHeading: "科研推进",
  researchFormTitle: "新增科研任务",
  todayResearchTitle: "今日",
  shortResearchTitle: "短期项目",
  longResearchTitle: "长期目标",
  fitnessHeading: "健身与体重",
  fitnessFormTitle: "新增健身记录",
  fitnessListTitle: "最近记录",
  englishHeading: "英语学习",
  englishFormTitle: "新增英语记录",
  englishListTitle: "学习记录",
  notesHeading: "科研笔记",
  notesFormTitle: "新增科研笔记",
  notesListTitle: "科研笔记",
  ideasHeading: "科研 Idea 捕捉",
  ideasFormTitle: "新增科研 idea",
  ideasListTitle: "科研 idea 池"
};

const themePresets = {
  insta: {
    name: "Insta 粉",
    primary: "#d86f93",
    accent: "#7e9f90",
    bg: "#fbf7f5",
    ink: "#2f2a2d"
  },
  matcha: {
    name: "抹茶白",
    primary: "#7e9f90",
    accent: "#d69a7a",
    bg: "#f7f7ef",
    ink: "#2e332f"
  },
  lavender: {
    name: "薰衣草",
    primary: "#9b86d9",
    accent: "#d887a7",
    bg: "#faf7ff",
    ink: "#302b3f"
  },
  clean: {
    name: "奶油黑",
    primary: "#2f2a2d",
    accent: "#c78368",
    bg: "#fbf6ee",
    ink: "#262323"
  }
};

const defaultTheme = { ...themePresets.insta };

const defaultAiSettings = {
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-5.5",
  apiKey: "",
  focus: "conversation"
};

let state = loadState();
let cloudConfig = loadCloudConfig();
let titleSettings = loadTitleSettings();
let titleSettingsUpdatedAt = localStorage.getItem(TITLE_SETTINGS_UPDATED_KEY) || new Date().toISOString();
let themeSettings = loadThemeSettings();
let themeSettingsUpdatedAt = localStorage.getItem(THEME_SETTINGS_UPDATED_KEY) || new Date().toISOString();
let aiSettings = loadAiSettings();
let heightCm = localStorage.getItem(HEIGHT_KEY) || "";
let supabaseClient = null;
let currentUser = null;
let syncTimer = null;

const $ = (selector) => document.querySelector(selector);
const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long"
});

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY));
    return normalizeState(saved);
  } catch {
    return structuredClone(initialState);
  }
}

function normalizeState(input) {
  const next = structuredClone(initialState);
  if (!input || typeof input !== "object") return next;

  COLLECTIONS.forEach((collection) => {
    next[collection] = Array.isArray(input[collection])
      ? input[collection].map((item) => ({
          ...item,
          id: item.id || createId(),
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
          done: Boolean(item.done)
        }))
      : [];
  });
  return next;
}

function saveState(options = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();

  if (options.sync !== false) {
    queueSync();
  }
}

function loadCloudConfig() {
  return { ...defaultCloudConfig };
}

function saveCloudConfig() {
  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(cloudConfig));
}

function normalizeSupabaseUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    return parsed.origin;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

function loadTitleSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(TITLE_SETTINGS_KEY));
    return { ...defaultTitles, ...saved };
  } catch {
    return { ...defaultTitles };
  }
}

function saveTitleSettings(options = {}) {
  if (options.touch !== false) {
    titleSettingsUpdatedAt = new Date().toISOString();
    localStorage.setItem(TITLE_SETTINGS_UPDATED_KEY, titleSettingsUpdatedAt);
  }
  localStorage.setItem(TITLE_SETTINGS_KEY, JSON.stringify(titleSettings));
  applyTitles();

  if (options.sync !== false) {
    queueSync();
  }
}

function loadThemeSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(THEME_SETTINGS_KEY));
    return { ...defaultTheme, ...saved };
  } catch {
    return { ...defaultTheme };
  }
}

function saveThemeSettings(options = {}) {
  if (options.touch !== false) {
    themeSettingsUpdatedAt = new Date().toISOString();
    localStorage.setItem(THEME_SETTINGS_UPDATED_KEY, themeSettingsUpdatedAt);
  }
  localStorage.setItem(THEME_SETTINGS_KEY, JSON.stringify(themeSettings));
  applyTheme();

  if (options.sync !== false) {
    queueSync();
  }
}

function applyTheme() {
  const root = document.documentElement;
  const primaryDark = shadeColor(themeSettings.primary, -14);
  const primaryLight = mixColor(themeSettings.primary, "#ffffff", 28);
  const accentLight = mixColor(themeSettings.accent, "#ffffff", 26);
  const bgLight = mixColor(themeSettings.bg, "#ffffff", 28);
  root.style.setProperty("--primary", themeSettings.primary);
  root.style.setProperty("--primary-dark", primaryDark);
  root.style.setProperty("--accent", themeSettings.accent);
  root.style.setProperty("--bg", themeSettings.bg);
  root.style.setProperty("--ink", themeSettings.ink);
  root.style.setProperty("--muted", mixColor(themeSettings.ink, themeSettings.bg, 42));
  root.style.setProperty("--line", hexToRgba(mixColor(themeSettings.ink, themeSettings.bg, 60), 0.42));
  root.style.setProperty("--surface-strong", mixColor(themeSettings.bg, "#ffffff", 55));
  root.style.setProperty("--rose-soft", mixColor(themeSettings.primary, "#ffffff", 84));
  root.style.setProperty("--sage-soft", mixColor(themeSettings.accent, "#ffffff", 84));
  root.style.setProperty("--lavender-soft", mixColor(themeSettings.primary, themeSettings.bg, 88));
  root.style.setProperty("--body-gradient", `linear-gradient(135deg, ${hexToRgba(mixColor(themeSettings.primary, "#ffffff", 72), 0.94)} 0%, ${hexToRgba(bgLight, 0.92)} 48%, ${hexToRgba(mixColor(themeSettings.accent, "#ffffff", 74), 0.88)} 100%)`);
  root.style.setProperty("--brand-gradient", `linear-gradient(135deg, ${primaryLight} 0%, ${themeSettings.primary} 52%, ${themeSettings.accent} 100%)`);
  root.style.setProperty("--primary-gradient", `linear-gradient(135deg, ${primaryLight} 0%, ${themeSettings.primary} 100%)`);
  root.style.setProperty("--primary-gradient-hover", `linear-gradient(135deg, ${themeSettings.primary} 0%, ${primaryDark} 100%)`);
  root.style.setProperty("--focus-ring", hexToRgba(themeSettings.primary, 0.16));
  root.style.setProperty("--primary-shadow", hexToRgba(themeSettings.primary, 0.24));

  document.querySelectorAll("[data-theme-input]").forEach((input) => {
    const key = input.dataset.themeInput;
    input.value = themeSettings[key] || defaultTheme[key];
  });
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const value = clean.length === 3
    ? clean.split("").map((char) => char + char).join("")
    : clean;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16)
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0")).join("")}`;
}

function mixColor(colorA, colorB, weightB) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const amount = weightB / 100;
  return rgbToHex({
    r: a.r * (1 - amount) + b.r * amount,
    g: a.g * (1 - amount) + b.g * amount,
    b: a.b * (1 - amount) + b.b * amount
  });
}

function shadeColor(color, amount) {
  return mixColor(color, amount < 0 ? "#000000" : "#ffffff", Math.abs(amount));
}

function hexToRgba(hex, alpha) {
  const rgb = hexToRgb(hex);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function loadAiSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(AI_SETTINGS_KEY));
    return { ...defaultAiSettings, ...saved };
  } catch {
    return { ...defaultAiSettings };
  }
}

function saveAiSettings() {
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(aiSettings));
  applyAiSettings();
}

function applyAiSettings() {
  $("#aiBaseUrl").value = aiSettings.baseUrl || "";
  $("#aiModel").value = aiSettings.model || "";
  $("#aiApiKey").value = aiSettings.apiKey || "";
  $("#aiFocus").value = aiSettings.focus || "conversation";
  $("#aiStatus").textContent = aiSettings.apiKey ? "已配置" : "未配置";
  $("#aiStatus").dataset.tone = aiSettings.apiKey ? "online" : "pending";

  if ($("#settingsAiStatus")) {
    $("#settingsAiStatus").textContent = aiSettings.apiKey ? "已配置" : "未配置";
    $("#settingsAiStatus").dataset.tone = aiSettings.apiKey ? "online" : "pending";
  }

  if ($("#ideaAiStatus")) {
    $("#ideaAiStatus").textContent = aiSettings.apiKey ? "已配置" : "未配置";
    $("#ideaAiStatus").dataset.tone = aiSettings.apiKey ? "online" : "pending";
  }
}

function applyTitles() {
  document.querySelectorAll("[data-title-key]").forEach((element) => {
    const key = element.dataset.titleKey;
    element.textContent = titleSettings[key] || defaultTitles[key] || element.textContent;
  });

  document.querySelectorAll("[data-title-input]").forEach((input) => {
    const key = input.dataset.titleInput;
    input.value = titleSettings[key] || defaultTitles[key] || "";
  });

  document.title = titleSettings.appTitle || defaultTitles.appTitle;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function touchRecord(record) {
  return {
    ...record,
    updatedAt: new Date().toISOString()
  };
}

function addRecord(collection, record) {
  state[collection].unshift(
    touchRecord({
      id: createId(),
      createdAt: new Date().toISOString(),
      done: false,
      ...record
    })
  );
  saveState();
}

async function removeRecord(collection, id) {
  state[collection] = state[collection].filter((item) => item.id !== id);
  saveState({ sync: false });

  if (currentUser && supabaseClient) {
    const { error } = await supabaseClient.from("planner_records").delete().eq("id", id);
    if (error) {
      setCloudMessage(`云端删除失败：${error.message}`);
      return;
    }
    setCloudMessage("已删除并同步到云端。");
  }
}

function toggleDone(collection, id) {
  state[collection] = state[collection].map((item) =>
    item.id === id ? touchRecord({ ...item, done: !item.done }) : item
  );
  saveState();
}

function weekKey(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const dayOffset = Math.floor((date - firstDay) / 86400000);
  return `${date.getFullYear()}-${Math.ceil((dayOffset + firstDay.getDay() + 1) / 7)}`;
}

function recordDate(item) {
  return item.date || item.createdAt?.slice(0, 10) || todayISO();
}

function isThisWeek(item) {
  return weekKey(recordDate(item)) === weekKey(todayISO());
}

function weekLabel(key) {
  const [year, week] = key.split("-");
  return `${year} 年第 ${week} 周`;
}

function renderList(container, items, collection, formatter, options = {}) {
  const target = $(container);
  target.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = options.empty || "还没有记录";
    target.appendChild(empty);
    return;
  }

  const template = $("#itemTemplate");
  items.forEach((item) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.classList.toggle("done", Boolean(item.done));
    node.querySelector(".record-main").innerHTML = formatter(item);
    node.querySelector(".done-button").textContent = item.done ? "恢复" : "完成";
    node.querySelector(".done-button").addEventListener("click", () => toggleDone(collection, item.id));
    node.querySelector(".delete-button").addEventListener("click", () => removeRecord(collection, item.id));
    target.appendChild(node);
  });
}

function renderHistory(container, items, formatter, options = {}) {
  const target = $(container);
  if (!target) return;
  target.innerHTML = "";

  const historyItems = items.filter((item) => !isThisWeek(item));
  if (!historyItems.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = options.empty || "还没有历史记录";
    target.appendChild(empty);
    return;
  }

  const groups = historyItems.reduce((acc, item) => {
    const key = weekKey(recordDate(item));
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .forEach(([key, group]) => {
      const details = document.createElement("details");
      details.className = "history-week";
      details.innerHTML = `<summary>${text(weekLabel(key))} · ${group.length} 条</summary>`;
      const list = document.createElement("div");
      list.className = "history-week-list";
      group
        .sort((a, b) => new Date(recordDate(b)) - new Date(recordDate(a)))
        .forEach((item) => {
          const card = document.createElement("article");
          card.className = "history-item";
          card.innerHTML = formatter(item);
          list.appendChild(card);
        });
      details.appendChild(list);
      target.appendChild(details);
    });
}

function text(value) {
  const div = document.createElement("div");
  div.textContent = value || "";
  return div.innerHTML;
}

function researchMarkup(item) {
  return `
    <div class="record-title">${text(item.title)}</div>
    ${item.note ? `<div class="record-note">${text(item.note)}</div>` : ""}
    <div class="record-meta">${text(item.createdAt.slice(0, 10))}</div>
  `;
}

function fitnessMarkup(item) {
  return `
    <div class="record-title">${text(item.date)} · ${text(item.mood)}</div>
    ${item.weight ? `<div class="record-note">体重：${text(item.weight)} kg</div>` : ""}
    ${item.workout ? `<div class="record-note">${text(item.workout)}</div>` : ""}
  `;
}

function renderWeightModule() {
  const entries = state.fitness
    .filter((item) => item.weight !== "" && item.weight !== null && item.weight !== undefined)
    .map((item) => ({
      ...item,
      numericWeight: Number(item.weight)
    }))
    .filter((item) => Number.isFinite(item.numericWeight))
    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

  const list = $("#weightList");
  list.innerHTML = "";
  $("#heightInput").value = heightCm || "";

  if (!entries.length) {
    $("#latestWeight").textContent = "--";
    $("#weightChange").textContent = "--";
    $("#weightTrend").textContent = "暂无";
    $("#weightTrend").dataset.tone = "pending";
    $("#bmiValue").textContent = "--";
    $("#bmiLabel").textContent = "BMI";
    renderWeightChart([]);
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "还没有体重记录";
    list.appendChild(empty);
    return;
  }

  const latest = entries[0];
  const previous = entries[1];
  $("#latestWeight").textContent = latest.numericWeight.toFixed(1);
  renderBmi(latest.numericWeight);

  if (previous) {
    const diff = latest.numericWeight - previous.numericWeight;
    const sign = diff > 0 ? "+" : "";
    $("#weightChange").textContent = `${sign}${diff.toFixed(1)}`;
    $("#weightTrend").textContent = diff === 0 ? "持平" : diff > 0 ? "上升" : "下降";
    $("#weightTrend").dataset.tone = diff <= 0 ? "online" : "pending";
  } else {
    $("#weightChange").textContent = "--";
    $("#weightTrend").textContent = "首条";
    $("#weightTrend").dataset.tone = "pending";
  }

  entries.slice(0, 7).forEach((item) => {
    const row = document.createElement("div");
    row.className = "weight-row";
    row.innerHTML = `
      <span>${text(item.date || item.createdAt.slice(0, 10))}</span>
      <strong>${text(item.numericWeight.toFixed(1))} kg</strong>
    `;
    list.appendChild(row);
  });
  renderWeightChart(entries.slice().reverse());
}

function renderBmi(weight) {
  const height = Number(heightCm);
  if (!Number.isFinite(height) || height <= 0) {
    $("#bmiValue").textContent = "--";
    $("#bmiLabel").textContent = "填身高后计算 BMI";
    return;
  }

  const bmi = weight / ((height / 100) ** 2);
  $("#bmiValue").textContent = bmi.toFixed(1);
  let label = "正常";
  if (bmi < 18.5) label = "偏瘦";
  if (bmi >= 24) label = "超重";
  if (bmi >= 28) label = "肥胖";
  $("#bmiLabel").textContent = `BMI · ${label}`;
}

function renderWeightChart(entries) {
  const svg = $("#weightChart");
  if (!svg) return;
  svg.innerHTML = "";

  if (entries.length < 2) {
    svg.innerHTML = `<text x="260" y="96" text-anchor="middle" fill="currentColor">至少两条体重记录后显示曲线</text>`;
    return;
  }

  const width = 520;
  const height = 180;
  const padding = 28;
  const weights = entries.map((item) => item.numericWeight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const points = entries.map((item, index) => {
    const x = padding + (index / (entries.length - 1)) * (width - padding * 2);
    const y = height - padding - ((item.numericWeight - min) / range) * (height - padding * 2);
    return { x, y, item };
  });
  const pointString = points.map((point) => `${point.x},${point.y}`).join(" ");

  svg.innerHTML = `
    <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" class="chart-axis" />
    <polyline points="${pointString}" class="chart-line" />
    ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4" class="chart-dot"><title>${text(recordDate(point.item))}: ${text(point.item.numericWeight.toFixed(1))} kg</title></circle>`).join("")}
    <text x="${padding}" y="22" class="chart-label">${max.toFixed(1)} kg</text>
    <text x="${padding}" y="${height - 8}" class="chart-label">${min.toFixed(1)} kg</text>
  `;
}

function englishMarkup(item) {
  return `
    <div class="record-title">${text(item.date)} · ${text(item.topic)}</div>
    ${item.words ? `<div class="record-note">单词：${text(item.words)}</div>` : ""}
    ${item.patterns ? `<div class="record-note">句式：${text(item.patterns)}</div>` : ""}
    ${item.review ? `<div class="record-note">复盘：${text(item.review)}</div>` : ""}
  `;
}

function ideaMarkup(item) {
  return `
    <div class="record-title">${text(item.title)}</div>
    ${item.body ? `<div class="record-note">${text(item.body)}</div>` : ""}
    <div class="record-meta">${text(item.source)} · ${text(item.createdAt.slice(0, 10))}</div>
  `;
}

function noteMarkup(item) {
  return `
    <div class="record-title">${text(item.title)}</div>
    ${item.keywords ? `<div class="record-note">关键词：${text(item.keywords)}</div>` : ""}
    ${item.body ? `<div class="record-note">${text(item.body)}</div>` : ""}
    ${item.imageData ? `<img class="note-image" src="${item.imageData}" alt="${text(item.imageName || "科研笔记图片")}" />` : ""}
    <div class="record-meta">${text(item.source)} · ${text(item.date || item.createdAt.slice(0, 10))}</div>
  `;
}

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve({ imageData: "", imageName: "" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ imageData: reader.result, imageName: file.name });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function render() {
  $("#todayLabel").textContent = dateFormatter.format(new Date());
  const currentWeek = weekKey(todayISO());
  $("#researchCount").textContent = state.research.filter((item) => isThisWeek(item) && !item.done).length;
  $("#fitnessCount").textContent = state.fitness.filter((item) => item.date === todayISO()).length;

  const englishThisWeek = state.english.filter((item) => weekKey(item.date) === currentWeek).length;
  $("#englishCount").textContent = englishThisWeek;
  $("#englishWeeklyHint").textContent = `本周 ${englishThisWeek} / 2`;
  $("#ideaCount").textContent = state.ideas.filter(isThisWeek).length;

  renderList(
    "#todayResearchList",
    state.research.filter((item) => item.scope === "today" && isThisWeek(item)),
    "research",
    researchMarkup,
    { empty: "今天还没有科研待办" }
  );
  renderList(
    "#shortResearchList",
    state.research.filter((item) => item.scope === "short" && isThisWeek(item)),
    "research",
    researchMarkup,
    { empty: "短期项目先空着" }
  );
  renderList(
    "#longResearchList",
    state.research.filter((item) => item.scope === "long" && isThisWeek(item)),
    "research",
    researchMarkup,
    { empty: "长期目标先写一个也很好" }
  );
  renderHistory("#researchHistoryList", state.research, researchMarkup);
  renderWeightModule();
  renderList("#fitnessList", state.fitness.filter(isThisWeek), "fitness", fitnessMarkup);
  renderHistory("#fitnessHistoryList", state.fitness, fitnessMarkup);
  renderList("#englishList", state.english.filter(isThisWeek), "english", englishMarkup);
  renderHistory("#englishHistoryList", state.english, englishMarkup);
  renderList("#noteList", state.notes.filter(isThisWeek), "notes", noteMarkup);
  renderHistory("#noteHistoryList", state.notes, noteMarkup);
  renderList("#ideaList", state.ideas.filter(isThisWeek), "ideas", ideaMarkup);
  renderHistory("#ideaHistoryList", state.ideas, ideaMarkup);
}

function bindForms() {
  $("#fitnessDate").value = todayISO();
  $("#englishDate").value = todayISO();
  $("#noteDate").value = todayISO();
  $("#heightInput").addEventListener("change", () => {
    heightCm = $("#heightInput").value;
    localStorage.setItem(HEIGHT_KEY, heightCm);
    renderWeightModule();
  });

  $("#quickForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const content = $("#quickText").value.trim();
    const type = $("#quickType").value;
    if (!content) return;

    if (type === "research") addRecord("research", { title: content, note: "", scope: "today" });
    if (type === "notes") addRecord("notes", { date: todayISO(), title: content.slice(0, 50), source: "其他", keywords: "", body: content, imageData: "", imageName: "" });
    if (type === "fitness") addRecord("fitness", { date: todayISO(), weight: "", workout: content, mood: "计划" });
    if (type === "english") addRecord("english", { date: todayISO(), topic: content, words: "", patterns: "", review: "" });
    if (type === "idea") addRecord("ideas", { title: content.slice(0, 40), source: "科研问题", body: content });

    $("#quickText").value = "";
  });

  $("#researchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    addRecord("research", {
      title: $("#researchTitle").value.trim(),
      scope: $("#researchScope").value,
      note: $("#researchNote").value.trim()
    });
    event.target.reset();
  });

  $("#fitnessForm").addEventListener("submit", (event) => {
    event.preventDefault();
    addRecord("fitness", {
      date: $("#fitnessDate").value,
      weight: $("#weight").value,
      workout: $("#workout").value.trim(),
      mood: $("#fitnessMood").value
    });
    event.target.reset();
    $("#fitnessDate").value = todayISO();
  });

  $("#englishForm").addEventListener("submit", (event) => {
    event.preventDefault();
    addRecord("english", {
      date: $("#englishDate").value,
      topic: $("#englishTopic").value.trim(),
      words: $("#englishWords").value.trim(),
      patterns: $("#englishPatterns").value.trim(),
      review: $("#englishReview").value.trim()
    });
    event.target.reset();
    $("#englishDate").value = todayISO();
  });

  $("#noteForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const imageFile = $("#noteImage").files[0];
    const image = await readImageAsDataUrl(imageFile);
    addRecord("notes", {
      date: $("#noteDate").value,
      source: $("#noteSource").value,
      title: $("#noteTitle").value.trim(),
      keywords: $("#noteKeywords").value.trim(),
      body: $("#noteBody").value.trim(),
      ...image
    });
    event.target.reset();
    $("#noteDate").value = todayISO();
  });

  $("#ideaForm").addEventListener("submit", (event) => {
    event.preventDefault();
    addRecord("ideas", {
      title: $("#ideaTitle").value.trim(),
      source: $("#ideaSource").value,
      body: $("#ideaBody").value.trim()
    });
    event.target.reset();
  });
}

function bindNavigation() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".view").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      $(`#${button.dataset.tab}View`).classList.add("active");
    });
  });
}

function bindDataControls() {
  $("#clearDoneBtn").addEventListener("click", async () => {
    const deletedIds = COLLECTIONS.flatMap((collection) =>
      state[collection].filter((item) => item.done).map((item) => item.id)
    );

    COLLECTIONS.forEach((collection) => {
      state[collection] = state[collection].filter((item) => !item.done);
    });
    saveState({ sync: false });

    if (currentUser && supabaseClient && deletedIds.length) {
      await supabaseClient.from("planner_records").delete().in("id", deletedIds);
      setCloudMessage("已清除完成项并同步到云端。");
    }
  });

  $("#exportBtn").addEventListener("click", () => {
    const backup = {
      ...state,
      titleSettings,
      themeSettings
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `planner-backup-${todayISO()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  $("#importFile").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const imported = JSON.parse(await file.text());
    state = normalizeState(imported);
    if (imported.titleSettings && typeof imported.titleSettings === "object") {
      titleSettings = { ...defaultTitles, ...imported.titleSettings };
      saveTitleSettings();
    }
    if (imported.themeSettings && typeof imported.themeSettings === "object") {
      themeSettings = { ...defaultTheme, ...imported.themeSettings };
      saveThemeSettings();
    }
    saveState();
    event.target.value = "";
  });
}

function bindTitleSettings() {
  $("#titleSettingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    document.querySelectorAll("[data-title-input]").forEach((input) => {
      const key = input.dataset.titleInput;
      titleSettings[key] = input.value.trim() || defaultTitles[key];
    });
    saveTitleSettings();
  });

  $("#resetTitlesBtn").addEventListener("click", () => {
    titleSettings = { ...defaultTitles };
    saveTitleSettings();
  });
}

function bindThemeSettings() {
  const presetContainer = $("#themePresets");
  presetContainer.innerHTML = "";

  Object.entries(themePresets).forEach(([key, preset]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-preset";
    button.dataset.preset = key;
    button.innerHTML = `
      <span class="theme-swatch" style="background:${preset.primary}"></span>
      <span class="theme-swatch" style="background:${preset.accent}"></span>
      <span>${text(preset.name)}</span>
    `;
    button.addEventListener("click", () => {
      themeSettings = { ...preset };
      saveThemeSettings();
    });
    presetContainer.appendChild(button);
  });

  $("#themeSettingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    document.querySelectorAll("[data-theme-input]").forEach((input) => {
      themeSettings[input.dataset.themeInput] = input.value;
    });
    themeSettings.name = "自定义";
    saveThemeSettings();
  });

  $("#resetThemeBtn").addEventListener("click", () => {
    themeSettings = { ...defaultTheme };
    saveThemeSettings();
  });
}

function bindAiControls() {
  $("#aiSettingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    aiSettings = {
      baseUrl: $("#aiBaseUrl").value.trim() || defaultAiSettings.baseUrl,
      model: $("#aiModel").value.trim() || defaultAiSettings.model,
      apiKey: $("#aiApiKey").value.trim(),
      focus: aiSettings.focus || "conversation"
    };
    saveAiSettings();
    if ($("#aiSuggestion")) $("#aiSuggestion").value = "AI 配置已保存。";
  });

  $("#askAiBtn").addEventListener("click", askAiForEnglishAdvice);
  $("#copyAiPromptBtn").addEventListener("click", async () => {
    const prompt = buildEnglishAdvicePrompt();
    await navigator.clipboard.writeText(prompt);
    $("#aiSuggestion").value = "提示词已复制，可以直接粘贴到 ChatGPT 或其他 AI 工具。";
  });

  $("#askIdeaAiBtn").addEventListener("click", askAiForIdeaAdvice);
  $("#copyIdeaPromptBtn").addEventListener("click", async () => {
    const prompt = buildIdeaAdvicePrompt();
    await navigator.clipboard.writeText(prompt);
    $("#ideaAiSuggestion").value = "科研 idea 提示词已复制，可以直接粘贴到 ChatGPT 或其他 AI 工具。";
  });
}

function buildEnglishAdvicePrompt() {
  const currentDraft = {
    date: $("#englishDate").value,
    topic: $("#englishTopic").value.trim(),
    words: $("#englishWords").value.trim(),
    patterns: $("#englishPatterns").value.trim(),
    review: $("#englishReview").value.trim()
  };
  const recentEnglish = state.english.slice(0, 5);
  const recentResearch = state.research.slice(0, 5);
  const focusText = {
    conversation: "对话话题是否自然、可展开，并给我下一次可练的英文问答。",
    words: "帮我把新单词分组，给记忆方法、例句和复习计划。",
    patterns: "帮我升级句式，给更地道、更适合科研表达的替换说法。",
    research: "把我的科研内容转成可以开口讲的英文表达，适合会议、自我介绍和组会讨论。"
  }[aiSettings.focus || "conversation"];

  return `你是我的英语学习教练，目标是帮我提高科研英语表达和日常对话能力。

请根据下面的信息给我建议：
1. 今天应该练什么。
2. 3-5 个可直接开口说的英文句子。
3. 新单词或短语的记忆建议。
4. 下次英语学习的 20 分钟计划。
5. 如果我写的表达不自然，请给更自然的替换。

本次关注点：${focusText}

当前正在填写的英语记录：
${JSON.stringify(currentDraft, null, 2)}

最近英语学习记录：
${JSON.stringify(recentEnglish, null, 2)}

最近科研任务/目标：
${JSON.stringify(recentResearch, null, 2)}

请用中文解释，英文句子保持英文。输出要具体，不要泛泛鼓励。`;
}

async function askAiForEnglishAdvice() {
  await runAiRequest({
    prompt: buildEnglishAdvicePrompt(),
    outputSelector: "#aiSuggestion",
    statusSelector: "#aiStatus",
    systemPrompt: "你是一个严谨、具体、适合科研人员的英语学习教练。",
    emptyKeyMessage: "请先到“设置 → AI 配置”里填 OpenAI API Key，或者点“复制提示词”去 ChatGPT 网页端使用。"
  });
}

function buildIdeaAdvicePrompt() {
  const currentIdea = {
    title: $("#ideaTitle").value.trim(),
    source: $("#ideaSource").value,
    body: $("#ideaBody").value.trim()
  };
  const recentIdeas = state.ideas.slice(0, 6);
  const recentResearch = state.research.slice(0, 8);
  const focusText = {
    value: "判断这个 idea 的价值、创新点、可发表潜力，以及它和已有工作的差异。",
    experiment: "给出可执行的实验/仿真验证路径，包括变量、对照组、预期现象和失败时怎么调整。",
    paper: "把这个 idea 展开成论文/报告结构，建议图表、结果呈现和故事线。",
    risk: "指出潜在风险、技术卡点、替代方案和最小可行验证。"
  }[$("#ideaAiFocus").value || "value"];

  return `你是我的科研合作者，请帮我评估和推进一个科研 idea。

请根据下面的信息输出：
1. 这个 idea 最可能有价值的点是什么。
2. 可能的创新点和需要小心避免的普通点。
3. 最小可行验证方案，包括实验/仿真步骤。
4. 下一步 3 个具体行动，每个行动最好能在 1-2 天内完成。
5. 如果要写成论文或阶段汇报，建议的图表和叙事结构。
6. 主要风险、卡点和替代路线。

本次关注点：${focusText}

当前正在填写的 idea：
${JSON.stringify(currentIdea, null, 2)}

最近科研任务/目标：
${JSON.stringify(recentResearch, null, 2)}

已有科研 idea：
${JSON.stringify(recentIdeas, null, 2)}

请用中文回答，务必具体、可执行，不要泛泛鼓励。如果信息不足，请明确列出还需要我补充的关键数据。`;
}

async function askAiForIdeaAdvice() {
  await runAiRequest({
    prompt: buildIdeaAdvicePrompt(),
    outputSelector: "#ideaAiSuggestion",
    statusSelector: "#ideaAiStatus",
    systemPrompt: "你是一个严谨、务实、擅长把科研想法落到实验和论文路径的研究合作者。",
    emptyKeyMessage: "请先到“设置 → AI 配置”里填 OpenAI API Key，或者点“复制提示词”去 ChatGPT 网页端使用。"
  });
}

async function runAiRequest({ prompt, outputSelector, statusSelector, systemPrompt, emptyKeyMessage }) {
  aiSettings = {
    baseUrl: $("#aiBaseUrl").value.trim() || defaultAiSettings.baseUrl,
    model: $("#aiModel").value.trim() || defaultAiSettings.model,
    apiKey: $("#aiApiKey").value.trim(),
    focus: $("#aiFocus").value || aiSettings.focus || "conversation"
  };
  saveAiSettings();

  if (!aiSettings.apiKey) {
    $(outputSelector).value = emptyKeyMessage;
    return;
  }

  $(statusSelector).textContent = "生成中";
  $(statusSelector).dataset.tone = "pending";
  $(outputSelector).value = "正在生成建议...";

  try {
    const response = await fetch(`${aiSettings.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiSettings.apiKey}`
      },
      body: JSON.stringify({
        model: aiSettings.model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      let errorDetail = "";
      try {
        const errorBody = await response.json();
        errorDetail = errorBody.error?.message || "";
      } catch {
        errorDetail = await response.text().catch(() => "");
      }
      const error = new Error(errorDetail || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    $(outputSelector).value = content || "AI 返回了结果，但没有找到正文。";
    $(statusSelector).textContent = "已生成";
    $(statusSelector).dataset.tone = "online";
  } catch (error) {
    $(statusSelector).textContent = "失败";
    $(statusSelector).dataset.tone = "error";
    if (error.status === 429) {
      $(outputSelector).value = `请求失败：HTTP 429\n\n这通常不是 API Key 没填，而是 OpenAI 账号当前额度、账单、项目限额或请求频率不够。\n\n你可以这样检查：\n1. 打开 https://platform.openai.com/settings/organization/billing\n2. 确认 API 账号已经开通计费或有可用额度\n3. 打开 https://platform.openai.com/settings/organization/limits\n4. 看当前项目/模型是否还有可用限额\n5. 等 1 分钟后再试一次\n\n临时替代：点“复制提示词”，粘贴到 ChatGPT 网页版继续用。\n\nOpenAI 返回信息：${error.message}`;
      return;
    }
    $(outputSelector).value = `请求失败：${error.message}\n\n可能是浏览器跨域限制、API Key 错误、额度不足，或接口地址变化。你可以点“复制提示词”，粘贴到 ChatGPT 网页版继续用。`;
  }
}

function bindCloudControls() {
  if ($("#cloudConfigForm")) {
    $("#supabaseUrl").value = cloudConfig.url || "";
    $("#supabaseKey").value = cloudConfig.key || "";

    $("#cloudConfigForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      cloudConfig = {
        url: normalizeSupabaseUrl($("#supabaseUrl").value),
        key: $("#supabaseKey").value.trim()
      };
      $("#supabaseUrl").value = cloudConfig.url;
      saveCloudConfig();
      await setupCloud();
    });
  }

  $("#authForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await signIn();
  });

  $("#signUpBtn").addEventListener("click", signUp);
  $("#signOutBtn").addEventListener("click", signOut);
  $("#syncBtn").addEventListener("click", () => syncNow({ forceMessage: true }));
}

function setCloudMessage(message) {
  $("#cloudMessage").textContent = message;
}

function setSyncStatus(textValue, tone = "local") {
  const status = $("#syncStatus");
  status.textContent = textValue;
  status.dataset.tone = tone;
}

async function setupCloud() {
  if (!cloudConfig.url || !cloudConfig.key) {
    supabaseClient = null;
    currentUser = null;
    setSyncStatus("本地模式", "local");
    setCloudMessage("想跨设备同步时，先打开下面的高级设置接一次云数据库；之后只记邮箱和密码。");
    return;
  }

  if (!window.supabase) {
    setSyncStatus("缺少 SDK", "error");
    setCloudMessage("现在还连不上云同步组件。部署到 GitHub Pages 后通常会自动加载；本地离线时可能不可用。");
    return;
  }

  supabaseClient = window.supabase.createClient(cloudConfig.url, cloudConfig.key);
  const { data } = await supabaseClient.auth.getUser();
  currentUser = data.user || null;
  updateAuthStatus();

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    updateAuthStatus();
    if (currentUser) syncNow();
  });
}

function updateAuthStatus() {
  if (!supabaseClient) {
    setSyncStatus("本地模式", "local");
    return;
  }

  if (currentUser) {
    setSyncStatus("已登录", "online");
    setCloudMessage(`当前账号：${currentUser.email}`);
  } else {
    setSyncStatus("未登录", "pending");
    setCloudMessage("云数据库已接好。现在用邮箱和密码注册/登录，就能跨设备同步。");
  }
}

async function signIn() {
  if (!supabaseClient) {
    setCloudMessage("还没接云数据库。请打开高级设置，先保存 Project URL 和 anon public key。");
    return;
  }
  const email = $("#authEmail").value.trim();
  const password = $("#authPassword").value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    setCloudMessage(`登录失败：${error.message}`);
    return;
  }
  setCloudMessage("登录成功，正在同步。");
  await syncNow();
}

async function signUp() {
  if (!supabaseClient) {
    setCloudMessage("还没接云数据库。请打开高级设置，先保存 Project URL 和 anon public key。");
    return;
  }
  const email = $("#authEmail").value.trim();
  const password = $("#authPassword").value;
  const { error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    setCloudMessage(`注册失败：${error.message}`);
    return;
  }
  setCloudMessage("注册成功。若 Supabase 要求邮箱验证，请先去邮箱确认。");
}

async function signOut() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  currentUser = null;
  updateAuthStatus();
}

function queueSync() {
  if (!currentUser || !supabaseClient) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncNow(), 600);
}

function flattenState() {
  return COLLECTIONS.flatMap((collection) =>
    state[collection].map((item) => ({
      id: item.id,
      user_id: currentUser.id,
      collection,
      data: item,
      updated_at: item.updatedAt || item.createdAt
    }))
  );
}

function titleSettingsRow() {
  return {
    id: `settings:${currentUser.id}`,
    user_id: currentUser.id,
    collection: "settings",
    data: {
      titleSettings,
      titleSettingsUpdatedAt,
      themeSettings,
      themeSettingsUpdatedAt,
      updatedAt: [titleSettingsUpdatedAt, themeSettingsUpdatedAt].sort().at(-1)
    },
    updated_at: [titleSettingsUpdatedAt, themeSettingsUpdatedAt].sort().at(-1)
  };
}

function mergeRemoteRows(rows) {
  const merged = normalizeState(state);

  rows.forEach((row) => {
    if (row.collection === "settings") {
      const remoteTitleUpdatedAt = row.data?.titleSettingsUpdatedAt || row.data?.updatedAt || row.updated_at;
      const remoteTitleTime = new Date(remoteTitleUpdatedAt || 0).getTime();
      const localTitleTime = new Date(titleSettingsUpdatedAt || 0).getTime();

      if (row.data?.titleSettings && remoteTitleTime > localTitleTime) {
        titleSettings = { ...defaultTitles, ...row.data.titleSettings };
        titleSettingsUpdatedAt = remoteTitleUpdatedAt;
        localStorage.setItem(TITLE_SETTINGS_UPDATED_KEY, titleSettingsUpdatedAt);
        saveTitleSettings({ touch: false, sync: false });
      }

      const remoteThemeUpdatedAt = row.data?.themeSettingsUpdatedAt || row.data?.updatedAt || row.updated_at;
      const remoteThemeTime = new Date(remoteThemeUpdatedAt || 0).getTime();
      const localThemeTime = new Date(themeSettingsUpdatedAt || 0).getTime();

      if (row.data?.themeSettings && remoteThemeTime > localThemeTime) {
        themeSettings = { ...defaultTheme, ...row.data.themeSettings };
        themeSettingsUpdatedAt = remoteThemeUpdatedAt;
        localStorage.setItem(THEME_SETTINGS_UPDATED_KEY, themeSettingsUpdatedAt);
        saveThemeSettings({ touch: false, sync: false });
      }
      return;
    }

    const collection = row.collection;
    if (!COLLECTIONS.includes(collection)) return;

    const remoteRecord = {
      ...row.data,
      id: row.id,
      updatedAt: row.data?.updatedAt || row.updated_at
    };
    const index = merged[collection].findIndex((item) => item.id === row.id);

    if (index === -1) {
      merged[collection].push(remoteRecord);
      return;
    }

    const localTime = new Date(merged[collection][index].updatedAt || 0).getTime();
    const remoteTime = new Date(remoteRecord.updatedAt || 0).getTime();
    if (remoteTime > localTime) {
      merged[collection][index] = remoteRecord;
    }
  });

  COLLECTIONS.forEach((collection) => {
    merged[collection].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  });

  state = merged;
  saveState({ sync: false });
}

async function syncNow(options = {}) {
  if (!currentUser || !supabaseClient) {
    if (options.forceMessage) setCloudMessage("请先接好云数据库，然后用邮箱和密码登录。");
    return;
  }

  setSyncStatus("同步中", "pending");
  const rows = flattenState();
  const payload = [...rows, titleSettingsRow()];
  if (payload.length) {
    const { error: upsertError } = await supabaseClient.from("planner_records").upsert(payload);
    if (upsertError) {
      setSyncStatus("同步失败", "error");
      setCloudMessage(`上传失败：${upsertError.message}`);
      return;
    }
  }

  const { data, error: fetchError } = await supabaseClient
    .from("planner_records")
    .select("id, collection, data, updated_at")
    .order("updated_at", { ascending: false });

  if (fetchError) {
    setSyncStatus("同步失败", "error");
    setCloudMessage(`拉取失败：${fetchError.message}`);
    return;
  }

  mergeRemoteRows(data || []);
  setSyncStatus("已同步", "online");
  setCloudMessage(`已同步 ${data?.length || 0} 条云端记录。`);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
}

bindNavigation();
bindForms();
bindDataControls();
bindTitleSettings();
bindThemeSettings();
bindAiControls();
bindCloudControls();
render();
applyTitles();
applyTheme();
applyAiSettings();
setupCloud();
registerServiceWorker();
