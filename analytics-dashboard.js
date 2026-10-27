const status = document.querySelector("#status");
const days = document.querySelector("#days");
const refresh = document.querySelector("#refresh");
const sum = (rows, event) => rows.filter(row => row.event === event).reduce((total, row) => total + row.count, 0);
function table(id, rows) {
  document.querySelector(id).replaceChildren(...rows.map(values => {
    const tr = document.createElement("tr");
    for (const value of values) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.append(td);
    }
    return tr;
  }));
}
async function load() {
  refresh.disabled = true;
  days.disabled = true;
  status.textContent = "正在读取统计…";
  try {
    const response = await fetch(`/api/analytics?days=${days.value}`, { cache: "no-store" });
    if (!response.ok) throw new Error(response.status === 403 ? "请使用站点所有者账号登录后查看。" : "统计暂时不可用，请稍后重试。");
    const { rows } = await response.json();
    const views = sum(rows, "page_view");
    const downloads = sum(rows, "download_click");
    document.querySelector("#metrics").replaceChildren(...[
      ["访问次数", views], ["前往下载页", downloads],
      ["下载入口点击率", views ? `${(downloads / views * 100).toFixed(1)}%` : "—"],
      ["打开反馈", sum(rows, "feedback_click")]
    ].map(([label, value]) => {
      const card = document.createElement("div"); card.className = "metric";
      const heading = document.createElement("span"); heading.textContent = label;
      const number = document.createElement("strong"); number.textContent = value;
      card.append(heading, number); return card;
    }));
    const dates = Array.from({ length: Number(days.value) }, (_, i) => new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
    table("#daily", dates.map(day => {
      const records = rows.filter(row => row.day === day);
      return [day, ...["page_view", "download_click", "source_click", "feedback_click"].map(event => sum(records, event))];
    }));
    table("#sources", [...new Set(rows.map(row => row.source))].map(source => {
      const records = rows.filter(row => row.source === source);
      return [source, sum(records, "page_view"), sum(records, "download_click")];
    }).sort((a, b) => b[1] - a[1]));
    table("#placements", [["页面顶部", "top"], ["页面底部", "bottom"]].map(([label, placement]) => [label, sum(rows.filter(row => row.placement === placement), "download_click")]));
    status.textContent = rows.length ? `已更新 · ${new Date().toLocaleTimeString()}` : "暂时没有数据。上线后的有效访问会从这里开始累计。";
  } catch (error) { status.textContent = error.message; }
  finally { refresh.disabled = false; days.disabled = false; }
}
days.addEventListener("change", load);
refresh.addEventListener("click", load);
void load();
