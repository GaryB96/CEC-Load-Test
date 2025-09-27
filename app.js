// CEC Section 8 single-dwelling calculator - cleaned, single IIFE

(function(){

  function $(id){ return document.getElementById(id); }

  function fmtW(n){ return new Intl.NumberFormat().format(Math.round(n)); }
  function fmtA(n){ return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n); }

  function escapeHtml(input){ if(input === null || input === undefined) return ''; return String(input).replace(/[&<>"']/g, function(ch){ return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" })[ch]; }); }

  // CEC Section 8 single-dwelling calculator
  // Clean, single IIFE. Live auto-fill disabled: area inputs only change when the user clicks "Add section".

  (function(){
    'use strict';

    function $(id){ return document.getElementById(id); }

    function fmtW(n){ return new Intl.NumberFormat().format(Math.round(n)); }
    function fmtA(n){ return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n); }

    function escapeHtml(input){ if(input === null || input === undefined) return ''; return String(input).replace(/[&<>"']/g, function(ch){ return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" })[ch]; }); }

    var SQFT_PER_SQM = 10.763910416709722;
    var state = { appliances: [], spaceHeat: [], airCond: [], ranges: [], specialWater: [] };
    var lastCalcSnapshot = null;

    function renderList(hostId, items, formatItem){ var host=$(hostId); if(!host) return; host.innerHTML=''; items.forEach(function(it, idx){ var row=document.createElement('div'); row.className='item'; var name=document.createElement('div'); name.textContent = formatItem.title(it); var val=document.createElement('div'); val.className='mono'; val.textContent = formatItem.value(it); var kill=document.createElement('button'); kill.className='kill'; kill.textContent='Remove'; kill.addEventListener('click', function(){ formatItem.remove(idx); renderAllLists(); calculate(); }); row.appendChild(name); row.appendChild(val); row.appendChild(kill); host.appendChild(row); }); }

    function renderAllLists(){ renderList('spaceHeatList', state.spaceHeat, { title: function(i){ return i.label; }, value: function(i){ return i.type==='amps'? (fmtA(i.amps)+' A @ '+fmtA(i.voltage)+' V ('+fmtW(i.watts)+' W)') : (fmtW(i.watts)+' W'); }, remove: function(idx){ state.spaceHeat.splice(idx,1); } }); renderList('airCondList', state.airCond, { title: function(i){ return i.label; }, value: function(i){ return i.type==='amps'? (fmtA(i.amps)+' A @ '+fmtA(i.voltage)+' V ('+fmtW(i.watts)+' W)') : (fmtW(i.watts)+' W'); }, remove: function(idx){ state.airCond.splice(idx,1); } }); renderList('rangeList', state.ranges, { title: function(i){ return i.label; }, value: function(i){ return i.count + ' x ' + fmtW(i.watts) + ' W'; }, remove: function(idx){ state.ranges.splice(idx,1); } }); renderList('specialWaterList', state.specialWater, { title: function(i){ return i.name; }, value: function(i){ return fmtW(i.watts) + ' W'; }, remove: function(idx){ state.specialWater.splice(idx,1); } }); renderList('applianceList', state.appliances, { title: function(i){ return i.name; }, value: function(i){ return fmtW(i.watts) + ' W'; }, remove: function(idx){ state.appliances.splice(idx,1); } }); }

    function updateSpaceHeatInputMode(){ var t=$('spaceHeatType'), v=$('spaceHeatValue'), u=$('spaceHeatVoltage'); if(!t||!v||!u) return; if(t.value==='amps'){ u.style.display=''; u.disabled=false; v.placeholder='Amps'; } else { u.style.display='none'; u.disabled=true; v.placeholder='Watts'; } }
    function updateAirCondInputMode(){ var t=$('airCondType'), v=$('airCondValue'), u=$('airCondVoltage'); if(!t||!v||!u) return; if(t.value==='amps'){ u.style.display=''; u.disabled=false; v.placeholder='Amps'; } else { u.style.display='none'; u.disabled=true; v.placeholder='Watts'; } }

    function addSpaceHeat(){ var n=$('spaceHeatName'), t=$('spaceHeatType'), v=$('spaceHeatValue'), u=$('spaceHeatVoltage'); if(!t||!v) return; var label = n? n.value.trim() : ''; var type = t.value; var value = parseFloat(v.value); if(isNaN(value) || value<=0) return; var watts=0, amps=null, voltage=null; if(type==='amps'){ var raw = u?parseFloat(u.value):NaN; if(isNaN(raw)||raw<=0) return; amps = value; voltage = raw; watts = amps*voltage; } else watts = value; state.spaceHeat.push({ label: label || (type==='amps'?'Heating load (A)':'Heating load (W)'), type: type, watts: Math.round(watts), amps: type==='amps'?amps:null, voltage: type==='amps'?voltage:null }); if(n) n.value=''; v.value=''; renderAllLists(); calculate(); }

    function addAirCond(){ var n=$('airCondName'), t=$('airCondType'), v=$('airCondValue'), u=$('airCondVoltage'); if(!t||!v) return; var label = n? n.value.trim() : ''; var type = t.value; var value = parseFloat(v.value); if(isNaN(value)||value<=0) return; var watts=0, amps=null, voltage=null; if(type==='amps'){ var raw = u?parseFloat(u.value):NaN; if(isNaN(raw)||raw<=0) return; amps = value; voltage = raw; watts = amps*voltage; } else watts = value; state.airCond.push({ label: label || (type==='amps'?'Cooling load (A)':'Cooling load (W)'), type: type, watts: Math.round(watts), amps: type==='amps'?amps:null, voltage: type==='amps'?voltage:null }); if(n) n.value=''; v.value=''; renderAllLists(); calculate(); }

    function addRange(){ var n=$('rangeName'), c=$('rangeCount'), w=$('rangeWatts'); if(!c||!w) return; var label = n? n.value.trim() : ''; var count = parseInt(c.value||'0',10); var watts = parseFloat(w.value); if(isNaN(count)||count<=0) return; if(isNaN(watts)||watts<=0) return; state.ranges.push({ label: label||'Range', count: count, watts: Math.round(watts) }); if(n) n.value=''; if(c) c.value = c.defaultValue || '1'; if(w) w.value = w.defaultValue || ''; renderAllLists(); calculate(); }

    function addSpecialWater(){ var n=$('specialWaterName'), w=$('specialWaterWatts'); if(!w) return; var label = n? n.value.trim() : ''; var watts = parseFloat(w.value); if(isNaN(watts)||watts<=0) return; state.specialWater.push({ name: label||'Dedicated heater', watts: Math.round(watts) }); if(n) n.value=''; w.value=''; renderAllLists(); calculate(); }

    function addAppliance(){ var n=$('applianceName'), w=$('applianceWatts'); if(!n||!w) return; var name = n.value.trim(); var watts = parseFloat(w.value); if(!name||isNaN(watts)||watts<=0) return; state.appliances.push({ name: name, watts: Math.round(watts) }); n.value=''; w.value=''; renderAllLists(); calculate(); }

    function setupCollapsibles(){ var sections=document.querySelectorAll('fieldset.collapsible'); Array.prototype.forEach.call(sections, function(fieldset){ var toggle=fieldset.querySelector('.collapse-toggle'); var body=fieldset.querySelector('.collapse-body'); if(!toggle||!body) return; var expanded = toggle.getAttribute('aria-expanded') !== 'false'; if(!expanded){ fieldset.classList.add('collapsed'); body.hidden = true; } toggle.addEventListener('click', function(){ var isCollapsed = fieldset.classList.toggle('collapsed'); var expandedNow = !isCollapsed; toggle.setAttribute('aria-expanded', expandedNow ? 'true' : 'false'); body.hidden = !expandedNow; }); }); }

    // Watts calculator wiring
    function setupWattsCalc(){
      var valEl = $('calcValue');
      var voltEl = $('calcVoltage');
      var resultEl = $('calcResult');
      var clearBtn = $('clearCalc');

      function compute(){
        var amps = valEl ? parseFloat(valEl.value) : NaN;
        var voltage = voltEl ? parseFloat(voltEl.value) : 240;
        if(isNaN(amps) || amps <= 0){ if(resultEl) resultEl.textContent = '-- W'; return; }
        var watts = amps * (isNaN(voltage) ? 240 : voltage);
        if(resultEl) resultEl.textContent = Math.round(watts) + ' W';
        return watts;
      }

      if(valEl) valEl.addEventListener('input', compute);
      if(voltEl) voltEl.addEventListener('change', compute);

      if(clearBtn){ clearBtn.addEventListener('click', function(){ if(valEl) valEl.value=''; if(voltEl) voltEl.value='240'; if(resultEl) resultEl.textContent='-- W'; setTimeout(calculate,50); }); }
      compute();
    }

    // Live auto-fill intentionally disabled.
    function setupAreaDimensions(){ /* no-op */ }

    function setupAreaSection(buttonId, lengthId, widthId, areaInputId, calcDisplayId){
      // Handler executed when an Add button is clicked. We re-query inputs at click time
      // (in case the DOM changes) and provide a delegated fallback so clicks are
      // handled even if the button isn't present at handler-registration time.
      function handleClick(){
        var lengthEl = document.getElementById(lengthId);
        var widthEl = document.getElementById(widthId);
        var areaEl = document.getElementById(areaInputId);
        var calcDisplay = document.getElementById(calcDisplayId);
        if(!lengthEl || !widthEl || !areaEl) return;
        var length = parseFloat(lengthEl.value);
        var width = parseFloat(widthEl.value);
        if(!isNaN(length) && !isNaN(width) && length > 0 && width > 0){
          var added = length * width;
          var current = parseFloat(areaEl.value) || 0;
          var total = current + added;
          areaEl.value = Math.round(total);
          lengthEl.value = '';
          widthEl.value = '';
          if(calcDisplay) calcDisplay.textContent = Math.round(added) + ' ft\u00b2 added';
          calculate();
        }
      }

      var btn = document.getElementById(buttonId);
      if(btn){
        btn.addEventListener('click', function(e){ e && e.preventDefault(); handleClick(); });
      }

      // Also allow Enter/Return in either length or width to trigger the same add behavior.
      function handleKey(e){
        if(!e) return;
        if(e.key === 'Enter' || e.keyCode === 13){
          e.preventDefault();
          handleClick();
        }
      }
      var lengthEl = document.getElementById(lengthId);
      var widthEl = document.getElementById(widthId);
      if(lengthEl) lengthEl.addEventListener('keydown', handleKey);
      if(widthEl) widthEl.addEventListener('keydown', handleKey);

      // Delegated fallback: catch clicks on the document that match the button id.
      document.addEventListener('click', function(e){
        if(!e || !e.target) return;
        try{
          if(e.target.id === buttonId || (e.target.closest && e.target.closest('#'+buttonId))){
            e.preventDefault();
            handleClick();
          }
        }catch(err){ /* ignore malformed selectors */ }
      });
    }

    function rangeDemand(rangeEntries){ if(!rangeEntries||rangeEntries.length===0) return 0; var total=0; rangeEntries.forEach(function(item){ var count=Math.max(0,item.count); var rating=Math.max(0,item.watts); if(count<=0||rating<=0) return; var over=Math.max(0,rating-12000); var perRange = 6000 + 0.40 * over; total += count * perRange; }); return total; }

    function otherLoadsDemandW(hasRange, appliancesW){ var totalW = appliancesW; if(totalW<=0) return 0; if(hasRange) return totalW * 0.25; var first = Math.min(6000, totalW); var rem = Math.max(0, totalW - 6000); return first + rem * 0.25; }

    function computeAreas(){ var groundUpperFt2 = parseFloat($('groundUpperArea').value) || 0; var basementFt2 = parseFloat($('basementArea').value) || 0; var livingFt2 = groundUpperFt2 + 0.75 * basementFt2; var exclusiveFt2 = groundUpperFt2; var livingAreaDisplay = $('livingAreaDisplay'); if(livingAreaDisplay) livingAreaDisplay.textContent = fmtA(livingFt2); var exclusiveAreaDisplay = $('exclusiveAreaDisplay'); if(exclusiveAreaDisplay) exclusiveAreaDisplay.textContent = fmtA(exclusiveFt2); return { groundUpperFt2: groundUpperFt2, basementFt2: basementFt2, livingFt2: livingFt2, exclusiveFt2: exclusiveFt2, livingSqM: livingFt2 / SQFT_PER_SQM, exclusiveSqM: exclusiveFt2 / SQFT_PER_SQM }; }

    function calculate(){ var areas = computeAreas(); var livingSqM = areas.livingSqM; var exclusiveSqM = areas.exclusiveSqM; var pickDimension = function(id){ var el=$(id); if(!el) return null; var v=parseFloat(el.value); return Number.isFinite(v) && v>0 ? v : null; }; var groundUpperLength = pickDimension('groundUpperLength'); var groundUpperWidth = pickDimension('groundUpperWidth'); var basementLength = pickDimension('basementLength'); var basementWidth = pickDimension('basementWidth'); var spaceHeatDemandW = state.spaceHeat.reduce(function(s,i){ return s + i.watts; },0); var acW = state.airCond.reduce(function(s,i){ return s + i.watts; },0); var interlockEl = $('interlock'); var interlock = interlockEl ? interlockEl.value === 'yes' : false; var totalRanges = state.ranges.reduce(function(s,i){ return s + i.count; },0); var tanklessWatts = parseFloat($('tanklessWatts')?$('tanklessWatts').value:0) || 0; var storageWHWatts = parseFloat($('storageWHWatts')?$('storageWHWatts').value:0) || 0; var specialDedicatedW = state.specialWater.reduce(function(s,i){ return s + i.watts; },0); var evseCount = parseInt($('evseCount')?$('evseCount').value:'0',10) || 0; var evseWatts = parseFloat($('evseWatts')?$('evseWatts').value:0) || 0; var evems = ($('evems') && $('evems').value === 'yes'); var voltage = 240; var basic = 0; if(livingSqM > 0){ basic = 5000; var extra = Math.max(0, livingSqM - 90); if(extra>0){ var blocks = Math.ceil(extra / 90); basic += blocks * 1000; } } var heatW = spaceHeatDemandW; var spaceCondW = interlock ? Math.max(heatW, acW) : (heatW + acW); var rangesW = rangeDemand(state.ranges); var specialWHW = tanklessWatts + specialDedicatedW; var evseW = evems ? 0 : evseCount * evseWatts; var manualAppliancesW = state.appliances.reduce(function(s,i){ return s + i.watts; },0); var appliancesW = manualAppliancesW + storageWHWatts; var otherW = otherLoadsDemandW(totalRanges > 0, appliancesW); var pathA = basic + spaceCondW + rangesW + specialWHW + evseW + otherW; var pathB = (computeAreas().exclusiveSqM >= 80) ? 24000 : 14400; var calcLoad = Math.max(pathA, pathB); var amps = calcLoad / voltage; if($('pathA')) $('pathA').textContent = fmtW(pathA); if($('pathB')) $('pathB').textContent = fmtW(pathB); if($('calcLoad')) $('calcLoad').textContent = fmtW(calcLoad); if($('minAmps')) $('minAmps').textContent = fmtA(amps); if($('voltsLabel')) $('voltsLabel').textContent = voltage; lastCalcSnapshot = { area: { groundUpperFt2: parseFloat($('groundUpperArea').value)||0, basementFt2: parseFloat($('basementArea').value)||0, livingFt2: areas.livingFt2, exclusiveFt2: areas.exclusiveFt2, groundUpperLength: groundUpperLength, groundUpperWidth: groundUpperWidth, basementLength: basementLength, basementWidth: basementWidth }, loads: { basic: basic, spaceHeatDemandW: heatW, airCondDemandW: acW, spaceConditioningW: spaceCondW, interlock: interlock, rangesDemandW: rangesW, tanklessWatts: tanklessWatts, specialDedicatedW: specialDedicatedW, specialTotalW: specialWHW, storageWHWatts: storageWHWatts, manualAppliancesW: manualAppliancesW, appliancesPoolW: appliancesW, otherDemandW: otherW, evseDemandW: evseW, evseCount: evseCount, evseWatts: evseWatts, evems: evems, totalRanges: totalRanges }, results: { pathA: pathA, pathB: pathB, calcLoad: calcLoad, amps: amps, voltage: voltage } }; }

    function formatInspectionDate(value){ if(!value) return null; var parts = value.split('-'); if(parts.length !== 3) return null; var y=parseInt(parts[0],10), m=parseInt(parts[1],10), d=parseInt(parts[2],10); if(!Number.isFinite(y)||!Number.isFinite(m)||!Number.isFinite(d)) return null; var date=new Date(y,m-1,d); if(Number.isNaN(date.getTime())) return null; return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).format(date); }

    function generateReport(){
      if(!lastCalcSnapshot) calculate();
      var snapshot = lastCalcSnapshot;
      if(!snapshot){ alert('Please calculate the load before generating a report.'); return; }
      var inspectionEl = $('inspectionDate');
      var policyEl = $('policyNumber');
      var inspectionValue = inspectionEl ? inspectionEl.value : '';
      var policyValue = policyEl ? policyEl.value.trim() : '';
      var inspectionDisplay = formatInspectionDate(inspectionValue) || 'Not provided';
      var policyDisplay = policyValue ? escapeHtml(policyValue) : 'Not provided';
      // Capture notes inclusion and value prior to generating the report HTML
      var includeNotesChecked = false;
      var notesForReport = '';
      try {
        var _inc = document.getElementById('includeNotes');
        var _notes = document.getElementById('systemNotes');
        includeNotesChecked = _inc ? !!_inc.checked : false;
        notesForReport = (_notes && includeNotesChecked) ? escapeHtml(_notes.value) : '';
      } catch (e) { /* ignore if DOM not available */ }
      

      function fmtW(n){ return new Intl.NumberFormat().format(Math.round(n)); }
      function fmtA(n){ return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n); }

      // Area summary: combined ground+upper, basement, and total living area (100% basement)
      var totalLiving100 = (parseFloat(snapshot.area.groundUpperFt2) || 0) + (parseFloat(snapshot.area.basementFt2) || 0);
      var areaRows = [
        '<tr><th scope="row">Ground & upper living area</th><td>'+fmtA(snapshot.area.groundUpperFt2)+' ft\u00b2</td></tr>',
        '<tr><th scope="row">Basement area (>= 5 ft 11 in)</th><td>'+fmtA(snapshot.area.basementFt2)+' ft\u00b2</td></tr>',
        '<tr><th scope="row">Total living area (ground + basement)</th><td>'+fmtA(totalLiving100)+' ft\u00b2</td></tr>'
      ];

      var spaceHeatRows = state.spaceHeat.length
        ? state.spaceHeat.map(function(item, idx){ var det = item.type==='amps' ? (fmtA(item.amps)+' A @ '+fmtA(item.voltage)+' V ('+fmtW(item.watts)+' W)') : (fmtW(item.watts)+' W'); return '<tr><td>'+ (idx + 1) + '. ' + escapeHtml(item.label) + '</td><td>' + escapeHtml(det) + '</td></tr>'; }).join('')
        : '<tr><td colspan="2">No space heating loads recorded.</td></tr>';

      var airRows = state.airCond.length
        ? state.airCond.map(function(item, idx){ var det = item.type==='amps' ? (fmtA(item.amps)+' A @ '+fmtA(item.voltage)+' V ('+fmtW(item.watts)+' W)') : (fmtW(item.watts)+' W'); return '<tr><td>'+ (idx + 1) + '. ' + escapeHtml(item.label) + '</td><td>' + escapeHtml(det) + '</td></tr>'; }).join('')
        : '<tr><td colspan="2">No air conditioning loads recorded.</td></tr>';

      var rangeRows = state.ranges.length
        ? state.ranges.map(function(item, idx){ return '<tr><td>'+ (idx + 1) + '. ' + escapeHtml(item.label) + '</td><td>'+ item.count + ' x ' + fmtW(item.watts) + ' W</td></tr>'; }).join('')
        : '<tr><td colspan="2">No cooking ranges recorded.</td></tr>';

      var specialWaterRows = state.specialWater.length
        ? state.specialWater.map(function(item, idx){ return '<tr><td>'+ (idx + 1) + '. ' + escapeHtml(item.name) + '</td><td>'+ fmtW(item.watts) + ' W</td></tr>'; }).join('')
        : '<tr><td colspan="2">No dedicated water heaters recorded.</td></tr>';

      var appliancesRows = state.appliances.length
        ? state.appliances.map(function(item, idx){ return '<tr><td>'+ (idx + 1) + '. ' + escapeHtml(item.name) + '</td><td>'+ fmtW(item.watts) + ' W</td></tr>'; }).join('')
        : '<tr><td colspan="2">No additional fixed appliances recorded.</td></tr>';

      var storageRow = snapshot.loads.storageWHWatts > 0
        ? '<tr><td>Storage water heater</td><td>'+fmtW(snapshot.loads.storageWHWatts)+' W</td></tr>'
        : '';

      var tanklessRow = snapshot.loads.tanklessWatts > 0
        ? '<tr><td>Tankless water heater</td><td>'+fmtW(snapshot.loads.tanklessWatts)+' W</td></tr>'
        : '';

      var evemsLabel = snapshot.loads.evems ? 'Yes (excluded per 8-106(11))' : 'No (included at 100%)';

      var reportWindow = window.open('', '_blank');

      if(!reportWindow){
        alert('Please allow pop-ups to view the report.');
        return;
      }

      var reportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Load Calculation Report</title>
  <style>
    body { font-family: "Segoe UI", Arial, sans-serif; margin: 0; padding: 32px; color: #000; background: #fff; }
    h1 { margin: 0 0 0.6rem; font-size: 1.7rem; letter-spacing: 0.02em; }
    .meta { margin-bottom: 1.5rem; }
    .meta-item { margin-bottom: 0.35rem; }
    .meta-label { font-weight: 600; display: inline-block; min-width: 160px; }
    .report-section { margin-bottom: 1.8rem; }
    .section-title { font-size: 1.05rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.6rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 0.45rem 0.6rem; font-size: 0.94rem; text-align: left; vertical-align: top; }
    th { background: #f2f2f2; font-weight: 600; }
    .totals-table th { width: 60%; }
    .totals-highlight { font-weight: 700; }
    .notes { font-size: 0.85rem; color: #333; margin-top: 0.6rem; }

    /* Toolbar base styling */
    #report-toolbar { display: flex; align-items: center; gap: 8px; }
    #report-toolbar button { padding: 6px 10px; font-size: 0.95rem; border-radius: 6px; cursor: pointer; }

    /* Make toolbar buttons larger and easier to tap on small screens */
    @media (max-width: 600px) {
      #report-toolbar { flex-direction: column; align-items: stretch; }
      /* override inline styles (padding/margin) so buttons expand on mobile */
      #report-toolbar button { padding: 12px 14px !important; font-size: 1.05rem !important; width: 100% !important; margin-right: 0 !important; }
    }

    @media print {
      /* Hide the toolbar when printing */
      #report-toolbar { display: none !important; }
    }
    @media print {
      body { padding: 0.75in; }
      table { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>Load Calculation Report</h1>
  <div class="meta">
    <div class="meta-item"><span class="meta-label">Inspection date:</span><span>${escapeHtml(inspectionDisplay)}</span></div>
    <div class="meta-item"><span class="meta-label">Policy:</span><span>${policyDisplay}</span></div>
  </div>

  <section class="report-section">
    <div class="section-title">Area Summary</div>
    <table>
      <thead><tr><th scope="col">Item</th><th scope="col">Value</th></tr></thead>
      <tbody>
        ${areaRows.join('\n        ')}
      </tbody>
    </table>
  </section>

  <section class="report-section">
    <div class="section-title">Space Heating Loads</div>
    <table>
      <thead><tr><th scope="col">Entry</th><th scope="col">Details</th></tr></thead>
      <tbody>
        ${spaceHeatRows}
      </tbody>
    </table>
  </section>

  <section class="report-section">
    <div class="section-title">Air Conditioning Loads</div>
    <table>
      <thead><tr><th scope="col">Entry</th><th scope="col">Details</th></tr></thead>
      <tbody>
        ${airRows}
      </tbody>
    </table>
  </section>

  <section class="report-section">
    <div class="section-title">Cooking Ranges</div>
    <table>
      <thead><tr><th scope="col">Entry</th><th scope="col">Details</th></tr></thead>
      <tbody>
        ${rangeRows}
      </tbody>
    </table>
  </section>

  <section class="report-section">
    <div class="section-title">Water Heating</div>
    <table>
      <thead><tr><th scope="col">Item</th><th scope="col">Details</th></tr></thead>
      <tbody>
        ${tanklessRow || ''}
        ${storageRow || ''}
        ${specialWaterRows}
      </tbody>
    </table>
  </section>

  <section class="report-section">
    <div class="section-title">Other Fixed Appliances ≥ 1500 W</div>
    <table>
      <thead><tr><th scope="col">Entry</th><th scope="col">Nameplate</th></tr></thead>
      <tbody>
        ${appliancesRows}
      </tbody>
    </table>
  </section>

  <section class="report-section">
    <div class="section-title">Electric Vehicle Charging</div>
    <table>
      <thead><tr><th scope="col">Detail</th><th scope="col">Value</th></tr></thead>
      <tbody>
        <tr><td>Chargers installed</td><td>${snapshot.loads.evseCount}</td></tr>
        <tr><td>Per charger rating</td><td>${fmtW(snapshot.loads.evseWatts)} W</td></tr>
        <tr><td>Energy management (EVEMS)</td><td>${evemsLabel}</td></tr>
        <tr><td>Demand included</td><td>${fmtW(snapshot.loads.evseDemandW)} W</td></tr>
      </tbody>
    </table>
  </section>

  <section class="report-section">
    <div class="section-title">Demand Summary</div>
    <table class="totals-table">
      <thead><tr><th scope="col">Component</th><th scope="col">Demand (W)</th></tr></thead>
      <tbody>
        <tr><td>Basic load from area</td><td>${fmtW(snapshot.loads.basic)}</td></tr>
        <tr><td>Space heating demand</td><td>${fmtW(snapshot.loads.spaceHeatDemandW)}</td></tr>
        <tr><td>Air conditioning demand</td><td>${fmtW(snapshot.loads.airCondDemandW)}</td></tr>
        <tr><td>Space conditioning total (${snapshot.loads.interlock ? 'interlocked (max of heat / AC)' : 'heat + AC'})</td><td>${fmtW(snapshot.loads.spaceConditioningW)}</td></tr>
        <tr><td>Cooking ranges demand</td><td>${fmtW(snapshot.loads.rangesDemandW)}</td></tr>
        <tr><td>Tankless water heaters</td><td>${fmtW(snapshot.loads.tanklessWatts)}</td></tr>
        <tr><td>Dedicated spa / pool heaters</td><td>${fmtW(snapshot.loads.specialDedicatedW)}</td></tr>
        <tr><td>Electric vehicle charging</td><td>${fmtW(snapshot.loads.evseDemandW)}</td></tr>
        <tr><td>Other fixed appliances (incl. storage WH)</td><td>${fmtW(snapshot.loads.otherDemandW)}</td></tr>
        <tr><td>Path A total</td><td class="totals-highlight">${fmtW(snapshot.results.pathA)}</td></tr>
        <tr><td>Path B (fixed minimum)</td><td>${fmtW(snapshot.results.pathB)}</td></tr>
        <tr><td>Calculated load (greater of Path A or B)</td><td class="totals-highlight">${fmtW(snapshot.results.calcLoad)}</td></tr>
        <tr><td>Minimum service / feeder current</td><td class="totals-highlight">${fmtA(snapshot.results.amps)} A @ ${snapshot.results.voltage} V</td></tr>
      </tbody>
    </table>
  </section>

  <div class="notes">
    Report generated on ${escapeHtml(new Date().toLocaleString())}.
  </div>
  
  ${ notesForReport ? ('<section class="report-section"><div class="section-title">System notes</div><div class="notes">' + notesForReport + '</div></section>') : '' }

  <div style="margin-top:12px;">
    <div id="report-toolbar" style="margin-bottom:12px;">
      <button id="downloadPdf" style="margin-right:8px;padding:6px 10px">Download PDF</button>
      <button id="printBtn" style="margin-right:8px;padding:6px 10px">Print</button>
      <button id="closeBtn" style="padding:6px 10px">Close</button>
      <span id="reportStatus" style="margin-left:12px;font-size:.95rem;color:#333"></span>
    </div>
  </div>

</body>
<script>
  (function(){
    // Embedded form values for filename construction
    var policyRaw = ${JSON.stringify(policyValue)};
    var inspectionRaw = ${JSON.stringify(inspectionValue)};

  function safeForFilename(s){ if(!s) return ''; return String(s).normalize('NFKC').trim().replace(/[\s\/\\:]+/g,'_').replace(/[^A-Za-z0-9_.-]/g,''); }
    function inspectionDateForFile(raw){ if(!raw) return 'NoDate'; try{ var parts = raw.split('-'); if(parts.length===3){ var y=parseInt(parts[0],10), m=parseInt(parts[1],10), d=parseInt(parts[2],10); var dt=new Date(y,m-1,d); if(!isNaN(dt.getTime())) return dt.toISOString().slice(0,10); } }catch(e){} return safeForFilename(raw) || 'NoDate'; }

    var inspectionDatePart = inspectionDateForFile(inspectionRaw);
    var policyPart = safeForFilename(policyRaw) || 'Report';
    var filename = policyPart + ' - Load Test - ' + inspectionDatePart + '.pdf';

    var statusEl = document.getElementById('reportStatus');
    function setStatus(s){ if(statusEl) statusEl.textContent = s; }

    function loadHtml2Pdf(callback){
      if(window.html2pdf){ callback(null); return; }
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.9.2/html2pdf.bundle.min.js';
      s.onload = function(){ callback(null); };
      s.onerror = function(){ callback(new Error('failed to load html2pdf')); };
      document.head.appendChild(s);
    }

    function doDownload(){
      setStatus('Preparing PDF...');
      var toolbar = document.getElementById('report-toolbar');
      var prevDisplay = null;
      if(toolbar){ prevDisplay = toolbar.style.display; toolbar.style.display = 'none'; }
      loadHtml2Pdf(function(err){
        if(err){ console.warn('html2pdf load failed', err); if(toolbar) toolbar.style.display = prevDisplay || ''; setStatus('Could not load PDF library; opening print dialog.'); window.print(); return; }
        try{
          html2pdf().set({ filename: filename, pagebreak: { mode: 'css' } }).from(document.body).save().then(function(){
            setStatus('Download started');
            if(toolbar) toolbar.style.display = prevDisplay || '';
          }).catch(function(err){
            console.warn('html2pdf failed', err);
            if(toolbar) toolbar.style.display = prevDisplay || '';
            setStatus('PDF generation failed; opening print dialog.');
            window.print();
          });
        }catch(e){ console.warn(e); if(toolbar) toolbar.style.display = prevDisplay || ''; setStatus('PDF generation error; opening print dialog.'); window.print(); }
      });
    }

    document.getElementById('downloadPdf').addEventListener('click', function(){ doDownload(); });
    document.getElementById('printBtn').addEventListener('click', function(){ setStatus('Opening print dialog...'); setTimeout(function(){ window.print(); }, 50); });
    document.getElementById('closeBtn').addEventListener('click', function(){ try{ window.close(); }catch(e){ /* ignore */ } });

    // Try to pre-load the library to reduce delay when user clicks download
    loadHtml2Pdf(function(err){ if(err) setStatus('PDF library not available (will use print).'); else setStatus('PDF library ready — click Download PDF.'); });
  })();
</script>
</html>`;
      

      reportWindow.document.open();
      reportWindow.document.write(reportHtml);
      reportWindow.document.close();
      reportWindow.focus();

    }

    (function init(){
      function doInit(){
        // Wire Add-section handlers and other UI initialization.
        setupAreaSection('addGroundUpperDim','groundUpperLength','groundUpperWidth','groundUpperArea','groundUpperCalc');
        setupAreaSection('addBasementDim','basementLength','basementWidth','basementArea','basementCalc');
        setupAreaDimensions();
        setupCollapsibles();
        updateSpaceHeatInputMode();
        updateAirCondInputMode();
        renderAllLists();
        // Initialize the sticky Watts calculator
        try{ setupWattsCalc(); }catch(e){ /* ignore if elements missing */ }
        calculate();
      }
      if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', doInit);
      } else {
        doInit();
      }
    })();

    var reportBtn = $('reportBtn'); if(reportBtn) reportBtn.addEventListener('click', function(e){ e.preventDefault(); generateReport(); });
    var addSpaceHeatBtn = $('addSpaceHeat'); if(addSpaceHeatBtn) addSpaceHeatBtn.addEventListener('click', function(e){ e.preventDefault(); addSpaceHeat(); });
    var addAirCondBtn = $('addAirCond'); if(addAirCondBtn) addAirCondBtn.addEventListener('click', function(e){ e.preventDefault(); addAirCond(); });
    var addRangeBtn = $('addRange'); if(addRangeBtn) addRangeBtn.addEventListener('click', function(e){ e.preventDefault(); addRange(); });
    var addSpecialWaterBtn = $('addSpecialWater'); if(addSpecialWaterBtn) addSpecialWaterBtn.addEventListener('click', function(e){ e.preventDefault(); addSpecialWater(); });
    var addApplianceBtn = $('addAppliance'); if(addApplianceBtn) addApplianceBtn.addEventListener('click', function(e){ e.preventDefault(); addAppliance(); });

    var calcForm = $('calcForm'); if(calcForm){ calcForm.addEventListener('input', function(e){ var id = e && e.target && e.target.id; var instant = [ 'groundUpperArea','basementArea','spaceHeatName','spaceHeatType','spaceHeatValue','spaceHeatVoltage','airCondName','airCondType','airCondValue','airCondVoltage','rangeName','rangeCount','rangeWatts','interlock','tanklessWatts','storageWHWatts','evseCount','evseWatts','evems','applianceWatts','applianceName' ].indexOf(id) !== -1; if(instant) calculate(); if(id === 'spaceHeatType') updateSpaceHeatInputMode(); if(id === 'airCondType') updateAirCondInputMode(); }); }

    // Ensure reset clears app state and UI beyond native form reset
    if(calcForm){
      calcForm.addEventListener('reset', function(e){
        // Clear notes and include toggle
        var notesEl = $('systemNotes'); if(notesEl) notesEl.value = '';
        var includeEl = $('includeNotes'); if(includeEl) includeEl.checked = false;

        // Clear in-memory lists
        state.appliances = [];
        state.spaceHeat = [];
        state.airCond = [];
        state.ranges = [];
        state.specialWater = [];

        // Clear snapshot
        lastCalcSnapshot = null;

        // Clear displayed lists
        renderAllLists();

        // Reset displays
        if($('pathA')) $('pathA').textContent = '0';
        if($('pathB')) $('pathB').textContent = '0';
        if($('calcLoad')) $('calcLoad').textContent = '0';
        if($('minAmps')) $('minAmps').textContent = '0';
        if($('voltsLabel')) $('voltsLabel').textContent = '240';
        if($('livingAreaDisplay')) $('livingAreaDisplay').textContent = '--';
        if($('exclusiveAreaDisplay')) $('exclusiveAreaDisplay').textContent = '--';

        // Clear any data-autofilled attributes (from backup code)
        ['groundUpperArea','basementArea'].forEach(function(id){ var el = $(id); if(el) el.removeAttribute('data-autofilled'); });

        // Hide/clear calculated dim displays
        if($('groundUpperCalc')) $('groundUpperCalc').textContent = '--';
        if($('basementCalc')) $('basementCalc').textContent = '--';

        

        // Re-run UI mode updates
        updateSpaceHeatInputMode(); updateAirCondInputMode();

        // Recalculate (form values are already reset by native reset)
        setTimeout(calculate, 0);
      });
    }

  })();

})();




