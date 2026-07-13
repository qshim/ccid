/**
 * cciD Lab Ops — Apps Script bridge (row store + auto-generated views).
 * (SAFE TO COMMIT: no secrets — keep your existing SECRET line.)
 *
 * 설치
 * 1. hello.ccid@gmail.com 으로 새 스프레드시트 생성 (권장) — 또는 기존 시트 사용.
 * 2. 확장 프로그램 → Apps Script → 이 파일 전체 붙여넣기.
 *    맨 위에 `var SECRET = "충분히 긴 무작위 문자열";` 한 줄 추가.
 * 3. 배포 → 새 배포 → 웹 앱 (실행: 나, 액세스: 모든 사용자) → /exec URL 복사.
 * 4. .env.local: SHEETS_BRIDGE_URL=<그 URL>, SHEETS_BRIDGE_SECRET=<그 SECRET>,
 *    LAB_DATA_BACKEND=sheets
 *
 * 탭 구성 (자동 생성·관리)
 *   People        ← 항상 맨 왼쪽. 연구원별 참여 현황 — 프로젝트 태그가 프로젝트
 *                   컬러로 색칠되고, 참여 중이면 OCCUPIED 로 표시. (자동 생성 뷰)
 *   <프로젝트별 탭> ← 프로젝트마다 하나. 탭 색 = 프로젝트 컬러. 개요·멤버·일정.
 *                   (자동 생성 뷰 — 편집은 /lab 에서)
 *   ops_projects / ops_events / ops_activity ← 원본 행 데이터 (직접 편집 가능)
 *   ops_settings  ← 앱 전용 (숨김)
 *
 * 원본(ops_*)을 사람이 고치면 /lab 새로고침에 반영되고, /lab 에서 저장하면
 * 바뀐 행만 갱신된 뒤 People·프로젝트 뷰가 다시 그려진다.
 */

// var SECRET = "<여기에 시크릿>";  // ← 기존 값 유지 또는 새로 생성

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.secret !== SECRET) {
      return json_({ ok: false, error: "unauthorized" });
    }

    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var action = body.action || "write";

    // --- READ a single cell (콘텐츠 시트용 기존 기능) ---
    if (action === "read") {
      var rs = doc.getSheetByName(body.sheet);
      if (!rs) return json_({ ok: false, error: "no sheet: " + body.sheet });
      return json_({
        ok: true, sheet: body.sheet, a1: body.a1,
        value: rs.getRange(body.a1).getDisplayValue(),
      });
    }

    // --- OPS: read everything the lab app needs ---
    if (action === "opsGetAll") {
      return json_({
        ok: true,
        projects: readRows_(doc, "ops_projects"),
        events: readRows_(doc, "ops_events"),
        activity: readRows_(doc, "ops_activity", 200),
        settings: readSetting_(doc, "settings"),
        people: readRows_(doc, "ops_people"), // id, name, email (비공개 — 캘린더 초대용)
      });
    }

    // --- OPS: apply row edits from /lab, then rebuild the view tabs ---
    if (action === "opsApply") {
      var lock = LockService.getScriptLock();
      lock.waitLock(20000);
      try {
        var results = [];
        var opsList = body.ops || [];
        for (var i = 0; i < opsList.length; i++) results.push(applyOp_(doc, opsList[i]));
        try { rebuildViews_(doc, body.roster || []); } catch (ve) { results.push({ view: String(ve) }); }
        return json_({ ok: true, results: results });
      } finally {
        lock.releaseLock();
      }
    }

    // --- OPS: rebuild views on demand (시트를 손으로 고친 뒤 정리용) ---
    if (action === "opsRebuildViews") {
      rebuildViews_(doc, body.roster || []);
      return json_({ ok: true });
    }

    // --- WRITE one or many cells (기존 기능 유지) ---
    var edits = body.edits || [{ sheet: body.sheet, a1: body.a1, value: body.value }];
    var results2 = [];
    for (var j = 0; j < edits.length; j++) {
      var ed = edits[j];
      var sh = doc.getSheetByName(ed.sheet);
      if (!sh) { results2.push({ sheet: ed.sheet, a1: ed.a1, ok: false, error: "no sheet" }); continue; }
      var rng = sh.getRange(ed.a1);
      var before = rng.getDisplayValue();
      rng.setValue(ed.value);
      results2.push({ sheet: ed.sheet, a1: ed.a1, ok: true, before: before, after: ed.value });
    }
    return json_({ ok: true, results: results2 });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// ---------- row-store helpers ----------

