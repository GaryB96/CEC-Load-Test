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

    function generateReport(){ if(!lastCalcSnapshot) calculate(); var snapshot = lastCalcSnapshot; if(!snapshot){ alert('Please calculate the load before generating a report.'); return; } var inspectionEl=$('inspectionDate'); var policyEl=$('policyNumber'); var inspectionValue = inspectionEl ? inspectionEl.value : ''; var policyValue = policyEl ? policyEl.value.trim() : ''; var inspectionDisplay = formatInspectionDate(inspectionValue) || 'Not provided'; var policyDisplay = policyValue ? escapeHtml(policyValue) : 'Not provided'; var areaRows = []; areaRows.push('<tr><th scope="row">Ground & upper living area</th><td>'+fmtA(snapshot.area.groundUpperFt2)+' ft\u00b2</td></tr>'); areaRows.push('<tr><th scope="row">Basement area (>= 5 ft 11 in)</th><td>'+fmtA(snapshot.area.basementFt2)+' ft\u00b2</td></tr>'); areaRows.push('<tr><th scope="row">Living area (with 75% basement)</th><td>'+fmtA(snapshot.area.livingFt2)+' ft\u00b2</td></tr>'); areaRows.push('<tr><th scope="row">Exclusive above-grade area</th><td>'+fmtA(snapshot.area.exclusiveFt2)+' ft\u00b2</td></tr>'); var groundDims = (snapshot.area.groundUpperLength && snapshot.area.groundUpperWidth) ? (snapshot.area.groundUpperLength+' x '+snapshot.area.groundUpperWidth+' ft') : null; if(groundDims) areaRows.push('<tr><th scope="row">Ground & upper dimensions</th><td>'+escapeHtml(groundDims)+'</td></tr>'); var basementDims = (snapshot.area.basementLength && snapshot.area.basementWidth) ? (snapshot.area.basementLength+' x '+snapshot.area.basementWidth+' ft') : null; if(basementDims) areaRows.push('<tr><th scope="row">Basement dimensions</th><td>'+escapeHtml(basementDims)+'</td></tr>'); var spaceHeatRows = ''; if(state.spaceHeat.length){ for(var i=0;i<state.spaceHeat.length;i++){ var itm=state.spaceHeat[i]; var det = itm.type==='amps' ? (fmtA(itm.amps)+' A @ '+fmtA(itm.voltage)+' V ('+fmtW(itm.watts)+' W)') : (fmtW(itm.watts)+' W'); spaceHeatRows += '<tr><td>'+ (i+1) +'. '+ escapeHtml(itm.label) +'</td><td>'+ escapeHtml(det) +'</td></tr>'; } } else { spaceHeatRows = '<tr><td colspan="2">No space heating loads recorded.</td></tr>'; } var airRows=''; if(state.airCond.length){ for(var j=0;j<state.airCond.length;j++){ var it=state.airCond[j]; var det2 = it.type==='amps' ? (fmtA(it.amps)+' A @ '+fmtA(it.voltage)+' V ('+fmtW(it.watts)+' W)') : (fmtW(it.watts)+' W'); airRows += '<tr><td>'+ (j+1) +'. '+ escapeHtml(it.label) +'</td><td>'+ escapeHtml(det2) +'</td></tr>'; } } else { airRows = '<tr><td colspan="2">No air conditioning loads recorded.</td></tr>'; } var rangeRows=''; if(state.ranges.length){ for(var r=0;r<state.ranges.length;r++){ var ri=state.ranges[r]; rangeRows += '<tr><td>'+ (r+1) +'. '+ escapeHtml(ri.label) +'</td><td>'+ ri.count + ' x ' + fmtW(ri.watts) + ' W nameplate</td></tr>'; } } else { rangeRows = '<tr><td colspan="2">No cooking ranges recorded.</td></tr>'; } var reportWin = window.open('','_blank'); if(!reportWin){ alert('Please allow pop-ups to view the report.'); return; } var reportHtml = '<!doctype html><html><head><meta charset="utf-8"><title>Load Calculation Report</title></head><body><h1>Load Calculation Report</h1><p>Inspection: '+ escapeHtml(inspectionDisplay) +'</p><p>Policy: '+ policyDisplay +'</p><table>' + areaRows.join('') + '</table><h2>Space heating</h2><table>' + spaceHeatRows + '</table><h2>Air conditioning</h2><table>' + airRows + '</table><h2>Ranges</h2><table>' + rangeRows + '</table></body></html>'; reportWin.document.open(); reportWin.document.write(reportHtml); reportWin.document.close(); reportWin.focus(); }

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

  })();
    



