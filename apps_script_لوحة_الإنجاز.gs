/*
  Google Apps Script لمنصة فرسان ابن الوليد
  - حفظ نتائج الاختبارات في ورقة Results
  - إدارة الطلاب في ورقة Students
  - عرض لوحة الإنجاز عبر leaderboard.html

  بعد تحديث هذا الكود في Apps Script يجب عمل:
  نشر > إدارة عمليات النشر > تعديل > إصدار جديد > نشر
*/

const SHEET_NAME = 'Results';
const STUDENTS_SHEET_NAME = 'Students';
const SPREADSHEET_ID = '';
const ADMIN_CODE = 'Rayan9892026@@@';

function ss_() {
  return SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

function ensureSheet_(name, headers) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.appendRow(headers);
  return sh;
}

function sheet_() {
  return ensureSheet_(SHEET_NAME, ['timestamp', 'student', 'grade', 'section', 'subject', 'correct', 'total', 'percent', 'level', 'platform']);
}

function studentsSheet_() {
  return ensureSheet_(STUDENTS_SHEET_NAME, ['id', 'grade', 'section', 'student', 'codeHash', 'status', 'updatedAt']);
}

function output_(obj, callback) {
  const json = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + json + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function sha256Hex_(text) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8);
  return bytes.map(function (b) {
    const v = b < 0 ? b + 256 : b;
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

function requireAdmin_(p) {
  if (String(p.adminCode || '') !== ADMIN_CODE) throw new Error('رمز دخول المسؤول غير صحيح.');
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    const action = p.action || 'submit';

    if (action === 'submit') return submitResult_(p);
    if (action === 'addStudent') { requireAdmin_(p); return addStudent_(p); }
    if (action === 'updateStudent') { requireAdmin_(p); return updateStudent_(p); }
    if (action === 'disableStudent') { requireAdmin_(p); return disableStudent_(p); }
    if (action === 'syncStudents') { requireAdmin_(p); return syncStudents_(p); }

    return output_({ ok: false, error: 'إجراء غير معروف: ' + action });
  } catch (err) {
    return output_({ ok: false, error: String(err) });
  }
}

function submitResult_(p) {
  const sh = sheet_();
  sh.appendRow([
    new Date(),
    p.student || '',
    p.grade || '',
    p.section || '',
    p.subject || '',
    Number(p.correct || 0),
    Number(p.total || 0),
    Number(p.percent || 0),
    p.level || '',
    p.platform || 'فرسان ابن الوليد'
  ]);
  return output_({ ok: true });
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  const callback = p.callback || '';
  try {
    if (p.action === 'leaderboard') {
      return output_({ ok: true, rows: buildLeaderboard_(), updatedAt: new Date() }, callback);
    }
    if (p.action === 'students') {
      return output_({ ok: true, students: buildStudentsObject_(false), updatedAt: new Date() }, callback);
    }
    if (p.action === 'studentsAdmin') {
      requireAdmin_(p);
      return output_({ ok: true, rows: getStudentsRows_(true), updatedAt: new Date() }, callback);
    }
    return output_({ ok: true, message: 'Forsaan Ibn Alwaleed API is running.' }, callback);
  } catch (err) {
    return output_({ ok: false, error: String(err) }, callback);
  }
}

function getStudentsRows_(includeInactive) {
  const sh = studentsSheet_();
  const values = sh.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0].map(String);
  const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
  return values.slice(1).map(function (row) {
    return {
      id: String(row[idx.id] || ''),
      grade: String(row[idx.grade] || ''),
      section: String(row[idx.section] || ''),
      name: String(row[idx.student] || ''),
      codeHash: String(row[idx.codeHash] || ''),
      status: String(row[idx.status] || 'نشط'),
      updatedAt: row[idx.updatedAt] || ''
    };
  }).filter(function (r) {
    return r.name && (includeInactive || r.status !== 'معطل');
  }).sort(function (a, b) {
    return (a.grade + a.section + a.name).localeCompare(b.grade + b.section + b.name, 'ar');
  });
}

function buildStudentsObject_(includeInactive) {
  const obj = {};
  getStudentsRows_(includeInactive).forEach(function (r) {
    if (r.status === 'معطل' && !includeInactive) return;
    if (!obj[r.grade]) obj[r.grade] = {};
    if (!obj[r.grade][r.section]) obj[r.grade][r.section] = [];
    obj[r.grade][r.section].push({ name: r.name, codeHash: r.codeHash });
  });
  return obj;
}