function ensureSheet_(doc, name, cols) {
  var sh = doc.getSheetByName(name);
  if (!sh) {
    sh = doc.insertSheet(name);
    if (name === "ops_settings") sh.hideSheet();
  }
  if (cols && cols.length) {
    var existing = sh.getLastColumn() > 0
      ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String) : [];
    if (existing.join("") !== cols.join("")) {
      // Schema changed (a column was added/removed/reordered in the app).
      // Re-map every existing data row BY COLUMN NAME to the new layout —
      // never just overwrite the header, which would silently misalign every
      // row already on the sheet under the new column names (data corruption:
      // e.g. an old "createdAt" cell reading as the new "deletedAt" column).
      var lastRow = sh.getLastRow();
      if (lastRow >= 2 && existing.length > 0) {
        var numRows = lastRow - 1;
        var oldValues = sh.getRange(2, 1, numRows, existing.length).getValues();
        var newValues = oldValues.map(function (oldRow) {
          var obj = {};
          for (var i = 0; i < existing.length; i++) obj[existing[i]] = oldRow[i];
          return cols.map(function (c) {
            return Object.prototype.hasOwnProperty.call(obj, c) ? obj[c] : "";
          });
        });
        sh.getRange(1, 1, 1, cols.length).setValues([cols]);
        if (existing.length > cols.length) {
          sh.getRange(1, cols.length + 1, Math.max(sh.getMaxRows(), lastRow), existing.length - cols.length)
            .clearContent();
        }
        sh.getRange(2, 1, numRows, cols.length).setValues(newValues);
      } else {
        sh.getRange(1, 1, 1, cols.length).setValues([cols]);
      }
      sh.setFrozenRows(1);
    }
  }
  return sh;
}

function headers_(sh) {
  if (sh.getLastColumn() === 0) return [];
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

function toIso_(v) {
  if (v instanceof Date) return v.toISOString();
  return v == null ? "" : String(v);
}

function readRows_(doc, name, lastN) {
  var sh = doc.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  var heads = headers_(sh);
  var startRow = 2, numRows = sh.getLastRow() - 1;
  if (lastN && numRows > lastN) { startRow = sh.getLastRow() - lastN + 1; numRows = lastN; }
  var values = sh.getRange(startRow, 1, numRows, heads.length).getValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var obj = {};
    for (var c = 0; c < heads.length; c++) obj[heads[c]] = toIso_(values[i][c]);
    if (obj.id) out.push(obj);
  }
  return out;
}

