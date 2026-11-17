const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/Code.gs', 'utf8');
function setup(legacy = false) {
  const sheets = new Map();
  const ss = { getSheetByName: name => sheets.get(name), insertSheet(name) { const sheet = makeSheet(name); sheets.set(name, sheet); return sheet; } };
  function makeSheet(name) {
    const rows = [];
    return { rows, getLastRow: () => rows.length, setFrozenRows() {}, appendRow(row) { rows.push([...row]); },
      getRange(r, c, n = 1, m = 1) { return {
        getValues: () => Array.from({length: n}, (_, i) => Array.from({length: m}, (_, j) => rows[r+i-1]?.[c+j-1] ?? '')),
        setValues(values) { values.forEach((row,i) => { rows[r+i-1] ??= []; row.forEach((v,j) => rows[r+i-1][c+j-1] = v); }); }
      }; },
      copyTo() { const copy = makeSheet('copy'); rows.forEach(row => copy.rows.push([...row])); return copy; },
      setName(newName) { sheets.set(newName, this); return this; },
      deleteColumns(c, n) { rows.forEach(row => row.splice(c-1, n)); }
    };
  }
  let held = false;
  const context = vm.createContext({
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, flush() {} },
    LockService: { getScriptLock: () => ({ waitLock() { assert.equal(held,false); held=true; }, releaseLock() { held=false; } }) },
    Utilities: { formatDate: () => 'TEST_TIMESTAMP' },
    ContentService: { MimeType: {JSON:'json'}, createTextOutput: text => ({setMimeType: () => ({text})}) }
  });
  vm.runInContext(source, context);
  const oldHeaders = Array.from(vm.runInContext('LEGACY_REQUEST_HEADERS', context));
  const newHeaders = Array.from(vm.runInContext('REQUEST_HEADERS', context));
  if (legacy) ss.insertSheet('Requests').rows.push(oldHeaders);
  return {context, sheets, oldHeaders, newHeaders, ss, unlocked: () => !held};
}
const data = {record_type:'request',name:'Example',email:'example@example.com',company_name:'Example Co',role:'Other',offer_summary:'A service',commercial_focus:'Make my work clearer',linkedin_current_state:'Something else',specific_notes:'Profile not supplied — confirm by email\n\nReview my posts',source:'trust-audit-page'};
const runPost = (s, payload = data) => JSON.parse(s.context.doPost({parameter:payload}).text);
const s = setup(true);
assert.equal(runPost(s).status,'success');
assert.equal(s.sheets.get('Requests').rows[1].length,15);
const before = s.sheets.get('Requests').rows.map(row => [...row]);
assert.equal(s.context.migrateRequestsColumns().status,'migrated');
const active = s.sheets.get('Requests');
assert.deepEqual(active.rows[0],s.newHeaders);
assert.equal(active.rows.length,before.length);
assert.deepEqual(active.rows[1],[before[1][0],data.name,data.email,'',data.company_name,data.role,data.offer_summary,data.commercial_focus,data.linkedin_current_state,data.specific_notes,data.source]);
assert.deepEqual(s.sheets.get('Requests backup TEST_TIMESTAMP').rows,before);
assert.equal(s.context.migrateRequestsColumns().status,'already_migrated');
assert.equal(s.sheets.size,2);
assert.equal(runPost(s).status,'success');
assert.equal(active.rows[2].length,11);
assert.equal(active.rows[2][9],data.specific_notes);
assert.equal(active.rows[2][10],'trust-audit-page');
const profile = {...data,company_name:'',role:'',linkedin_url:'https://www.linkedin.com/in/example/',linkedin_current_state:'',specific_notes:'',deal_size:'legacy value',fit_outcome:'poor_fit'};
assert.equal(runPost(s,profile).status,'success');
assert.equal(active.rows[3].length,11);
assert.equal(active.rows[3][3],profile.linkedin_url);
assert.equal(active.rows[3][7],data.commercial_focus);
assert.equal(s.unlocked(),true);
const fresh = setup();
assert.equal(runPost(fresh).status,'success');
assert.deepEqual(fresh.sheets.get('Requests').rows[0],fresh.newHeaders);
const bad = setup(true);
bad.sheets.get('Requests').rows[0][0]='Unexpected header';
assert.equal(runPost(bad).status,'error');
assert.equal(bad.sheets.get('Requests').rows.length,1);
assert.throws(() => bad.context.migrateRequestsColumns(), /headers/);
assert.equal(bad.sheets.size,1);
assert.equal(bad.unlocked(),true);
assert.equal(runPost(s,{record_type:'event',session_id:'test',event_name:'form_step_view',step_number:'2',max_step_reached:'2'}).status,'success');
assert.equal(runPost(s,{record_type:'event',session_id:'test',event_name:'form_submitted',submitted:'true'}).status,'success');
assert.equal(s.sheets.get('Events').rows[0].length,17);
assert.equal(s.sheets.get('Sessions').rows[0].length,16);
assert.equal(s.sheets.get('Sessions').rows[1][8],2);
assert.equal(s.sheets.get('Sessions').rows[1][10],true);
console.log('PASS: legacy/new layouts, backup, four-column removal, preserved rows, idempotence, fresh Sheet, fallback/profile requests, unknown-header rejection, released locks, unchanged Events/Sessions. No live writes.');