function findStudentRowById_(id) {
  const sh = studentsSheet_();
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) return i + 1;
  }
  return -1;
}

function findStudentRowByIdentity_(grade, section, student) {
  const sh = studentsSheet_();
  const values = sh.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][1]) === String(grade) && String(values[i][2]) === String(section) && String(values[i][3]) === String(student)) return i + 1;
  }
  return -1;
}

function addStudent_(p) {
  const grade = String(p.grade || '').trim();
  const section = String(p.section || '').trim();
  const student = String(p.student || '').trim();
  const code = String(p.code || '').trim();
  if (!grade || !section || !student || !code) throw new Error('أكمل الصف والفصل واسم الطالب ورمز الدخول.');

  const sh = studentsSheet_();
  const existingRow = findStudentRowByIdentity_(grade, section, student);
  const codeHash = sha256Hex_(code);
  if (existingRow > 0) {
    sh.getRange(existingRow, 2, 1, 6).setValues([[grade, section, student, codeHash, 'نشط', new Date()]]);
    return output_({ ok: true, updated: true });
  }
  sh.appendRow([Utilities.getUuid(), grade, section, student, codeHash, 'نشط', new Date()]);
  return output_({ ok: true, added: true });
}

function updateStudent_(p) {
  const id = String(p.id || '').trim();
  const grade = String(p.grade || '').trim();
  const section = String(p.section || '').trim();
  const student = String(p.student || '').trim();
  const code = String(p.code || '').trim();
  if (!id) throw new Error('معرف الطالب مفقود.');
  if (!grade || !section || !student) throw new Error('أكمل الصف والفصل واسم الطالب.');

  const sh = studentsSheet_();
  const row = findStudentRowById_(id);
  if (row < 0) throw new Error('لم يتم العثور على الطالب.');
  const oldHash = String(sh.getRange(row, 5).getValue() || '');
  const codeHash = code ? sha256Hex_(code) : oldHash;
  sh.getRange(row, 2, 1, 6).setValues([[grade, section, student, codeHash, 'نشط', new Date()]]);
  return output_({ ok: true, updated: true });
}

function disableStudent_(p) {
  const id = String(p.id || '').trim();
  if (!id) throw new Error('معرف الطالب مفقود.');
  const sh = studentsSheet_();
  const row = findStudentRowById_(id);
  if (row < 0) throw new Error('لم يتم العثور على الطالب.');
  sh.getRange(row, 6, 1, 2).setValues([['معطل', new Date()]]);
  return output_({ ok: true, disabled: true });
}

function syncStudents_(p) {
  const raw = String(p.students || '[]');
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows)) throw new Error('صيغة الطلاب غير صحيحة.');
  const sh = studentsSheet_();
  let count = 0;
  rows.forEach(function (r) {
    const grade = String(r.grade || '').trim();
    const section = String(r.section || '').trim();
    const student = String(r.name || r.student || '').trim();
    const codeHash = String(r.codeHash || '').trim();
    if (!grade || !section || !student || !codeHash) return;
    const existingRow = findStudentRowByIdentity_(grade, section, student);
    if (existingRow > 0) {
      sh.getRange(existingRow, 2, 1, 6).setValues([[grade, section, student, codeHash, 'نشط', new Date()]]);
    } else {
      sh.appendRow([Utilities.getUuid(), grade, section, student, codeHash, 'نشط', new Date()]);
    }
    count++;
  });
  return output_({ ok: true, synced: count });
}

function buildLeaderboard_() {
  const sh = sheet_();
  const values = sh.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0].map(String);
  const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
  const map = {};
  values.slice(1).forEach(row => {
    const student = String(row[idx.student] || '').trim();
    if (!student) return;
    const grade = String(row[idx.grade] || '').trim();
    const section = String(row[idx.section] || '').trim();
    const key = [grade, section, student].join('||');
    if (!map[key]) {
      map[key] = { student, grade, section, totalCorrect: 0, attempts: 0, lastDate: '', subjects: {} };
    }
    const correct = Number(row[idx.correct] || 0);
    const subject = String(row[idx.subject] || '').trim() || 'غير محدد';
    map[key].totalCorrect += correct;
    map[key].attempts += 1;
    map[key].subjects[subject] = (map[key].subjects[subject] || 0) + correct;
    map[key].lastDate = row[idx.timestamp] || '';
  });
  return Object.values(map).sort((a, b) => b.totalCorrect - a.totalCorrect);
}
