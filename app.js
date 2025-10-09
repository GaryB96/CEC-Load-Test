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
    // Track whether the user has made changes that might be lost by an automatic reload.
    var isDirty = false;
    // Helper to detect if the app is running as an installed/standalone PWA
    function isStandalone(){
      try{
        return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
      }catch(e){ return false; }
    }
    var lastCalcSnapshot = null;

  function renderList(hostId, items, formatItem){ var host=$(hostId); if(!host) return; host.innerHTML=''; items.forEach(function(it, idx){ var row=document.createElement('div'); row.className='item'; var name=document.createElement('div'); name.textContent = formatItem.title(it); var val=document.createElement('div'); val.className='mono'; val.textContent = formatItem.value(it); var kill=document.createElement('button'); kill.type = 'button'; kill.className='kill'; kill.textContent='Remove'; kill.addEventListener('click', function(){ formatItem.remove(idx); renderAllLists(); calculate(); }); row.appendChild(name); row.appendChild(val); row.appendChild(kill); host.appendChild(row); }); }

  function renderAllLists(){ renderList('spaceHeatList', state.spaceHeat, { title: function(i){ return i.label; }, value: function(i){ return i.type==='amps'? (fmtA(i.amps)+' A @ '+fmtA(i.voltage)+' V ('+fmtW(i.watts)+' W)') : (fmtW(i.watts)+' W'); }, remove: function(idx){ state.spaceHeat.splice(idx,1); } }); renderList('airCondList', state.airCond, { title: function(i){ return i.label; }, value: function(i){ return i.type==='amps'? (fmtA(i.amps)+' A @ '+fmtA(i.voltage)+' V ('+fmtW(i.watts)+' W)') : (fmtW(i.watts)+' W'); }, remove: function(idx){ state.airCond.splice(idx,1); } }); renderList('rangeList', state.ranges, { title: function(i){ return i.label; }, value: function(i){ if(i.type==='amps'){ return i.count + ' x ' + fmtA(i.amps) + ' A @ ' + fmtA(i.voltage) + ' V ('+fmtW(i.watts)+' W)'; } return i.count + ' x ' + fmtW(i.watts) + ' W'; }, remove: function(idx){ state.ranges.splice(idx,1); } }); renderList('specialWaterList', state.specialWater, { title: function(i){ return i.name; }, value: function(i){ return i.type==='amps'? (fmtA(i.amps) + ' A @ ' + fmtA(i.voltage) + ' V (' + fmtW(i.watts) + ' W)') : (fmtW(i.watts) + ' W'); }, remove: function(idx){ state.specialWater.splice(idx,1); } }); renderList('applianceList', state.appliances, { title: function(i){ return i.name; }, value: function(i){ return fmtW(i.watts) + ' W'; }, remove: function(idx){ state.appliances.splice(idx,1); } }); }

    // Small, ephemeral toast for quick user feedback
    function showToast(msg, duration){
      try{
        var el = document.getElementById('appToast');
        if(!el){ return; }
        el.textContent = msg;
        el.style.display = 'block';
        el.style.opacity = '1';
        // Simple fade-out after duration
        setTimeout(function(){ try{ el.style.transition = 'opacity 420ms ease'; el.style.opacity = '0'; setTimeout(function(){ el.style.display = 'none'; el.style.transition = ''; }, 420); }catch(e){} }, duration || 2200);
      }catch(e){}
    }

    function updateSpaceHeatInputMode(){ var t=$('spaceHeatType'), v=$('spaceHeatValue'), u=$('spaceHeatVoltage'); if(!t||!v||!u) return; if(t.value==='amps'){ u.style.display=''; u.disabled=false; v.placeholder='Amps'; } else { u.style.display='none'; u.disabled=true; v.placeholder='Watts'; } }
    function updateAirCondInputMode(){ var t=$('airCondType'), v=$('airCondValue'), u=$('airCondVoltage'); if(!t||!v||!u) return; if(t.value==='amps'){ u.style.display=''; u.disabled=false; v.placeholder='Amps'; } else { u.style.display='none'; u.disabled=true; v.placeholder='Watts'; } }

    function addSpaceHeat(){ var n=$('spaceHeatName'), t=$('spaceHeatType'), v=$('spaceHeatValue'), u=$('spaceHeatVoltage'); if(!t||!v) return; var label = n? n.value.trim() : ''; var type = t.value; var value = parseFloat(v.value); if(isNaN(value) || value<=0) return; var watts=0, amps=null, voltage=null; if(type==='amps'){ var raw = u?parseFloat(u.value):NaN; if(isNaN(raw)||raw<=0) return; amps = value; voltage = raw; watts = amps*voltage; } else watts = value; state.spaceHeat.push({ label: label || (type==='amps'?'Heating load (A)':'Heating load (W)'), type: type, watts: Math.round(watts), amps: type==='amps'?amps:null, voltage: type==='amps'?voltage:null }); if(n) n.value=''; v.value=''; renderAllLists(); calculate(); }

    function addAirCond(){ var n=$('airCondName'), t=$('airCondType'), v=$('airCondValue'), u=$('airCondVoltage'); if(!t||!v) return; var label = n? n.value.trim() : ''; var type = t.value; var value = parseFloat(v.value); if(isNaN(value)||value<=0) return; var watts=0, amps=null, voltage=null; if(type==='amps'){ var raw = u?parseFloat(u.value):NaN; if(isNaN(raw)||raw<=0) return; amps = value; voltage = raw; watts = amps*voltage; } else watts = value; state.airCond.push({ label: label || (type==='amps'?'Cooling load (A)':'Cooling load (W)'), type: type, watts: Math.round(watts), amps: type==='amps'?amps:null, voltage: type==='amps'?voltage:null }); if(n) n.value=''; v.value=''; renderAllLists(); calculate(); }

  function updateRangeInputMode(){ var t=$('rangeType'), v=$('rangeValue'), u=$('rangeVoltage'); if(!t||!v||!u) return; if(t.value==='amps'){ u.style.display=''; u.disabled=false; v.placeholder='Amps'; } else { u.style.display='none'; u.disabled=true; v.placeholder='Watts'; } }

  function addRange(){ var n=$('rangeName'), t=$('rangeType'), v=$('rangeValue'), u=$('rangeVoltage'); if(!v||!t) return; var label = n? n.value.trim() : ''; var count = 1; var type = t.value; var raw = parseFloat(v.value); if(isNaN(raw)||raw<=0) return; var watts=0, amps=null, voltage=null; if(type==='amps'){ var rawV = u?parseFloat(u.value):NaN; if(isNaN(rawV)||rawV<=0) return; amps = raw; voltage = rawV; watts = amps * voltage; } else { watts = raw; } state.ranges.push({ label: label||'Range', count: count, watts: Math.round(watts), type: type, amps: type==='amps'?amps:null, voltage: type==='amps'?voltage:null }); if(n) n.value=''; if(v) v.value = ''; if(u) u.value = '240'; renderAllLists(); calculate(); }

  function updateSpecialWaterInputMode(){ var t=$('specialWaterType'), v=$('specialWaterValue'), u=$('specialWaterVoltage'); if(!t||!v||!u) return; if(t.value==='amps'){ u.style.display=''; u.disabled=false; v.placeholder='Amps'; } else { u.style.display='none'; u.disabled=true; v.placeholder='Watts'; } }

  function addSpecialWater(){ var n=$('specialWaterName'), t=$('specialWaterType'), v=$('specialWaterValue'), u=$('specialWaterVoltage'); if(!v||!t) return; var label = n? n.value.trim() : ''; var type = t.value; var raw = parseFloat(v.value); if(isNaN(raw)||raw<=0) return; var watts=0, amps=null, voltage=null; if(type==='amps'){ var rawV = u?parseFloat(u.value):NaN; if(isNaN(rawV)||rawV<=0) return; amps = raw; voltage = rawV; watts = amps * voltage; } else { watts = raw; } state.specialWater.push({ name: label||'Dedicated heater', watts: Math.round(watts), type: type, amps: type==='amps'?amps:null, voltage: type==='amps'?voltage:null }); if(n) n.value=''; if(v) v.value=''; if(u) u.value='240'; renderAllLists(); calculate(); }

    

    function addAppliance(){ var n=$('applianceName'), w=$('applianceWatts'); if(!n||!w) return; var name = n.value.trim(); var watts = parseFloat(w.value); if(!name||isNaN(watts)||watts<=0) return; state.appliances.push({ name: name, watts: Math.round(watts) }); n.value=''; w.value=''; renderAllLists(); calculate(); }

    function setupCollapsibles(){
      var sections = document.querySelectorAll('fieldset.collapsible');
      console.debug('[setupCollapsibles] found sections:', sections.length);
      Array.prototype.forEach.call(sections, function(fieldset){
        var toggle = fieldset.querySelector('.collapse-toggle');
        var body = fieldset.querySelector('.collapse-body');
        if(!toggle || !body) return;

        // Debug: report and ensure body is visible to allow transitions
        try{ if (body.hasAttribute && body.hasAttribute('hidden')){ console.debug('[setupCollapsibles] removing hidden from', body.id || body.className); body.removeAttribute('hidden'); } }catch(e){ console.debug('[setupCollapsibles] hidden remove failed', e); }

        // Initialize based on aria-expanded
        var expanded = toggle.getAttribute('aria-expanded') === 'true';
        if(expanded){
          fieldset.classList.remove('collapsed');
          body.style.maxHeight = (body.scrollHeight || 0) + 'px';
          body.style.opacity = '1';
        } else {
          fieldset.classList.add('collapsed');
          body.style.maxHeight = '0px';
          body.style.opacity = '0';
        }
      });

      // Single delegated handler for all toggles
      document.addEventListener('click', function(e){
        // Debug: trace click events near toggles
        try{ var closest = e.target && e.target.closest ? e.target.closest('.collapse-toggle') : null; if(closest) console.debug('[setupCollapsibles] toggle clicked for', closest.getAttribute('aria-controls')); }catch(err){}
        try{
          var btn = e.target && e.target.closest ? e.target.closest('.collapse-toggle') : null;
          if(!btn) return;
          e.preventDefault();
          var fieldset = btn.closest('fieldset.collapsible');
          if(!fieldset) return;
          var body = fieldset.querySelector('.collapse-body');
          if(!body) return;

          var isCollapsed = fieldset.classList.contains('collapsed');
          if(isCollapsed){
            // open
            fieldset.classList.remove('collapsed');
            btn.setAttribute('aria-expanded','true');
            body.classList.add('collapsing');
            body.style.maxHeight = '';
            var full = body.scrollHeight || 0;
            body.style.maxHeight = '0px';
            body.style.opacity = '0';
            requestAnimationFrame(function(){ body.style.maxHeight = full + 'px'; body.style.opacity = '1'; });
            body.addEventListener('transitionend', function te(ev){ if(ev.propertyName.indexOf('max-height')===-1) return; body.classList.remove('collapsing'); body.style.maxHeight = ''; body.removeEventListener('transitionend', te); });
          } else {
            // close
            fieldset.classList.add('collapsed');
            btn.setAttribute('aria-expanded','false');
            body.classList.add('collapsing');
            var full = body.scrollHeight || 0;
            body.style.maxHeight = full + 'px';
            requestAnimationFrame(function(){ body.style.maxHeight = '0px'; body.style.opacity = '0'; });
            body.addEventListener('transitionend', function te(ev){ if(ev.propertyName.indexOf('max-height')===-1) return; body.classList.remove('collapsing'); body.removeEventListener('transitionend', te); });
          }
        }catch(err){ /* ignore */ }
      });
    }

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

      // ...existing code...

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
  notesForReport = (_notes && includeNotesChecked) ? escapeHtml(_notes.value).replace(/\r?\n/g, '<br>') : '';
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
        ? state.ranges.map(function(item, idx){ var det = item.type==='amps' ? (fmtA(item.amps)+' A @ '+fmtA(item.voltage)+' V ('+fmtW(item.watts)+' W)') : (fmtW(item.watts)+' W'); return '<tr><td>'+ (idx + 1) + '. ' + escapeHtml(item.label) + '</td><td>' + escapeHtml(det) + '</td></tr>'; }).join(''
        )
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

    /* Light box for system notes for readability */
    .notes-box {
      background: #fbfcfe;
      border: 1px solid #e6ecf6;
      padding: 12px 14px;
      border-radius: 8px;
      color: #111;
      font-size: 0.95rem;
      line-height: 1.45;
      box-shadow: 0 6px 18px rgba(12,22,40,0.06);
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* Toolbar base styling */
    #report-toolbar { display: flex; align-items: center; gap: 8px; }
    #report-toolbar button { padding: 6px 10px; font-size: 0.95rem; border-radius: 6px; cursor: pointer; }

   /* PDF-mode (screen) styling: applied only when generating the PDF download
     This gives colored emphasis for the downloaded PDF while allowing
     @media print rules to force black-and-white for physical printing. */
   .pdf-mode .totals-highlight { color: #d9534f; background: rgba(217,83,79,0.08); }
   .pdf-mode .section-title { color: #2a5db0; }
   .pdf-mode .notes-box { background: #fff8e6; border-color: #f0e6c8; color: #222; }
   .pdf-mode .report-table th { background: #f1f8ff; }

    /* Make toolbar buttons larger and easier to tap on small screens */
    @media (max-width: 600px) {
      #report-toolbar { flex-direction: column; align-items: stretch; }
      /* override inline styles (padding/margin) so buttons expand on mobile */
      #report-toolbar button { padding: 12px 14px !important; font-size: 1.05rem !important; width: 100% !important; margin-right: 0 !important; }
    }

    @media print {
      /* Hide the toolbar when printing */
      #report-toolbar { display: none !important; }
      /* Ensure consistent page padding for printed output */
      /* Give pages a little extra top margin so headings aren't flush to the edge */
  /* Reduce top margin and remove extra body padding for print so pages aren't overly spaced */
  @page { margin: 0.9in 0.75in 0.6in 0.75in; }
    body { padding: 0; }
      /* Keep the report header compact on the first page */
      .report-header { page-break-inside: avoid; break-inside: avoid; margin-top: 0; padding-top: 0; }
      .report-header h1 { margin-top: 0; margin-bottom: 0.25rem; }
      .report-header .meta { margin-top: 0.05rem; }
  /* Ensure sensible automatic page breaks and avoid splitting rows/sections when possible */
  table { page-break-before: auto; page-break-after: auto; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  /* Avoid breaking inside table rows and key sections where possible */
  table, tbody, tr, td, th { page-break-inside: avoid; break-inside: avoid; }
  /* Allow table headers to repeat on each printed page (thead/tfoot shown above) */
  /* Prevent notes boxes from being split across pages; avoid splitting tables/rows.
    Do NOT force sections to start on their own page (that made the PDF very long). */
  .notes-box { page-break-inside: avoid; break-inside: avoid; }
  .report-section { /* prefer not to split a section, but do not force a page break */ page-break-inside: avoid; break-inside: avoid; }
  /* Keep the header meta block (inspection date + policy) together on the same page */
  .meta { page-break-inside: avoid; break-inside: avoid; }
  /* Avoid leaving a section heading alone at the bottom of a page */
  .section-title { page-break-after: avoid; break-after: avoid; }
  .section-title { orphans: 2; widows: 2; padding-bottom: 0.15rem; display: block; break-before: avoid; }
  /* Keep a section heading and its immediate content together when possible */
  .section-inner { page-break-inside: avoid; break-inside: avoid; padding-top: 0.6rem; }
  /* Wrap heading + content so they move as a single unit when printing */
  .section-block {
    display: table; width: 100%; margin-top: 0.25rem;
    -webkit-column-break-inside: avoid; -webkit-region-break-inside: avoid;
    page-break-inside: avoid; break-inside: avoid; break-after: avoid; page-break-after: avoid;
  }
  /* Optional dynamic page-break class (added by script when a section would be orphaned) */
  .page-break-before-if-needed { page-break-before: always; break-before: always; }
      /* Small tolerance for very long tables: prefer not to orphan a single row - keep at least 2 rows together */
      tr { orphans: 2; widows: 2; }
    }
        /* Strong black-and-white forcing for print: best-effort via CSS. Note: final
           output may still depend on the user's printer settings (some printers may
           ignore color-forcing). These rules remove background colors and convert
           imagery to greyscale so printed output is monochrome where possible. */
        @media print {
          /* Make all text black and remove colored backgrounds/shadows */
          * { color: #000 !important; background: transparent !important; background-color: transparent !important; box-shadow: none !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          /* Ensure tables and borders remain visible in black */
          th, td { color: #000 !important; background: transparent !important; border-color: #000 !important; }
          .notes-box { background: #fff !important; color: #000 !important; border-color: #000 !important; box-shadow: none !important; }
          .totals-highlight { color: #000 !important; font-weight: 700 !important; background: transparent !important; }
          img { filter: grayscale(100%) contrast(90%) !important; }
          a, .meta-label { color: #000 !important; }
        }
  </style>
</head>
<body>
  <!-- Centered A4-like sheet to give the report window a printed-page appearance -->
  <div id="report-toolbar" style="display:flex;justify-content:flex-end;padding:12px 32px;">
    <!-- toolbar buttons are added below inside the document body script; this is a placeholder for layout -->
  </div>

  <div class="sheet-viewport" style="display:flex;justify-content:center;padding:24px 20px;background:#efefef;min-height:100vh;box-sizing:border-box;">
    <div class="sheet" role="document" style="width:210mm;max-width:100%;background:#fff;box-shadow:0 12px 40px rgba(0,0,0,0.18);border:1px solid #ddd;padding:28mm 20mm;box-sizing:border-box;">
      <div class="report-header">
        <h1>Load Calculation Report</h1>
        <div class="meta">
          <div class="meta-item"><span class="meta-label">Inspection date:</span><span>${escapeHtml(inspectionDisplay)}</span></div>
          <div class="meta-item"><span class="meta-label">Policy:</span><span>${policyDisplay}</span></div>
        </div>
      </div>

    <section class="report-section">
      <div class="section-block">
        <div class="section-title">Area Summary</div>
        <div class="section-inner">
        <table class="report-table">
        <thead><tr><th scope="col">Item</th><th scope="col">Value</th></tr></thead>
        <tbody>
          ${areaRows.join('\n        ')}
        </tbody>
        </table>
        </div>
      </div>
    </section>

  <section class="report-section">
    <div class="section-block">
      <div class="section-title">Space Heating Loads</div>
      <div class="section-inner">
      <table class="report-table">
      <thead><tr><th scope="col">Entry</th><th scope="col">Details</th></tr></thead>
      <tbody>
        ${spaceHeatRows}
      </tbody>
      </table>
      </div>
    </div>
  </section>

  <section class="report-section">
    <div class="section-block">
      <div class="section-title">Air Conditioning Loads</div>
      <div class="section-inner">
      <table class="report-table">
      <thead><tr><th scope="col">Entry</th><th scope="col">Details</th></tr></thead>
      <tbody>
        ${airRows}
      </tbody>
      </table>
      </div>
    </div>
  </section>

  <section class="report-section">
    <div class="section-block">
      <div class="section-title">Cooking Ranges</div>
      <div class="section-inner">
      <table class="report-table">
      <thead><tr><th scope="col">Entry</th><th scope="col">Details</th></tr></thead>
      <tbody>
        ${rangeRows}
      </tbody>
      </table>
      </div>
    </div>
  </section>

  <section class="report-section">
    <div class="section-block">
      <div class="section-title">Water Heating</div>
      <div class="section-inner">
      <table class="report-table">
      <thead><tr><th scope="col">Item</th><th scope="col">Details</th></tr></thead>
      <tbody>
        ${tanklessRow || ''}
        ${storageRow || ''}
        ${specialWaterRows}
      </tbody>
      </table>
      </div>
    </div>
  </section>

  <section class="report-section">
    <div class="section-block">
      <div class="section-title">Other Fixed Appliances ≥ 1500 W</div>
      <div class="section-inner">
      <table class="report-table">
      <thead><tr><th scope="col">Entry</th><th scope="col">Nameplate</th></tr></thead>
      <tbody>
        ${appliancesRows}
      </tbody>
      </table>
      </div>
    </div>
  </section>

  <section class="report-section">
    <div class="section-block">
      <div class="section-title">Electric Vehicle Charging</div>
      <div class="section-inner">
      <table class="report-table">
      <thead><tr><th scope="col">Detail</th><th scope="col">Value</th></tr></thead>
      <tbody>
        <tr><td>Chargers installed</td><td>${snapshot.loads.evseCount}</td></tr>
        <tr><td>Per charger rating</td><td>${fmtW(snapshot.loads.evseWatts)} W</td></tr>
        <tr><td>Energy management (EVEMS)</td><td>${evemsLabel}</td></tr>
        <tr><td>Demand included</td><td>${fmtW(snapshot.loads.evseDemandW)} W</td></tr>
      </tbody>
      </table>
      </div>
    </div>
  </section>

  <section class="report-section">
    <div class="section-block">
      <div class="section-title">Demand Summary</div>
      <div class="section-inner">
      <table class="totals-table report-table">
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
      </div>
    </div>
  </section>

  <div class="notes">
    Report generated on ${escapeHtml(new Date().toLocaleString())}.
  </div>
  
  ${ notesForReport ? ('<section class="report-section"><div class="section-title">System notes</div><div class="notes-box">' + notesForReport + '</div></section>') : '' }

      <div style="margin-top:12px;">
        <div id="reportStatus" style="margin-left:12px;font-size:.95rem;color:#333"></div>
      </div>
    </div> <!-- /.sheet -->
  </div> <!-- /.sheet-viewport -->

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
      // Heuristic: mark sections that would otherwise be orphaned.
      // We'll compute visible page height and add a helper class to force a page break
      // before any .report-section whose top is within the bottom N pixels.
      function markOrphanSectionsIfNeeded(){
        try{
          // Clear any previous markers
          var prev = document.querySelectorAll('.page-break-before-if-needed');
          for(var i=0;i<prev.length;i++) prev[i].classList.remove('page-break-before-if-needed');
          var pageHeight = window.innerHeight || document.documentElement.clientHeight || 1122; // fallback
          // Conservative threshold (in pixels) from bottom of page where a heading would be orphaned
          // Lowered to 110 to reduce chances of creating a near-empty first page.
          var threshold = 110;
          var sections = document.querySelectorAll('.report-section');
          for(var i=0;i<sections.length;i++){
            // Never force a page-break-before for the very first section (keeps title + meta on page 1)
            if(i===0) continue;
            var rect = sections[i].getBoundingClientRect();
            // If the section top falls within the last threshold px of the page, mark it
            if(rect.top > 0 && rect.top >= (pageHeight - threshold)){
              sections[i].classList.add('page-break-before-if-needed');
            }
          }
        }catch(e){ /* ignore measurement errors */ }
      }
      loadHtml2Pdf(function(err){
        if(err){ console.warn('html2pdf load failed', err); if(toolbar) toolbar.style.display = prevDisplay || ''; setStatus('Could not load PDF library; opening print dialog.'); window.print(); return; }
        try{
          // Try to mark orphan-prone sections before rendering PDF
          markOrphanSectionsIfNeeded();
          // Add a temporary class so the screen/PDF rendering can show color
          // emphasis while the @media print rules below will still force
          // black-and-white when the user actually prints the document.
          try{ document.documentElement.classList.add('pdf-mode'); }catch(e){}

          // Prefer rendering the .sheet element so html2pdf captures the A4 page only
          var sheetEl = document.querySelector('.sheet') || document.body;
          html2pdf().set({ filename: filename, pagebreak: { mode: 'css', avoid: ['.report-table', '.notes-box', 'tr', '.section-block'] } }).from(sheetEl).save().then(function(){
            setStatus('Download started');
            try{ document.documentElement.classList.remove('pdf-mode'); }catch(e){}
            if(toolbar) toolbar.style.display = prevDisplay || '';
          }).catch(function(err){
            console.warn('html2pdf failed', err);
            try{ document.documentElement.classList.remove('pdf-mode'); }catch(e){}
            if(toolbar) toolbar.style.display = prevDisplay || '';
            setStatus('PDF generation failed; opening print dialog.');
            window.print();
          });
        }catch(e){ console.warn(e); if(toolbar) toolbar.style.display = prevDisplay || ''; setStatus('PDF generation error; opening print dialog.'); window.print(); }
      });
    }

    // Create toolbar buttons dynamically (they live outside the .sheet so printing the sheet
    // doesn't include the controls). This makes the report window look like a physical page.
    (function createToolbar(){
      try{
        var toolbar = document.getElementById('report-toolbar');
        if(!toolbar){
          toolbar = document.createElement('div');
          toolbar.id = 'report-toolbar';
          document.body.insertBefore(toolbar, document.body.firstChild);
        }
        toolbar.style.display = 'flex';
        toolbar.style.gap = '8px';
        toolbar.style.alignItems = 'center';

        var downloadBtn = document.createElement('button');
        downloadBtn.id = 'downloadPdf';
        downloadBtn.textContent = 'Download PDF';
        downloadBtn.style.padding = '8px 12px';
        downloadBtn.addEventListener('click', function(){ doDownload(); });

        var printBtn = document.createElement('button');
        printBtn.id = 'printBtn';
        printBtn.textContent = 'Print';
        printBtn.style.padding = '8px 12px';
        printBtn.addEventListener('click', function(){ setStatus('Opening print dialog...'); setTimeout(function(){ window.print(); }, 50); });

        var closeBtn = document.createElement('button');
        closeBtn.id = 'closeBtn';
        closeBtn.textContent = 'Close';
        closeBtn.style.padding = '8px 12px';
        closeBtn.addEventListener('click', function(){ try{ window.close(); }catch(e){ /* ignore */ } });

        // Insert toolbar controls (left-aligned by default) and keep status to the right
        toolbar.appendChild(downloadBtn);
        toolbar.appendChild(printBtn);
        toolbar.appendChild(closeBtn);

        // move the status element into the toolbar on the right
        if(statusEl){
          statusEl.style.marginLeft = '12px';
          toolbar.appendChild(statusEl);
        }
      }catch(e){ /* ignore toolbar creation errors */ }
    })();

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
  // Ensure range input mode is initialized
  try{ if(typeof updateRangeInputMode === 'function') updateRangeInputMode(); }catch(e){}
  var rangeTypeEl = document.getElementById('rangeType'); if(rangeTypeEl){ rangeTypeEl.addEventListener('change', updateRangeInputMode); }
        renderAllLists();
  try{ setupSpaceTabOrder(); }catch(e){}
  try{ setupEnterToAdd(); }catch(e){}
        // Initialize the sticky Watts calculator
        try{ setupWattsCalc(); }catch(e){ /* ignore if elements missing */ }
        calculate();
      }

    // Ensure keyboard tab order inside Space Conditioning follows: Name -> Value -> Voltage -> Type
    function setupSpaceTabOrder(){
      try{
        var mapping = [
          ['spaceHeatName','spaceHeatValue','spaceHeatVoltage','spaceHeatType'],
          ['airCondName','airCondValue','airCondVoltage','airCondType']
        ];
        var base = 10; // start tab index at 10 to avoid interfering with other controls that may be implicitly ordered
        mapping.forEach(function(ids){
          ids.forEach(function(id, idx){
            var el = document.getElementById(id);
            if(!el) return;
            el.tabIndex = base + idx; // name=10, value=11, voltage=12, type=13
          });
          base += 10; // next group starts further to keep groups separated
        });
      }catch(e){ /* no-op if DOM not ready */ }
    }

    // Allow pressing Enter in a watts/value input to act like clicking the corresponding Add button.
    function setupEnterToAdd(){
      try{
        var mapping = [
          { id: 'spaceHeatValue', fn: addSpaceHeat, focusId: 'spaceHeatName' },
          { id: 'airCondValue', fn: addAirCond, focusId: 'airCondName' },
          { id: 'rangeValue', fn: addRange, focusId: 'rangeName' },
          { id: 'specialWaterValue', fn: addSpecialWater, focusId: 'specialWaterName' },
          { id: 'applianceWatts', fn: addAppliance, focusId: 'applianceName' }
        ];
        mapping.forEach(function(m){
          var el = document.getElementById(m.id);
          if(!el) return;
          el.addEventListener('keydown', function(e){
            if(!e) return;
            if(e.key === 'Enter' || e.keyCode === 13){
              e.preventDefault();
              try{ m.fn(); }catch(err){ console.warn('Enter-to-add failed for', m.id, err); }
              try{
                if(m.focusId){
                  var tgt = document.getElementById(m.focusId);
                  if(tgt && typeof tgt.focus === 'function') tgt.focus();
                }
              }catch(_){ /* ignore focus errors */ }
            }
          });
        });
      }catch(e){ /* ignore setup errors */ }
    }
      if(document.readyState === 'loading'){
        document.addEventListener('DOMContentLoaded', doInit);
      } else {
        doInit();
      }
    })();

    var reportBtn = $('reportBtn'); if(reportBtn) reportBtn.addEventListener('click', function(e){ e.preventDefault(); generateReport(); });
    var detailedBreakdownBtn = $('detailedBreakdownBtn'); if(detailedBreakdownBtn) detailedBreakdownBtn.addEventListener('click', function(e){ e.preventDefault(); showDetailedBreakdown(); });
  // Make Save/Load behave as Export/Import to keep only two actions
  var shareDraftBtn = $('shareDraftBtn');
  if(shareDraftBtn){
    shareDraftBtn.addEventListener('click', function(e){
      try{ console.log('[UI] shareDraftBtn clicked'); }catch(_){}
      e.preventDefault();
      try{ shareDraft(); }catch(err){ console.warn('shareDraft() failed to run', err); }
    });
  }
  // Delegated fallback: catch clicks on the document in case the element wasn't present
  // when the above wiring ran (defensive). This will also help diagnostics.
  document.addEventListener('click', function(e){
    try{
      var t = e && e.target;
      if(!t) return;
      if(t.id === 'shareDraftBtn' || (t.closest && t.closest('#shareDraftBtn'))){
        try{ console.log('[UI-delegated] shareDraftBtn clicked (delegated)'); }catch(_){}
        e.preventDefault();
        try{ shareDraft(); }catch(err){ console.warn('shareDraft() failed in delegated handler', err); }
      }
    }catch(_){ /* ignore */ }
  });
  var loadDraftBtn = $('loadDraftBtn'); if(loadDraftBtn) loadDraftBtn.addEventListener('click', function(e){ e.preventDefault(); importDraft(); });
    var addSpaceHeatBtn = $('addSpaceHeat'); if(addSpaceHeatBtn) addSpaceHeatBtn.addEventListener('click', function(e){ e.preventDefault(); addSpaceHeat(); });
    var addAirCondBtn = $('addAirCond'); if(addAirCondBtn) addAirCondBtn.addEventListener('click', function(e){ e.preventDefault(); addAirCond(); });
    var addRangeBtn = $('addRange'); if(addRangeBtn) addRangeBtn.addEventListener('click', function(e){ e.preventDefault(); addRange(); });
    var addSpecialWaterBtn = $('addSpecialWater'); if(addSpecialWaterBtn) addSpecialWaterBtn.addEventListener('click', function(e){ e.preventDefault(); addSpecialWater(); });
    var addApplianceBtn = $('addAppliance'); if(addApplianceBtn) addApplianceBtn.addEventListener('click', function(e){ e.preventDefault(); addAppliance(); });

    var calcForm = $('calcForm');
    if(calcForm){
      calcForm.addEventListener('input', function(e){
        // mark dirty only for trusted user input events
        try{ if(e && e.isTrusted) isDirty = true; }catch(err){}
  var id = e && e.target && e.target.id;
  var instant = [ 'groundUpperArea','basementArea','spaceHeatName','spaceHeatType','spaceHeatValue','spaceHeatVoltage','airCondName','airCondType','airCondValue','airCondVoltage','rangeName','rangeValue','specialWaterName','specialWaterType','specialWaterValue','specialWaterVoltage','interlock','tanklessWatts','storageWHWatts','evseCount','evseWatts','evems','applianceWatts','applianceName' ].indexOf(id) !== -1;
  if(instant) calculate();
  if(id === 'spaceHeatType') updateSpaceHeatInputMode();
  if(id === 'airCondType') updateAirCondInputMode();
  if(id === 'rangeType') updateRangeInputMode();
  if(id === 'specialWaterType') updateSpecialWaterInputMode();
      });
    }

    // Draft management (localStorage)
    function _serializeForm(){
      var obj = {};
      // simple input values
      ['inspectionDate','policyNumber','groundUpperArea','basementArea','tanklessWatts','storageWHWatts','evseCount','evseWatts','interlock'].forEach(function(id){ var el=$(id); obj[id] = el ? el.value : ''; });
      // arrays / lists
      obj.state = { appliances: state.appliances.slice(), spaceHeat: state.spaceHeat.slice(), airCond: state.airCond.slice(), ranges: state.ranges.slice(), specialWater: state.specialWater.slice() };
      // area dimension inputs
      ['groundUpperLength','groundUpperWidth','basementLength','basementWidth'].forEach(function(id){ var el=$(id); obj[id] = el ? el.value : ''; });
      // notes and toggle
      var notesEl = $('systemNotes'); obj.systemNotes = notesEl ? notesEl.value : '';
      var includeEl = $('includeNotes'); obj.includeNotes = includeEl ? !!includeEl.checked : false;
      return obj;
    }

    function _applyForm(obj){
      if(!obj) return;
      ['inspectionDate','policyNumber','groundUpperArea','basementArea','tanklessWatts','storageWHWatts','evseCount','evseWatts','interlock'].forEach(function(id){ var el=$(id); if(el) el.value = obj[id] || ''; });
      ['groundUpperLength','groundUpperWidth','basementLength','basementWidth'].forEach(function(id){ var el=$(id); if(el) el.value = obj[id] || ''; });
      // restore lists
      state.appliances = (obj.state && obj.state.appliances) ? obj.state.appliances.slice() : [];
      state.spaceHeat = (obj.state && obj.state.spaceHeat) ? obj.state.spaceHeat.slice() : [];
      state.airCond = (obj.state && obj.state.airCond) ? obj.state.airCond.slice() : [];
      state.ranges = (obj.state && obj.state.ranges) ? obj.state.ranges.slice() : [];
      state.specialWater = (obj.state && obj.state.specialWater) ? obj.state.specialWater.slice() : [];
      var notesEl = $('systemNotes'); if(notesEl) notesEl.value = obj.systemNotes || '';
      var includeEl = $('includeNotes'); if(includeEl) includeEl.checked = !!obj.includeNotes;
      renderAllLists(); updateSpaceHeatInputMode(); updateAirCondInputMode(); setTimeout(calculate,50);
    }

    function saveDraft(){
      try{
        var inspectionEl = $('inspectionDate');
        var policyEl = $('policyNumber');
        var inspectionValue = inspectionEl ? inspectionEl.value : '';
        var policyValue = policyEl ? policyEl.value.trim() : '';
        var datePart = inspectionValue || (new Date()).toISOString().slice(0,10);
        var defaultName = (policyValue || 'Policy') + ' - Load Test - ' + datePart;
        var key = 'cec-drafts';
        var store = JSON.parse(localStorage.getItem(key) || '{}');
        var name = prompt('Save draft as (enter a short name):', defaultName);
        if(!name) return; name = name.trim(); if(!name) return;
        if(store[name] && !confirm('A draft named "' + name + '" already exists. Overwrite?')) return;
        store[name] = { saved: new Date().toISOString(), data: _serializeForm() };
        localStorage.setItem(key, JSON.stringify(store));
        alert('Draft saved: ' + name);
      }catch(e){ console.warn(e); alert('Failed to save draft.'); }
    }

    function loadDraft(){
      try{
        var key = 'cec-drafts';
        var store = JSON.parse(localStorage.getItem(key) || '{}');
        var names = Object.keys(store);
        if(names.length === 0){ alert('No drafts saved.'); return; }
        var choice = prompt('Available drafts:\n' + names.join('\n') + '\n\nEnter exact name to load:');
        if(!choice) return; choice = choice.trim(); if(!store[choice]){ alert('No draft found with that name.'); return; }
        if(!confirm('Replace current form with draft "' + choice + '"?')) return;
        _applyForm(store[choice].data);
        alert('Draft loaded: ' + choice);
      }catch(e){ console.warn(e); alert('Failed to load draft.'); }
    }

    // newDraft removed: Reset button is the canonical way to start a new draft

    async function exportDraft(){
      try{
        var obj = _serializeForm();
        var inspectionEl = $('inspectionDate');
        var policyEl = $('policyNumber');
        var inspectionValue = inspectionEl ? inspectionEl.value : '';
        var policyValue = policyEl ? policyEl.value.trim() : '';
        var datePart = inspectionValue || (new Date()).toISOString().slice(0,10);
        var defaultName = (policyValue || 'Policy') + ' - Load Test - ' + datePart + '.json';
  var payload = JSON.stringify({ meta: { exported: new Date().toISOString() }, data: obj }, null, 2);
  var jsonBlob = new Blob([payload], { type: 'application/json' });
  var txtBlob = new Blob([payload], { type: 'text/plain' });
  // keep 'blob' name for existing save-file-picker usage (use JSON by default)
  var blob = jsonBlob;
  // track whether the user explicitly attempted sharing so we can choose .txt fallback
  var shareAttempted = false;

        // Prefer the File System Access API to prompt the user for a save location
        if(window.showSaveFilePicker){
          try{
            var opts = {
              suggestedName: defaultName,
              types: [{ description: 'JSON file', accept: { 'application/json': ['.json'] } }]
            };
            try{
              var handle = await window.showSaveFilePicker(opts);
              var writable = await handle.createWritable();
              await writable.write(blob);
              await writable.close();
              alert('Draft saved.');
              return;
            }catch(err){
              // If the user cancelled the picker, don't fall back to an automatic download
              if(err && (err.name === 'AbortError' || err.name === 'NotAllowedError')){
                try{ console.debug('User cancelled save picker'); }catch(e){}
                alert('Save cancelled');
                return;
              }
              try{ console.debug('showSaveFilePicker failed, will try share/fallback:', err); }catch(e){}
              // otherwise fall through to share/anchor fallback
            }
          }catch(e){ /* continue to other fallbacks */ }
        }

        // Try Web Share API with files (share sheet may include OneDrive or cloud targets).
        // Use a text/plain variant (.txt) as some share targets handle plain text more reliably than application/json.
        try{
          var shareNameTxt = defaultName.replace(/\.json$/i, '.txt');
          var fileForShareTxt = new File([payload], shareNameTxt, { type: 'text/plain' });
          // Also prepare a JSON-typed file in case targets prefer explicit JSON
          var fileForShareJson = new File([blob], defaultName, { type: 'application/json' });
          if(navigator.canShare && navigator.share){
            var useShare = confirm('Open the system Share sheet to save or send this draft? Some apps (OneDrive) can appear here. Choose "OK" to open Share, "Cancel" to download instead.');
            var shareAttempted = false;
            if(useShare){
              shareAttempted = true;
              try{
                // Try plain-text first for better compatibility with cloud storage targets
                if(navigator.canShare({ files: [fileForShareTxt] })){
                  await navigator.share({ files: [fileForShareTxt], title: shareNameTxt });
                  try{ console.debug('[exportDraft] share succeeded (txt)'); }catch(e){}
                  return;
                }
                // Fallback to JSON-typed file if plain-text isn't accepted
                if(navigator.canShare({ files: [fileForShareJson] })){
                  await navigator.share({ files: [fileForShareJson], title: defaultName });
                  try{ console.debug('[exportDraft] share succeeded (json)'); }catch(e){}
                  return;
                }
                try{ console.debug('[exportDraft] navigator.canShare returned false for both variants'); }catch(e){}
              }catch(shareErr){
                try{ console.debug('share failed or cancelled, will fallback to download (txt) — error:', shareErr); }catch(e){}
                alert('Share was cancelled or failed — the draft will be downloaded instead (as .txt for broader compatibility).');
              }
            }
          }
        }catch(e){ /* ignore share errors */ }

        // Final fallback: trigger a download via an anchor (works universally)
        try{
          var chosenBlob = shareAttempted ? txtBlob : jsonBlob;
          var chosenName = shareAttempted ? defaultName.replace(/\.json$/i, '.txt') : defaultName;
          var url = URL.createObjectURL(chosenBlob);
          var a = document.createElement('a'); a.href = url; a.download = chosenName; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 5000);
        }catch(e){ console.warn('fallback download failed', e); }
      }catch(e){ console.warn(e); alert('Export failed'); }
    }

    // Share the current draft via the Web Share API (prefer text/plain). Falls back to download if share isn't available.
    async function shareDraft(){
      try{
        var obj = _serializeForm();
        var payload = JSON.stringify({ meta: { exported: new Date().toISOString() }, data: obj }, null, 2);
  // Build filename using policy and inspection date to match export behavior
  var inspectionEl = document.getElementById('inspectionDate');
  var policyEl = document.getElementById('policyNumber');
  var inspectionValue = inspectionEl ? inspectionEl.value : '';
  var policyValue = policyEl ? (policyEl.value || '').trim() : '';
  var datePart = inspectionValue || (new Date()).toISOString().slice(0,10);
  var defaultName = (policyValue || 'Policy') + ' - Load Test - ' + datePart + '.txt';
  var filename = defaultName;
        var text = payload;

  console.debug('shareDraft: preparing share', { filename });
  
  // Detect if we're on a desktop/PC environment
  var isDesktop = !navigator.userAgent.match(/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i);
  var isShareSupported = navigator.share && navigator.canShare;
  
  // On desktop or when share API is not properly supported, go directly to download
  if(isDesktop || !isShareSupported) {
    try{ showToast('Downloading draft file...', 2200); }catch(e){}
    console.debug('shareDraft: using download fallback for desktop');
    var blob = new Blob([text], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); 
    a.href = url; 
    a.download = filename; 
    a.style.display = 'none';
    document.body.appendChild(a); 
    a.click(); 
    setTimeout(function(){ 
      URL.revokeObjectURL(url); 
      a.remove(); 
      try{ showToast('Draft saved as ' + filename, 3000); }catch(e){}
    }, 100);
    return { method: 'download', fileType: 'text' };
  }

  try{ showToast('Opening share sheet…', 3000); }catch(e){}

        // For mobile devices, try Web Share API
        try{
          if(navigator.canShare && navigator.share){
            var file = new File([text], filename, { type: 'text/plain' });
            if(navigator.canShare({ files: [file] })){
              await navigator.share({ files: [file], title: 'CEC Draft' });
              console.debug('shareDraft: share() succeeded with file');
              try{ showToast('Shared to app (choose OneDrive if available)', 2500); }catch(e){}
              return { method: 'share', fileType: 'text' };
            }
          }
          // Some platforms allow share with text payload only
          if(navigator.share){
            try{ await navigator.share({ title: 'CEC Draft', text: text }); console.debug('shareDraft: share() succeeded with text payload'); try{ showToast('Shared text to app',2000); }catch(e){}; return { method: 'share', fileType: 'text' }; }catch(e){ console.debug('shareDraft: share(text) rejected', e); }
          }
        }catch(e){ console.debug('shareDraft: navigator.share/canShare threw', e); }

        // Final fallback: download .txt
  console.debug('shareDraft: falling back to download');
  try{ showToast('Downloading draft as .txt', 2200); }catch(e){}
        var blob = new Blob([text], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 5000);
        return { method: 'download', fileType: 'text' };
      }catch(err){ console.debug('shareDraft: unexpected error', err); return { method: 'error', error: err }; }
    }

    function importDraft(){
      try{
        var input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
        input.addEventListener('change', function(evt){
          var file = input.files && input.files[0]; if(!file) return; var reader = new FileReader();
          reader.onload = function(){ try{ var parsed = JSON.parse(reader.result); var data = parsed && parsed.data ? parsed.data : parsed; if(!confirm('Load imported draft and replace current form?')) return; _applyForm(data); alert('Imported draft applied.'); }catch(e){ console.warn(e); alert('Invalid draft file.'); } };
          reader.readAsText(file);
        });
        input.click();
      }catch(e){ console.warn(e); alert('Import failed'); }
    }

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

      // Service worker update handling: show in-app banner when a new version is available
      function showUpdateBanner(){
        var banner = document.getElementById('updateBanner');
        if(!banner) return;
        banner.hidden = false;
        // trigger entrance animation
        requestAnimationFrame(function(){
          banner.classList.add('show');
        });
        var reloadBtn = document.getElementById('reloadApp');
        var dismissBtn = document.getElementById('dismissUpdate');
        if(reloadBtn) reloadBtn.addEventListener('click', function(){
          // When the user clicks reload, ask the SW to skipWaiting and show a spinner
          try{
            if(reloadBtn.classList) reloadBtn.classList.add('loading');
            if(dismissBtn) dismissBtn.disabled = true;

            // Prefer messaging the waiting worker directly (swReg is set after registration)
            try{
              if(typeof console !== 'undefined' && console.debug) console.debug('[SW] reload clicked - attempting to post SKIP_WAITING');
              if(window.swReg && window.swReg.waiting && typeof window.swReg.waiting.postMessage === 'function'){
                if(typeof console !== 'undefined' && console.debug) console.debug('[SW] posting SKIP_WAITING to waiting worker');
                window.swReg.waiting.postMessage({ type: 'SKIP_WAITING' });
              } else if(navigator.serviceWorker && navigator.serviceWorker.controller){
                if(typeof console !== 'undefined' && console.debug) console.debug('[SW] posting SKIP_WAITING to controller (fallback)');
                navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
              } else {
                if(typeof console !== 'undefined' && console.debug) console.debug('[SW] no waiting worker or controller to message');
              }
            }catch(e){
              try{ if(navigator.serviceWorker && navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' }); }catch(_){}
            }

            // Wait for controllerchange to reload, but keep a fallback to stop spinner and hide the banner
            var reloaded = false;
            function onControllerChange(){
              if(reloaded) return;
              reloaded = true;
              try{ var b = document.getElementById('updateBanner'); if(b){ b.classList.remove('show'); setTimeout(function(){ b.hidden = true; }, 220); } }catch(e){}
              try{ window.location.reload(true); }catch(e){}
            }
            navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

            // fallback: after 12s stop spinner, re-enable dismiss and hide banner (do not force reload)
            setTimeout(function(){ if(!reloaded){ try{ if(reloadBtn) reloadBtn.classList.remove('loading'); if(dismissBtn) dismissBtn.disabled = false; var b = document.getElementById('updateBanner'); if(b){ b.classList.remove('show'); setTimeout(function(){ b.hidden = true; }, 220); } }catch(e){} } }, 12000);
          }catch(e){ /* ignore */ }
        });
        if(dismissBtn) dismissBtn.addEventListener('click', function(){ banner.classList.remove('show'); setTimeout(function(){ banner.hidden = true; }, 220); });
      }

      // Listen for messages from the SW and trigger an automatic update
      if('serviceWorker' in navigator){
        navigator.serviceWorker.addEventListener('message', function(evt){
          try{
            var data = evt && evt.data ? evt.data : {};
            if(data.type === 'NEW_VERSION_AVAILABLE'){
              // Show the banner and let the user click Reload to apply the update
              try{
                showUpdateBanner();
              }catch(e){ /* ignore */ }
            }
            // Handle skipWaiting acknowledgements so we can stop spinner early
            if(data.type === 'SKIP_WAITING_ACK'){
              try{ var reloadBtn = document.getElementById('reloadApp'); if(reloadBtn) reloadBtn.classList.remove('loading'); }catch(e){}
            }
            if(data.type === 'SKIP_WAITING_DONE'){
              try{
                var b = document.getElementById('updateBanner');
                if(b){ b.classList.remove('show'); setTimeout(function(){ b.hidden = true; }, 220); }
                // Force-refresh CSS to pull the newest styles without a full reload
                try{
                  if(typeof console !== 'undefined' && console.debug) console.debug('[SW] SKIP_WAITING_DONE received - refreshing stylesheets');
                  var links = document.querySelectorAll('link[rel="stylesheet"]');
                  var stamp = Date.now();
                  Array.prototype.forEach.call(links, function(link){
                    try{
                      var href = link.getAttribute('href') || '';
                      var base = href.split('?')[0];
                      link.setAttribute('href', base + '?v=' + stamp);
                    }catch(e){}
                  });
                }catch(e){}
              }catch(e){}
            }
          }catch(e){ /* ignore */ }
        });
      }

      // Register service worker and handle update lifecycle to show banner when a new
      // service worker is waiting to activate. This ensures installed PWAs (Android)
      // are notified when a new version is available.
      // Keep a reference to the active registration so we can message waiting worker directly
      var swReg = null;
      // Version display helper: update the footer version text
      function setAppVersion(ver){
        try{
          var el = document.getElementById('appVersion');
          if(el){ el.textContent = 'v' + String(ver); }
        }catch(e){}
      }
      // Expose a simple global setter so you can change major/minor/patch from the console or other scripts
      try{ window.setAppVersion = setAppVersion; }catch(e){}
      // Initialize version (patch-level increments should update the third number)
  try{ setAppVersion('1.2.1'); }catch(e){}
      if('serviceWorker' in navigator){
        // Register on load to avoid blocking initial parsing
        window.addEventListener('load', function(){
          navigator.serviceWorker.register('service-worker.js').then(function(reg){
            swReg = reg;
            try{ window.swReg = reg; }catch(e){}
            try{ console.debug('[SW] registered:', reg.scope); }catch(e){}
            // Force an update check immediately so installed PWAs fetch the latest SW
            try{ if(typeof reg.update === 'function'){ reg.update(); console.debug('[SW] called reg.update() to check for new SW'); } }catch(e){ console.debug('[SW] reg.update() failed', e); }

              // Also perform a content-level check for key assets so we can
              // show the banner when any asset (HTML/CSS/JS/manifest) changes
              // even if the service worker script itself did not change.
              (function(){
                async function sha256Hex(text){
                  try{
                    var enc = new TextEncoder().encode(text);
                    var buf = await (window.crypto && window.crypto.subtle ? crypto.subtle.digest('SHA-256', enc) : Promise.reject('no-subtle'));
                    var hashArray = Array.from(new Uint8Array(buf));
                    return hashArray.map(b=>b.toString(16).padStart(2,'0')).join('');
                  }catch(e){ return null; }
                }
                async function fetchAndHash(url){
                  try{
                    var r = await fetch(url, { cache: 'no-cache', credentials: 'same-origin' });
                    if(!r || !r.ok) return null;
                    var txt = await r.text();
                    var h = await sha256Hex(txt);
                    return { url: url.split('?')[0], hash: h };
                  }catch(e){ return null; }
                }
                async function checkForAssetUpdates(){
                  try{
                    var assets = ['index.html','app.js','style.css','manifest.json'];
                    var results = await Promise.all(assets.map(function(a){ return fetchAndHash(a); }));
                    var prev = {};
                    try{ prev = JSON.parse(localStorage.getItem('assetHashMap') || '{}'); }catch(e){ prev = {}; }
                    var newMap = {};
                    var changed = false;
                    results.forEach(function(r){ if(!r) return; newMap[r.url] = r.hash; if(prev[r.url] && prev[r.url] !== r.hash) changed = true; });
                    try{ localStorage.setItem('assetHashMap', JSON.stringify(newMap)); }catch(e){}
                    if(changed){ try{ console.debug('[assets] change detected, showing update banner'); showUpdateBanner(); }catch(e){} }
                  }catch(e){ /* ignore */ }
                }
                // Run asset check asynchronously but don't block registration
                try{ checkForAssetUpdates().catch(function(){}); }catch(e){}
              })();
            // Helper to auto-apply the waiting SW (post SKIP_WAITING to the waiting worker if available)
            function autoApplyUpdate(){
              try{
                var reloadBtn = document.getElementById('reloadApp');
                var dismissBtn = document.getElementById('dismissUpdate');
                if(reloadBtn) reloadBtn.classList.add('loading');
                if(dismissBtn) dismissBtn.disabled = true;
                // Prefer messaging the waiting worker directly
                try{
                  if(swReg && swReg.waiting && typeof swReg.waiting.postMessage === 'function'){
                    swReg.waiting.postMessage({ type: 'SKIP_WAITING' });
                  } else if(navigator.serviceWorker && navigator.serviceWorker.controller){
                    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
                  }
                }catch(e){
                  if(navigator.serviceWorker && navigator.serviceWorker.controller){
                    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
                  }
                }

                // Wait for controllerchange to reload, but don't leave spinner forever
                var reloaded = false;
                function onControllerChange(){ if(reloaded) return; reloaded = true; try{ 
                  // hide the banner gracefully before reload
                  try{ var b = document.getElementById('updateBanner'); if(b){ b.classList.remove('show'); setTimeout(function(){ b.hidden = true; }, 220); } }catch(e){}
                  window.location.reload(true);
                }catch(e){} }
                navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
                // fallback: after 12s stop the spinner, re-enable dismiss and hide banner
                setTimeout(function(){ if(!reloaded){ try{ if(reloadBtn) reloadBtn.classList.remove('loading'); if(dismissBtn) dismissBtn.disabled = false; var b = document.getElementById('updateBanner'); if(b){ b.classList.remove('show'); setTimeout(function(){ b.hidden = true; }, 220); } }catch(e){} } }, 12000);
              }catch(e){}
            }

            // If there's an active waiting worker, decide whether to show the banner or auto-apply
            if(reg.waiting){
              try{
                if(isStandalone() || isDirty){
                  showUpdateBanner();
                } else {
                  // Auto-apply for web tabs with no unsaved changes
                  autoApplyUpdate();
                }
              }catch(e){}
            }

            // When an update is found, listen for state changes on the new worker
            reg.addEventListener('updatefound', function(){
              var newSW = reg.installing;
              if(!newSW) return;
              newSW.addEventListener('statechange', function(){
                if(newSW.state === 'installed'){
                  // If there's a controller, it means there's an active SW and the new one is waiting
                  if(navigator.serviceWorker.controller){
                    try{
                              if(isStandalone() || isDirty){
                                showUpdateBanner();
                              } else {
                                autoApplyUpdate();
                              }
                    }catch(e){}
                  }
                }
              });
            });

            // Listen for controllerchange to reload when the user triggers skipWaiting
            navigator.serviceWorker.addEventListener('controllerchange', function(){
              // The page will reload when the user clicks Reload (we already wire this in showUpdateBanner)
            });

          }).catch(function(err){ /* ignore registration errors */ });
          // Also attempt to update any existing registration (fallback)
          try{
            if(navigator.serviceWorker && navigator.serviceWorker.getRegistration){
              navigator.serviceWorker.getRegistration().then(function(r){ if(r && typeof r.update === 'function'){ r.update().catch(function(){/* ignore */}); } }).catch(function(){/* ignore */});
            }
          }catch(e){}
        });
      }

  // Detailed breakdown window function
  function showDetailedBreakdown(){
    if(!lastCalcSnapshot) calculate();
    var snapshot = lastCalcSnapshot;
    if(!snapshot){ alert('Please calculate the load before generating the breakdown.'); return; }
    
    var breakdownWindow = window.open('', '_blank');
    
    if(!breakdownWindow){
      alert('Please allow pop-ups to view the detailed breakdown.');
      return;
    }
    
    var inspectionEl = $('inspectionDate');
    var policyEl = $('policyNumber');
    var inspectionValue = inspectionEl ? inspectionEl.value : '';
    var policyValue = policyEl ? policyEl.value.trim() : '';
    var inspectionDisplay = formatInspectionDate(inspectionValue) || 'Not provided';
    var policyDisplay = policyValue ? escapeHtml(policyValue) : 'Not provided';
    
    var breakdownHtml = generateBreakdownHTML(snapshot, inspectionDisplay, policyDisplay);
    
    breakdownWindow.document.open();
    breakdownWindow.document.write(breakdownHtml);
    breakdownWindow.document.close();
    breakdownWindow.focus();
  }

  function generateBreakdownHTML(snapshot, inspectionDisplay, policyDisplay){
    function fmtW(n){ return new Intl.NumberFormat().format(Math.round(n)); }
    function fmtA(n){ return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n); }
    
    var breakdownContent = generateBreakdownContent(snapshot);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Load Calculation Breakdown</title>
  <style>
    :root {
      --bg: #0b1426;
      --bg-elevated: #172448;
      --bg-card: #1b2d55;
      --text: #f2f6ff;
      --text-muted: #a9b9da;
      --accent: #3d9bff;
      --accent-secondary: #9a6bff;
      --border: rgba(255,255,255,0.08);
      --radius: 14px;
      --shadow: 0 20px 50px rgba(4, 15, 40, 0.45);
    }
    
    * { box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem;
      line-height: 1.6;
      font-size: 16px;
    }
    
    .breakdown-container {
      max-width: 1000px;
      margin: 0 auto;
      background: var(--bg-card);
      border-radius: var(--radius);
      padding: 2rem;
      box-shadow: var(--shadow);
    }
    
    .breakdown-header {
      text-align: center;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 2px solid var(--border);
    }
    
    .breakdown-header h1 {
      margin: 0 0 0.5rem;
      font-size: 2.2rem;
      font-weight: 600;
      color: var(--text);
    }
    
    .breakdown-header .subtitle {
      color: var(--text-muted);
      font-size: 1.1rem;
      margin-bottom: 1rem;
    }
    
    .breakdown-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 1rem;
      font-size: 0.95rem;
    }
    
    .breakdown-meta div {
      background: rgba(255,255,255,0.03);
      padding: 0.75rem;
      border-radius: 8px;
      border: 1px solid var(--border);
    }
    
    .breakdown-meta strong {
      color: var(--accent);
    }
    
    .breakdown-section {
      margin-bottom: 2.5rem;
    }
    
    .breakdown-section:last-child {
      margin-bottom: 0;
    }
    
    .breakdown-section h2 {
      margin: 0 0 1.5rem;
      font-size: 1.4rem;
      font-weight: 600;
      color: var(--accent);
      border-bottom: 2px solid rgba(61,155,255,0.2);
      padding-bottom: 0.75rem;
    }
    
    .breakdown-calculation {
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 0.95rem;
      line-height: 1.7;
    }
    
    .breakdown-calculation:last-child {
      margin-bottom: 0;
    }
    
    .breakdown-code-ref {
      color: var(--accent-secondary);
      font-weight: 600;
      font-size: 0.9rem;
      margin-bottom: 1rem;
      padding: 0.5rem 0.75rem;
      background: rgba(154,107,255,0.1);
      border-radius: 6px;
      border-left: 3px solid var(--accent-secondary);
    }
    
    .breakdown-formula {
      color: var(--text);
      margin-bottom: 0.5rem;
      padding-left: 1rem;
    }
    
    .breakdown-result {
      color: var(--accent);
      font-weight: 700;
      border-top: 2px solid var(--border);
      padding-top: 1rem;
      margin-top: 1rem;
      font-size: 1.05rem;
      background: rgba(61,155,255,0.05);
      padding: 1rem;
      border-radius: 6px;
      border: 1px solid rgba(61,155,255,0.2);
    }
    
    .toolbar {
      position: fixed;
      top: 20px;
      right: 20px;
      display: flex;
      gap: 10px;
      z-index: 1000;
    }
    
    .toolbar button {
      background: var(--accent);
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.2s ease;
    }
    
    .toolbar button:hover {
      background: #2a85e6;
    }
    
    @media print {
      .toolbar { display: none !important; }
      body { padding: 0; background: white; color: black; }
      .breakdown-container { 
        background: white; 
        box-shadow: none; 
        border-radius: 0;
        max-width: none;
        margin: 0;
        padding: 1rem;
      }
      .breakdown-header h1 { color: black; }
      .breakdown-section h2 { color: black; }
      .breakdown-code-ref { color: black; background: #f0f0f0; }
      .breakdown-result { color: black; background: #f8f8f8; }
      * { color: black !important; background: transparent !important; }
    }
    
    @media (max-width: 768px) {
      body { padding: 1rem; }
      .breakdown-container { padding: 1.5rem; }
      .breakdown-header h1 { font-size: 1.8rem; }
      .breakdown-meta { grid-template-columns: 1fr; }
      .toolbar { 
        position: static;
        justify-content: center;
        margin-bottom: 1rem;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()">Print</button>
    <button onclick="window.close()">Close</button>
  </div>
  
  <div class="breakdown-container">
    <div class="breakdown-header">
      <h1>Load Calculation Breakdown</h1>
      <div class="subtitle">CEC Section 8 - Single Dwelling Load Calculator</div>
      <div class="breakdown-meta">
        <div><strong>Inspection Date:</strong> ${inspectionDisplay}</div>
        <div><strong>Policy Number:</strong> ${policyDisplay}</div>
      </div>
    </div>
    
    ${breakdownContent}
    
    <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border); text-align: center; color: var(--text-muted); font-size: 0.9rem;">
      Breakdown generated on ${escapeHtml(new Date().toLocaleString())}
    </div>
  </div>
</body>
</html>`;
  }

  function generateBreakdownContent(snapshot){
    function fmtW(n){ return new Intl.NumberFormat().format(Math.round(n)); }
    function fmtA(n){ return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(n); }
    
    var html = '';
    
    // Basic Load Section
    html += '<div class="breakdown-section">';
    html += '<h2>1. Basic Load Calculation</h2>';
    html += '<div class="breakdown-calculation">';
    html += '<div class="breakdown-code-ref">CEC 8-200(1)(a)(i)(ii) - Basic load for dwelling units</div>';
    html += '<div class="breakdown-formula">Living area: ' + fmtA(snapshot.area.livingFt2) + ' ft² (' + fmtA(snapshot.area.livingFt2 / 10.764) + ' m²)</div>';
    
    if(snapshot.area.livingFt2 / 10.764 <= 90){
      html += '<div class="breakdown-formula">Area ≤ 90 m²: Basic load of 5000 W for the first 90 m² of living area</div>';
    } else {
      var extraSqM = (snapshot.area.livingFt2 / 10.764) - 90;
      var blocks = Math.ceil(extraSqM / 90);
      html += '<div class="breakdown-formula">First 90 m²: 5000 W (basic load)</div>';
      html += '<div class="breakdown-formula">Extra area: ' + fmtA(extraSqM) + ' m² ÷ 90 = ' + fmtA(blocks) + ' blocks (or portion thereof)</div>';
      html += '<div class="breakdown-formula">Additional load: ' + blocks + ' × 1000 W = ' + fmtW(blocks * 1000) + ' W</div>';
    }
    html += '<div class="breakdown-result">Basic Load Total: ' + fmtW(snapshot.loads.basic) + ' W</div>';
    html += '</div>';
    html += '</div>';

    // Space Conditioning Section
    html += '<div class="breakdown-section">';
    html += '<h2>2. Space Conditioning Load</h2>';
    html += '<div class="breakdown-calculation">';
    html += '<div class="breakdown-code-ref">CEC 8-200(1)(a)(iii) - Electric space-heating and air-conditioning loads</div>';
    html += '<div class="breakdown-formula">Space heating demand: ' + fmtW(snapshot.loads.spaceHeatDemandW) + ' W</div>';
    html += '<div class="breakdown-formula">Air conditioning demand: ' + fmtW(snapshot.loads.airCondDemandW) + ' W</div>';
    html += '<div class="breakdown-formula">Space heating: demand factors as permitted in Section 62</div>';
    html += '<div class="breakdown-formula">Air conditioning: 100% demand factor, subject to Rule 8-106(3)</div>';
    
    if(snapshot.loads.interlock){
      html += '<div class="breakdown-formula">Interlocked system per Rule 8-106(3): Use maximum of heating or cooling</div>';
      html += '<div class="breakdown-formula">Max(' + fmtW(snapshot.loads.spaceHeatDemandW) + ', ' + fmtW(snapshot.loads.airCondDemandW) + ') = ' + fmtW(snapshot.loads.spaceConditioningW) + ' W</div>';
    } else {
      html += '<div class="breakdown-formula">Non-interlocked: Heating + cooling loads</div>';
      html += '<div class="breakdown-formula">' + fmtW(snapshot.loads.spaceHeatDemandW) + ' + ' + fmtW(snapshot.loads.airCondDemandW) + ' = ' + fmtW(snapshot.loads.spaceConditioningW) + ' W</div>';
    }
    html += '<div class="breakdown-result">Space Conditioning Total: ' + fmtW(snapshot.loads.spaceConditioningW) + ' W</div>';
    html += '</div>';
    html += '</div>';

    // Cooking Ranges Section
    html += '<div class="breakdown-section">';
    html += '<h2>3. Electric Range Load</h2>';
    html += '<div class="breakdown-calculation">';
    html += '<div class="breakdown-code-ref">CEC 8-200(1)(a)(iv) - Electric range load calculation</div>';
    if(snapshot.loads.totalRanges === 0){
      html += '<div class="breakdown-formula">No electric ranges installed</div>';
    } else if(snapshot.loads.totalRanges === 1){
      html += '<div class="breakdown-formula">Single range: 6000 W for a single range plus 40% of any amount by which the rating exceeds 12 kW</div>';
      html += '<div class="breakdown-formula">Range demand calculation applied per Rule 8-200(1)(a)(iv)</div>';
    } else {
      html += '<div class="breakdown-formula">Multiple ranges: Apply Rule 8-200(1)(a)(iv) calculation method</div>';
    }
    html += '<div class="breakdown-result">Electric Range Total: ' + fmtW(snapshot.loads.rangesDemandW) + ' W</div>';
    html += '</div>';
    html += '</div>';

    // Water Heating Section
    html += '<div class="breakdown-section">';
    html += '<h2>4. Electric Water Heating Load</h2>';
    html += '<div class="breakdown-calculation">';
    html += '<div class="breakdown-code-ref">CEC 8-200(1)(a)(v) - Electric tankless water heaters and specialized equipment</div>';
    html += '<div class="breakdown-formula">Electric tankless water heaters: ' + fmtW(snapshot.loads.tanklessWatts) + ' W (100% demand factor)</div>';
    html += '<div class="breakdown-formula">Electric water heaters for steamers, swimming pools, hot tubs, or spas: ' + fmtW(snapshot.loads.specialDedicatedW) + ' W (100% demand factor)</div>';
    html += '<div class="breakdown-result">Water Heating Total: ' + fmtW(snapshot.loads.specialTotalW) + ' W</div>';
    html += '</div>';
    html += '</div>';

    // EV Charging Section
    html += '<div class="breakdown-section">';
    html += '<h2>5. Electric Vehicle Supply Equipment</h2>';
    html += '<div class="breakdown-calculation">';
    html += '<div class="breakdown-code-ref">CEC 8-200(1)(a)(vi) - Electric vehicle supply equipment loads</div>';
    html += '<div class="breakdown-formula">Chargers installed: ' + snapshot.loads.evseCount + '</div>';
    html += '<div class="breakdown-formula">Per charger rating: ' + fmtW(snapshot.loads.evseWatts) + ' W</div>';
    if(snapshot.loads.evems){
      html += '<div class="breakdown-formula">Exception per Rule 8-106(11): EVEMS present - load excluded</div>';
      html += '<div class="breakdown-result">EVSE Total: 0 W (excluded per Rule 8-106(11))</div>';
    } else {
      html += '<div class="breakdown-formula">100% demand factor: ' + snapshot.loads.evseCount + ' × ' + fmtW(snapshot.loads.evseWatts) + ' W = ' + fmtW(snapshot.loads.evseDemandW) + ' W</div>';
      html += '<div class="breakdown-result">EVSE Total: ' + fmtW(snapshot.loads.evseDemandW) + ' W</div>';
    }
    html += '</div>';
    html += '</div>';

    // Other Loads Section
    html += '<div class="breakdown-section">';
    html += '<h2>6. Other Loads (Rating > 1500 W)</h2>';
    html += '<div class="breakdown-calculation">';
    html += '<div class="breakdown-code-ref">CEC 8-200(1)(a)(vii) - Loads > 1500 W (additional to items i-vi)</div>';
    html += '<div class="breakdown-formula">Storage water heater: ' + fmtW(snapshot.loads.storageWHWatts) + ' W</div>';
    html += '<div class="breakdown-formula">Manual appliances: ' + fmtW(snapshot.loads.manualAppliancesW) + ' W</div>';
    html += '<div class="breakdown-formula">Combined load for demand factor calculation: ' + fmtW(snapshot.loads.appliancesPoolW) + ' W</div>';
    
    if(snapshot.loads.totalRanges > 0){
      html += '<div class="breakdown-formula">Rule 8-200(1)(a)(vii)(A): Electric range provided - 25% demand factor</div>';
      html += '<div class="breakdown-formula">' + fmtW(snapshot.loads.appliancesPoolW) + ' × 0.25 = ' + fmtW(snapshot.loads.otherDemandW) + ' W</div>';
    } else {
      var first6kW = Math.min(6000, snapshot.loads.appliancesPoolW);
      var remainder = Math.max(0, snapshot.loads.appliancesPoolW - 6000);
      html += '<div class="breakdown-formula">Rule 8-200(1)(a)(vii)(B): No electric range provided</div>';
      html += '<div class="breakdown-formula">100% of combined load up to 6000 W: ' + fmtW(first6kW) + ' W</div>';
      if(remainder > 0){
        html += '<div class="breakdown-formula">25% of combined load exceeding 6000 W: ' + fmtW(remainder) + ' × 0.25 = ' + fmtW(remainder * 0.25) + ' W</div>';
      }
    }
    html += '<div class="breakdown-result">Other Loads Total: ' + fmtW(snapshot.loads.otherDemandW) + ' W</div>';
    html += '</div>';
    html += '</div>';

    // Path Calculations Section
    html += '<div class="breakdown-section">';
    html += '<h2>7. Final Load Calculation</h2>';
    html += '<div class="breakdown-calculation">';
    html += '<div class="breakdown-code-ref">CEC 8-200(1) - Calculated load based on greater of (a) or (b)</div>';
    html += '<div class="breakdown-formula"><strong>Path A - Detailed Sum per Rule 8-200(1)(a):</strong></div>';
    html += '<div class="breakdown-formula">Basic load (i)(ii): ' + fmtW(snapshot.loads.basic) + ' W</div>';
    html += '<div class="breakdown-formula">Space conditioning (iii): ' + fmtW(snapshot.loads.spaceConditioningW) + ' W</div>';
    html += '<div class="breakdown-formula">Electric range (iv): ' + fmtW(snapshot.loads.rangesDemandW) + ' W</div>';
    html += '<div class="breakdown-formula">Water heating (v): ' + fmtW(snapshot.loads.specialTotalW) + ' W</div>';
    html += '<div class="breakdown-formula">EVSE (vi): ' + fmtW(snapshot.loads.evseDemandW) + ' W</div>';
    html += '<div class="breakdown-formula">Other loads (vii): ' + fmtW(snapshot.loads.otherDemandW) + ' W</div>';
    html += '<div class="breakdown-result">Path A Total: ' + fmtW(snapshot.results.pathA) + ' W</div>';
    html += '</div>';
    
    html += '<div class="breakdown-calculation">';
    html += '<div class="breakdown-code-ref">CEC 8-200(1)(b) - Minimum service capacity based on floor area</div>';
    var pathBNote = snapshot.area.exclusiveFt2 >= 80 * 10.764 ? 'Rule 8-200(1)(b)(i): Floor area ≥ 80 m² (exclusive of basement)' : 'Rule 8-200(1)(b)(ii): Floor area < 80 m² (exclusive of basement)';
    var pathBLoad = snapshot.area.exclusiveFt2 >= 80 * 10.764 ? '24,000 W' : '14,400 W';
    html += '<div class="breakdown-formula"><strong>Path B - Fixed Minimum per Rule 8-200(1)(b):</strong></div>';
    html += '<div class="breakdown-formula">Floor area (exclusive of basement): ' + fmtA(snapshot.area.exclusiveFt2 / 10.764) + ' m²</div>';
    html += '<div class="breakdown-formula">' + pathBNote + ': ' + pathBLoad + '</div>';
    html += '<div class="breakdown-result">Path B Total: ' + fmtW(snapshot.results.pathB) + ' W</div>';
    html += '</div>';

    html += '<div class="breakdown-calculation">';
    html += '<div class="breakdown-formula"><strong>Final Calculated Load per Rule 8-200(1):</strong></div>';
    html += '<div class="breakdown-formula">The calculated load shall be based on the greater of Path A or Path B</div>';
    html += '<div class="breakdown-formula">Maximum of ' + fmtW(snapshot.results.pathA) + ' W (Path A) and ' + fmtW(snapshot.results.pathB) + ' W (Path B)</div>';
    html += '<div class="breakdown-result">Calculated Load: ' + fmtW(snapshot.results.calcLoad) + ' W</div>';
    html += '<div class="breakdown-result">Minimum Service Current: ' + fmtA(snapshot.results.amps) + ' A @ ' + snapshot.results.voltage + ' V</div>';
    html += '</div>';
    html += '</div>';

    return html;
  }

  })();

})();