function findRowById_(sh, id) {
  var heads = headers_(sh);
  var idCol = heads.indexOf("id") + 1;
  if (idCol === 0 || sh.getLastRow() < 2) return -1;
  var ids = sh.getRange(2, idCol, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function rowArray_(heads, rowObj) {
  var arr = [];
  for (var i = 0; i < heads.length; i++) {
    var v = rowObj[heads[i]];
    arr.push(v == null ? "" : v);
  }
  return arr;
}

function applyOp_(doc, op) {
  if (op.op === "append") {
    var sh = ensureSheet_(doc, op.sheet, op.cols);
    sh.appendRow(rowArray_(headers_(sh), op.row || {}));
    return { op: "append", sheet: op.sheet, ok: true };
  }
  if (op.op === "updateById") {
    var sh2 = ensureSheet_(doc, op.sheet, op.cols);
    var rowIdx = findRowById_(sh2, op.id);
    if (rowIdx === -1) {
      sh2.appendRow(rowArray_(headers_(sh2), op.row || {}));
      return { op: "updateById", sheet: op.sheet, id: op.id, ok: true, recreated: true };
    }
    var heads2 = headers_(sh2);
    sh2.getRange(rowIdx, 1, 1, heads2.length).setValues([rowArray_(heads2, op.row || {})]);
    return { op: "updateById", sheet: op.sheet, id: op.id, ok: true };
  }
  if (op.op === "deleteById") {
    var sh3 = doc.getSheetByName(op.sheet);
    if (!sh3) return { op: "deleteById", ok: true, missing: true };
    var rowIdx3 = findRowById_(sh3, op.id);
    if (rowIdx3 !== -1) sh3.deleteRow(rowIdx3);
    return { op: "deleteById", sheet: op.sheet, id: op.id, ok: true };
  }
  if (op.op === "putSetting") {
    var sh4 = ensureSheet_(doc, "ops_settings", ["key", "value"]);
    var idx = findSettingRow_(sh4, op.key);
    if (idx === -1) sh4.appendRow([op.key, op.value]);
    else sh4.getRange(idx, 2).setValue(op.value);
    return { op: "putSetting", key: op.key, ok: true };
  }
  return { op: op.op, ok: false, error: "unknown op" };
}

function findSettingRow_(sh, key) {
  if (sh.getLastRow() < 2) return -1;
  var keys = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < keys.length; i++) if (String(keys[i][0]) === String(key)) return i + 2;
  return -1;
}

function readSetting_(doc, key) {
  var sh = doc.getSheetByName("ops_settings");
  if (!sh) return "";
  var idx = findSettingRow_(sh, key);
  return idx === -1 ? "" : String(sh.getRange(idx, 2).getValue() || "");
}

// ---------- generated views: People (leftmost) + one tab per project ----------

var IVORY = "#f0f0ec";
var INK = "#0f0f13";

function decodeMembersCell_(cell) {
  // "yeju-chung: UX; heeyun-sul: Proto" -> [{id, role}]
  var out = [];
  var parts = String(cell || "").split(";");
  for (var i = 0; i < parts.length; i++) {
    var s = parts[i].trim();
    if (!s) continue;
    var idx = s.indexOf(":");
    if (idx === -1) out.push({ id: s, role: "" });
    else out.push({ id: s.slice(0, idx).trim(), role: s.slice(idx + 1).trim() });
  }
  return out;
}

function kstDate_(iso, withTime) {
  if (!iso) return "";
  try {
    var d = new Date(iso);
    return Utilities.formatDate(d, "Asia/Seoul", withTime ? "M/d HH:mm" : "yyyy-MM-dd");
  } catch (e) { return String(iso); }
}

function viewTabName_(p) {
  var base = String(p.shortName || p.title || p.id).replace(/[\[\]\*\/\\\?:]/g, " ").trim();
  return base.slice(0, 28) || p.id;
}

function rebuildViews_(doc, roster) {
  // roster: [{id, name, category, active}] — 앱이 매 호출에 전달 (콘텐츠 시트 비의존)
  var projects = readRows_(doc, "ops_projects").filter(function (p) {
    return p.id && !p.deletedAt && p.status !== "archived";
  });
  var events = readRows_(doc, "ops_events");

  // ---- per-project tabs ----
  var keepNames = { "People": true, "ops_projects": true, "ops_events": true, "ops_activity": true, "ops_settings": true };
  var prevView = {};
  try { prevView = JSON.parse(readSetting_(doc, "viewTabs") || "{}"); } catch (e) {}
  var newView = {};

  var rosterById = {};
  for (var r = 0; r < roster.length; r++) rosterById[roster[r].id] = roster[r];
  var nameOf = function (id) { return (rosterById[id] && rosterById[id].name) || id; };

  for (var i = 0; i < projects.length; i++) {
    var p = projects[i];
    var tab = viewTabName_(p);
    newView[p.id] = tab;
    keepNames[tab] = true;
    var sh = doc.getSheetByName(tab) || doc.insertSheet(tab);
    sh.clear();
    try { sh.setTabColor(p.color || "#4E22D6"); } catch (e) {}

    var rows = [];
    rows.push([p.title || "", "", "", ""]);
    rows.push([p.titleEn || "", "", "", ""]);
    rows.push(["상태", p.status || "", "기간", (p.startDate || "") + (p.endDate ? " → " + p.endDate : "")]);
    rows.push(["진행률", (p.progress || "0") + "%", "파트너", p.clientOrPartner || ""]);
    rows.push(["설명", p.description || "", "", ""]);
    rows.push(["메모", p.notes || "", "", ""]);
    rows.push(["", "", "", ""]);
    rows.push(["MEMBERS", "", "", ""]);
    var mems = decodeMembersCell_(p.members);
    if (p.projectLead) rows.push(["Lead", nameOf(p.projectLead), "", ""]);
    // 역할(트랙)별 그룹
    var byRole = {};
    for (var m = 0; m < mems.length; m++) {
      var role = mems[m].role || "Member";
      (byRole[role] = byRole[role] || []).push(nameOf(mems[m].id));
    }
    for (var roleKey in byRole) rows.push([roleKey, byRole[roleKey].join(", "), "", ""]);
    rows.push(["", "", "", ""]);
    rows.push(["SCHEDULE", "", "", ""]);
    rows.push(["일정", "유형", "시작 (KST)", "종료 / Meet"]);
    var evs = [];
    for (var ei = 0; ei < events.length; ei++) if (events[ei].projectId === p.id) evs.push(events[ei]);
    evs.sort(function (a, b) { return String(a.start).localeCompare(String(b.start)); });
    for (var e2 = 0; e2 < evs.length; e2++) {
      var ev = evs[e2];
      rows.push([ev.title, ev.eventType, kstDate_(ev.start, true),
        (ev.end ? kstDate_(ev.end, true) : "") + (ev.googleMeetUrl ? "  " + ev.googleMeetUrl : "")]);
    }
    rows.push(["", "", "", ""]);
    rows.push(["COMMUNICATION", "", "", ""]);
    rows.push(["", p.commLog || "(기록 없음)", "", ""]);
    sh.getRange(1, 1, rows.length, 4).setValues(rows);
    // styling: 제목 크게, 섹션 헤더 볼드, 헤더 행 컬러
    sh.getRange(1, 1).setFontSize(14).setFontWeight("bold").setFontColor(p.color || INK);
    sh.getRange(8, 1).setFontWeight("bold");
    sh.getRange(8 + 0, 1, 1, 4).setBackground(IVORY);
    var schedHeader = 8 + 1 + (p.projectLead ? 1 : 0) + Object.keys(byRole).length + 2;
    sh.getRange(schedHeader, 1, 1, 4).setBackground(IVORY).setFontWeight("bold");
    sh.getRange(schedHeader + 1, 1, 1, 4).setFontColor("#888888");
    sh.setColumnWidths(1, 1, 160);
    sh.setColumnWidths(2, 1, 260);
    sh.setColumnWidths(3, 2, 170);
  }

  // 사라진 프로젝트의 옛 뷰 탭 정리
  for (var pid in prevView) {
    var oldTab = prevView[pid];
    if (!keepNames[oldTab]) {
      var stale = doc.getSheetByName(oldTab);
      if (stale) doc.deleteSheet(stale);
    }
  }
  applyOp_(doc, { op: "putSetting", key: "viewTabs", value: JSON.stringify(newView) });

  // ---- People tab (leftmost) ----
  var ppl = doc.getSheetByName("People") || doc.insertSheet("People", 0);
  ppl.clear();
  // 헤더: 이름 | 구분 | 상태 | 프로젝트 수 | <프로젝트별 열>
  var header = ["이름", "구분", "상태", "참여"];
  for (var pi = 0; pi < projects.length; pi++) header.push(viewTabName_(projects[pi]));
  var memMap = {}; // researcherId -> { projectId: role }
  for (var pj = 0; pj < projects.length; pj++) {
    var ms = decodeMembersCell_(projects[pj].members);
    for (var mi = 0; mi < ms.length; mi++) {
      (memMap[ms[mi].id] = memMap[ms[mi].id] || {})[projects[pj].id] = ms[mi].role || "●";
    }
    if (projects[pj].projectLead) {
      (memMap[projects[pj].projectLead] = memMap[projects[pj].projectLead] || {})[projects[pj].id] = "Lead";
    }
  }
  var bodyRows = [];
  var colorPlan = []; // {row, col, color}
  var rosterSorted = roster.slice();
  for (var ri = 0; ri < rosterSorted.length; ri++) {
    var person = rosterSorted[ri];
    var mine = memMap[person.id] || {};
    var count = Object.keys(mine).length;
    var row = [person.name, person.category || "", count > 0 ? "OCCUPIED" : "", count > 0 ? count : ""];
    for (var ci = 0; ci < projects.length; ci++) {
      var role2 = mine[projects[ci].id] || "";
      row.push(role2);
      if (role2) colorPlan.push({ row: bodyRows.length + 2, col: 5 + ci, color: projects[ci].color || "#4E22D6" });
    }
    bodyRows.push(row);
  }
  ppl.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight("bold").setBackground(IVORY);
  if (bodyRows.length) ppl.getRange(2, 1, bodyRows.length, header.length).setValues(bodyRows);
  // 프로젝트 헤더 셀 + 참여 셀 컬러 코딩 (흰 글자 태그)
  for (var hc = 0; hc < projects.length; hc++) {
    ppl.getRange(1, 5 + hc).setBackground(projects[hc].color || "#4E22D6").setFontColor("#ffffff");
  }
  for (var cp = 0; cp < colorPlan.length; cp++) {
    ppl.getRange(colorPlan[cp].row, colorPlan[cp].col)
      .setBackground(colorPlan[cp].color).setFontColor("#ffffff").setHorizontalAlignment("center");
  }
  // OCCUPIED 열 강조
  if (bodyRows.length) {
    var occ = ppl.getRange(2, 3, bodyRows.length, 1);
    occ.setFontColor("#5D009C").setFontWeight("bold");
  }
  ppl.setFrozenRows(1);
  ppl.setFrozenColumns(1);
  ppl.setColumnWidths(1, 1, 150);
  ppl.setColumnWidths(2, 3, 90);
  if (projects.length) ppl.setColumnWidths(5, projects.length, 110);
  // 맨 왼쪽으로 이동
  doc.setActiveSheet(ppl);
  doc.moveActiveSheet(1);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
