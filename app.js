// CEC Section 8 single-dwelling calculator (CSA C22.1:24) - v3

// Adds explicit basement handling per 8-110 (75% of basement >= 1.8 m) and auto-computed living area.

(function(){

  const $ = (id) => document.getElementById(id);

  const fmtW = (n) => new Intl.NumberFormat().format(Math.round(n));

  const fmtA = (n) => new Intl.NumberFormat(undefined, {maximumFractionDigits: 1}).format(n);

  const escapeHtml = (input) => {
    if(input === null || input === undefined){ return ''; }
    return String(input).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  };

  const SQFT_PER_SQM = 10.763910416709722;

  const state = { appliances: [], spaceHeat: [], airCond: [], ranges: [], specialWater: [] };

  const dimensionGroups = {};

  let lastCalcSnapshot = null;

  function renderSpaceHeatList(){

    const host = $("spaceHeatList");

    if(!host){ return; }

    host.innerHTML = "";

    state.spaceHeat.forEach((item, idx) => {

      const row = document.createElement("div");
      row.className = "item";

      const name = document.createElement("div");
      name.textContent = item.label;

      const val = document.createElement("div");
      val.className = "mono";
      val.textContent = item.type === "amps"
        ? `${fmtA(item.amps)} A @ ${fmtA(item.voltage)} V (${fmtW(item.watts)} W)`
        : `${fmtW(item.watts)} W`;

      const kill = document.createElement("button");
      kill.className = "kill";
      kill.textContent = "Remove";
      kill.addEventListener("click", () => {
        state.spaceHeat.splice(idx,1);
        renderSpaceHeatList();
        calculate();
      });

      row.appendChild(name);
      row.appendChild(val);
      row.appendChild(kill);
      host.appendChild(row);

    });

  }

  function updateSpaceHeatInputMode(){

    const typeEl = $("spaceHeatType");
    const valueEl = $("spaceHeatValue");
    const voltageEl = $("spaceHeatVoltage");

    if(!typeEl || !valueEl || !voltageEl){ return; }

    const type = typeEl.value;

    if(type === "amps"){
      voltageEl.style.display = "";
      voltageEl.disabled = false;
      valueEl.placeholder = "Amps";
    } else {
      voltageEl.style.display = "none";
      voltageEl.disabled = true;
      valueEl.placeholder = "Watts";
    }

  }

  function addSpaceHeat(){

    const nameEl = $("spaceHeatName");
    const typeEl = $("spaceHeatType");
    const valueEl = $("spaceHeatValue");
    const voltageEl = $("spaceHeatVoltage");

    if(!typeEl || !valueEl){ return; }

    const label = nameEl ? nameEl.value.trim() : "";
    const type = typeEl.value;
    const value = parseFloat(valueEl.value);

    if(isNaN(value) || value <= 0){ return; }

    let watts = 0;
    let amps = null;
    let voltage = null;

    if(type === "amps"){
      const rawVoltage = voltageEl ? parseFloat(voltageEl.value) : NaN;
      if(isNaN(rawVoltage) || rawVoltage <= 0){ return; }
      amps = value;
      voltage = rawVoltage;
      watts = amps * voltage;
    } else {
      watts = value;
    }

    const item = {
      label: label || (type === "amps" ? "Heating load (A)" : "Heating load (W)"),
      type,
      watts: Math.round(watts),
      amps: type === "amps" ? amps : null,
      voltage: type === "amps" ? voltage : null
    };

    state.spaceHeat.push(item);

    if(nameEl){ nameEl.value = ""; }
    valueEl.value = "";

    renderSpaceHeatList();
    calculate();

  }

  function renderAirCondList(){

    const host = $("airCondList");

    if(!host){ return; }

    host.innerHTML = "";

    state.airCond.forEach((item, idx) => {

      const row = document.createElement("div");
      row.className = "item";

      const name = document.createElement("div");
      name.textContent = item.label;

      const val = document.createElement("div");
      val.className = "mono";
      val.textContent = item.type === "amps"
        ? `${fmtA(item.amps)} A @ ${fmtA(item.voltage)} V (${fmtW(item.watts)} W)`
        : `${fmtW(item.watts)} W`;

      const kill = document.createElement("button");
      kill.className = "kill";
      kill.textContent = "Remove";
      kill.addEventListener("click", () => {
        state.airCond.splice(idx,1);
        renderAirCondList();
        calculate();
      });

      row.appendChild(name);
      row.appendChild(val);
      row.appendChild(kill);
      host.appendChild(row);

    });

  }

  function updateAirCondInputMode(){

    const typeEl = $("airCondType");
    const valueEl = $("airCondValue");
    const voltageEl = $("airCondVoltage");

    if(!typeEl || !valueEl || !voltageEl){ return; }

    const type = typeEl.value;

    if(type === "amps"){
      voltageEl.style.display = "";
      voltageEl.disabled = false;
      valueEl.placeholder = "Amps";
    } else {
      voltageEl.style.display = "none";
      voltageEl.disabled = true;
      valueEl.placeholder = "Watts";
    }

  }

  function addAirCond(){

    const nameEl = $("airCondName");
    const typeEl = $("airCondType");
    const valueEl = $("airCondValue");
    const voltageEl = $("airCondVoltage");

    if(!typeEl || !valueEl){ return; }

    const label = nameEl ? nameEl.value.trim() : "";
    const type = typeEl.value;
    const value = parseFloat(valueEl.value);

    if(isNaN(value) || value <= 0){ return; }

    let watts = 0;
    let amps = null;
    let voltage = null;

    if(type === "amps"){
      const rawVoltage = voltageEl ? parseFloat(voltageEl.value) : NaN;
      if(isNaN(rawVoltage) || rawVoltage <= 0){ return; }
      amps = value;
      voltage = rawVoltage;
      watts = amps * voltage;
    } else {
      watts = value;
    }

    const item = {
      label: label || (type === "amps" ? "Cooling load (A)" : "Cooling load (W)"),
      type,
      watts: Math.round(watts),
      amps: type === "amps" ? amps : null,
      voltage: type === "amps" ? voltage : null
    };

    state.airCond.push(item);

    if(nameEl){ nameEl.value = ""; }
    valueEl.value = "";

    renderAirCondList();
    calculate();

  }

  function renderRangeList(){

    const host = $("rangeList");

    if(!host){ return; }

    host.innerHTML = "";

    state.ranges.forEach((item, idx) => {

      const row = document.createElement("div");
      row.className = "item";

      const name = document.createElement("div");
      name.textContent = item.label;

      const val = document.createElement("div");
      val.className = "mono";
      val.textContent = `${item.count} x ${fmtW(item.watts)} W`;

      const kill = document.createElement("button");
      kill.className = "kill";
      kill.textContent = "Remove";
      kill.addEventListener("click", () => {
        state.ranges.splice(idx,1);
        renderRangeList();
        calculate();
      });

      row.appendChild(name);
      row.appendChild(val);
      row.appendChild(kill);
      host.appendChild(row);

    });

  }

  function addRange(){

    const nameEl = $("rangeName");
    const countEl = $("rangeCount");
    const wattsEl = $("rangeWatts");

    if(!countEl || !wattsEl){ return; }

    const label = nameEl ? nameEl.value.trim() : "";
    const count = parseInt(countEl.value || "0", 10);
    const watts = parseFloat(wattsEl.value);

    if(isNaN(count) || count <= 0){ return; }
    if(isNaN(watts) || watts <= 0){ return; }

    const item = {
      label: label || "Range",
      count,
      watts: Math.round(watts)
    };

    state.ranges.push(item);

    if(nameEl){ nameEl.value = ""; }
    if(countEl){ countEl.value = countEl.defaultValue || "1"; }
    if(wattsEl){ wattsEl.value = wattsEl.defaultValue || ""; }

    renderRangeList();
    calculate();

  }

  function renderSpecialWaterList(){

    const host = $("specialWaterList");

    if(!host){ return; }

    host.innerHTML = "";

    state.specialWater.forEach((item, idx) => {

      const row = document.createElement("div");
      row.className = "item";

      const name = document.createElement("div");
      name.textContent = item.name;

      const val = document.createElement("div");
      val.className = "mono";
      val.textContent = `${fmtW(item.watts)} W`;

      const kill = document.createElement("button");
      kill.className = "kill";
      kill.textContent = "Remove";
      kill.addEventListener("click", () => {
        state.specialWater.splice(idx,1);
        renderSpecialWaterList();
        calculate();
      });

      row.appendChild(name);
      row.appendChild(val);
      row.appendChild(kill);
      host.appendChild(row);

    });

  }

  function addSpecialWater(){

    const nameEl = $("specialWaterName");
    const wattsEl = $("specialWaterWatts");

    if(!wattsEl){ return; }

    const label = nameEl ? nameEl.value.trim() : "";
    const watts = parseFloat(wattsEl.value);

    if(isNaN(watts) || watts <= 0){ return; }

    state.specialWater.push({
      name: label || "Dedicated heater",
      watts: Math.round(watts)
    });

    if(nameEl){ nameEl.value = ""; }
    wattsEl.value = "";

    renderSpecialWaterList();
    calculate();

  }

  function renderApplianceList(){

    const host = $("applianceList");

    if(!host){ return; }

    host.innerHTML = "";

    state.appliances.forEach((item, idx) => {

      const row = document.createElement("div");
      row.className = "item";

      const name = document.createElement("div");
      name.textContent = item.name;

      const val = document.createElement("div");
      val.className = "mono";
      val.textContent = `${fmtW(item.watts)} W`;

      const kill = document.createElement("button");
      kill.className = "kill";
      kill.textContent = "Remove";
      kill.addEventListener("click", () => {
        state.appliances.splice(idx,1);
        renderApplianceList();
        calculate();
      });

      row.appendChild(name);
      row.appendChild(val);
      row.appendChild(kill);
      host.appendChild(row);

    });

  }

  function addAppliance(){

    const nameEl = $("applianceName");
    const wattsEl = $("applianceWatts");

    if(!nameEl || !wattsEl){ return; }

    const name = nameEl.value.trim();
    const watts = parseFloat(wattsEl.value);

    if(!name || isNaN(watts) || watts <= 0){ return; }

    state.appliances.push({ name, watts: Math.round(watts) });

    nameEl.value = "";
    wattsEl.value = "";

    renderApplianceList();
    calculate();

  }

  function setupCollapsibles(){

    const sections = document.querySelectorAll("fieldset.collapsible");

    sections.forEach((fieldset) => {

      const toggle = fieldset.querySelector(".collapse-toggle");
      const body = fieldset.querySelector(".collapse-body");

      if(!toggle || !body){ return; }

      const expanded = toggle.getAttribute("aria-expanded") !== "false";

      if(!expanded){
        fieldset.classList.add("collapsed");
        body.hidden = true;
      }

      toggle.addEventListener("click", () => {

        const isCollapsed = fieldset.classList.toggle("collapsed");
        const expandedNow = !isCollapsed;
        toggle.setAttribute("aria-expanded", expandedNow ? "true" : "false");
        body.hidden = !expandedNow;

      });

    });

  }

  function setupAreaDimensions(){

    const configs = [
      { lengthId: "groundUpperLength", widthId: "groundUpperWidth", areaId: "groundUpperArea", displayId: "groundUpperCalc" },
      { lengthId: "basementLength", widthId: "basementWidth", areaId: "basementArea", displayId: "basementCalc" }
    ];

    configs.forEach((cfg) => {

      const lengthEl = $(cfg.lengthId);
      const widthEl = $(cfg.widthId);
      const areaEl = $(cfg.areaId);
      const displayEl = cfg.displayId ? $(cfg.displayId) : null;

      if(!lengthEl || !widthEl || !areaEl){ return; }

  let programmatic = false;
  let originalArea = null;

      const updateDisplay = (value) => {
        if(!displayEl){ return; }
        if(typeof value === 'number' && Number.isFinite(value) && value > 0){
          displayEl.textContent = `${fmtA(value)} ft²`;
        } else {
          displayEl.textContent = '--';
        }
      };

      const setAutoArea = (areaValue) => {
        // On first dimension input, store the original area value
        if (originalArea === null) {
          const current = parseFloat(areaEl.value);
          originalArea = Number.isFinite(current) && current > 0 ? current : 0;
        }
        const rounded = Math.round(originalArea + areaValue);
        if(!Number.isFinite(rounded) || rounded <= 0){ return; }
        programmatic = true;
        areaEl.value = String(rounded);
        areaEl.dataset.autofilled = "true";
        updateDisplay(originalArea + areaValue);
        areaEl.dispatchEvent(new Event("input", { bubbles: true }));
        programmatic = false;
      };

      const clearAutoArea = () => {
        programmatic = true;
        areaEl.value = "";
        areaEl.removeAttribute("data-autofilled");
        updateDisplay(null);
        areaEl.dispatchEvent(new Event("input", { bubbles: true }));
        programmatic = false;
        originalArea = null;
      };

      const updateFromDimensions = () => {
        const length = parseFloat(lengthEl.value);
        const width = parseFloat(widthEl.value);

        if(Number.isFinite(length) && length > 0 && Number.isFinite(width) && width > 0){
          setAutoArea(length * width);
        } else if(areaEl.dataset.autofilled === "true"){
          clearAutoArea();
        } else {
          const current = parseFloat(areaEl.value);
          updateDisplay(Number.isFinite(current) && current > 0 ? current : null);
          originalArea = null;
        }
      };

      const handleAreaInput = () => {
        if(!programmatic && areaEl.dataset.autofilled === "true"){
          areaEl.removeAttribute("data-autofilled");
        }
        const value = parseFloat(areaEl.value);
        updateDisplay(Number.isFinite(value) && value > 0 ? value : null);
      };

      // Disable live area auto-fill if 'Add section' button is present
      if (!document.getElementById('add' + cfg.lengthId.replace('Length','Dim'))) {
        lengthEl.addEventListener("input", updateFromDimensions);
        widthEl.addEventListener("input", updateFromDimensions);
      }
      areaEl.addEventListener("input", handleAreaInput);

      handleAreaInput();
      updateFromDimensions();

    });

  }

  function rangeDemand(rangeEntries){

    if(!rangeEntries || rangeEntries.length === 0){ return 0; }

    let total = 0;

    rangeEntries.forEach((item) => {
      const count = Math.max(0, item.count);
      const rating = Math.max(0, item.watts);
      if(count <= 0 || rating <= 0){ return; }
      const over = Math.max(0, rating - 12000);
      const perRange = 6000 + 0.40 * over; // per 8-200(1)(a)(iv)
      total += count * perRange;
    });

    return total;

  }

  function otherLoadsDemandW(hasRange, appliancesW){

    const totalW = appliancesW;

    if(totalW <= 0) return 0;

    if(hasRange){

      return totalW * 0.25;

    } else {

      const first = Math.min(6000, totalW);

      const rem = Math.max(0, totalW - 6000);

      return first + rem * 0.25;

    }

  }

  function computeAreas(){
    const groundUpperFt2 = parseFloat($("groundUpperArea").value) || 0;
    const basementFt2 = parseFloat($("basementArea").value) || 0;
    const livingFt2 = groundUpperFt2 + 0.75 * basementFt2;
    const exclusiveFt2 = groundUpperFt2;
    const livingAreaDisplay = $("livingAreaDisplay");
    if(livingAreaDisplay){ livingAreaDisplay.textContent = fmtA(livingFt2); }
    const exclusiveAreaDisplay = $("exclusiveAreaDisplay");
    if(exclusiveAreaDisplay){ exclusiveAreaDisplay.textContent = fmtA(exclusiveFt2); }
    return {
      groundUpperFt2,
      basementFt2,
      livingFt2,
      exclusiveFt2,
      livingSqM: livingFt2 / SQFT_PER_SQM,
      exclusiveSqM: exclusiveFt2 / SQFT_PER_SQM
    };
  }

  function calculate(){

    const { livingSqM, exclusiveSqM, livingFt2, exclusiveFt2, groundUpperFt2, basementFt2 } = computeAreas();

    const pickDimension = (id) => {
      const el = $(id);
      if(!el){ return null; }
      const value = parseFloat(el.value);
      return Number.isFinite(value) && value > 0 ? value : null;
    };

    const groundUpperLength = pickDimension("groundUpperLength");
    const groundUpperWidth = pickDimension("groundUpperWidth");
    const basementLength = pickDimension("basementLength");
    const basementWidth = pickDimension("basementWidth");

    const spaceHeatDemandW = state.spaceHeat.reduce((sum, item) => sum + item.watts, 0);
    const acW = state.airCond.reduce((sum, item) => sum + item.watts, 0);

    const interlock = $("interlock").value === "yes";
    const totalRanges = state.ranges.reduce((sum, item) => sum + item.count, 0);

    const tanklessWatts = parseFloat($("tanklessWatts").value) || 0;
    const storageWHWatts = parseFloat($("storageWHWatts").value) || 0;

    const specialDedicatedW = state.specialWater.reduce((sum, item) => sum + item.watts, 0);

    const evseCount = parseInt($("evseCount").value || "0", 10);
    const evseWatts = parseFloat($("evseWatts").value) || 0;
    const evems = $("evems").value === "yes";

    const voltage = 240;

    let basic = 0;

    if(livingSqM > 0){
      basic = 5000;
      const extra = Math.max(0, livingSqM - 90);
      if(extra > 0){
        const blocks = Math.ceil(extra / 90);
        basic += blocks * 1000;
      }
    }

    const heatW = spaceHeatDemandW;
    const spaceCondW = interlock ? Math.max(heatW, acW) : (heatW + acW);

    const rangesW = rangeDemand(state.ranges);
    const specialWHW = tanklessWatts + specialDedicatedW;
    const evseW = evems ? 0 : evseCount * evseWatts;

    const manualAppliancesW = state.appliances.reduce((sum, item) => sum + item.watts, 0);
    const appliancesW = manualAppliancesW + storageWHWatts;

    const otherW = otherLoadsDemandW(totalRanges > 0, appliancesW);

    const pathA = basic + spaceCondW + rangesW + specialWHW + evseW + otherW;
    const pathB = (exclusiveSqM >= 80) ? 24000 : 14400;
    const calcLoad = Math.max(pathA, pathB);
    const amps = calcLoad / voltage;

    $("pathA").textContent = fmtW(pathA);
    $("pathB").textContent = fmtW(pathB);
    $("calcLoad").textContent = fmtW(calcLoad);
    $("minAmps").textContent = fmtA(amps);
    $("voltsLabel").textContent = voltage;

    lastCalcSnapshot = {
      area: {
        groundUpperFt2,
        basementFt2,
        livingFt2,
        exclusiveFt2,
        groundUpperLength,
        groundUpperWidth,
        basementLength,
        basementWidth
      },
      loads: {
        basic,
        spaceHeatDemandW: heatW,
        airCondDemandW: acW,
        spaceConditioningW: spaceCondW,
        interlock,
        rangesDemandW: rangesW,
        tanklessWatts,
        specialDedicatedW,
        specialTotalW: specialWHW,
        storageWHWatts,
        manualAppliancesW,
        appliancesPoolW: appliancesW,
        otherDemandW: otherW,
        evseDemandW: evseW,
        evseCount,
        evseWatts,
        evems,
        totalRanges
      },
      results: {
        pathA,
        pathB,
        calcLoad,
        amps,
        voltage
      }
    };

  }

  function formatInspectionDate(value){

    if(!value){ return null; }

    const parts = value.split('-');

    if(parts.length !== 3){ return null; }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    if(!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)){ return null; }

    const date = new Date(year, month - 1, day);

    if(Number.isNaN(date.getTime())){ return null; }

    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);

  }

  function generateReport(){

    if(!lastCalcSnapshot){ calculate(); }

    const snapshot = lastCalcSnapshot;

    if(!snapshot){
      alert('Please calculate the load before generating a report.');
      return;
    }

    const inspectionEl = $("inspectionDate");
    const policyEl = $("policyNumber");

    const inspectionValue = inspectionEl ? inspectionEl.value : '';
    const policyValue = policyEl ? policyEl.value.trim() : '';

    const inspectionDisplay = formatInspectionDate(inspectionValue) || 'Not provided';
    const policyDisplay = policyValue ? escapeHtml(policyValue) : 'Not provided';

    const formatDimension = (value) => (typeof value === 'number' && Number.isFinite(value) && value > 0)
      ? new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)
      : null;

    const areaRows = [
      `<tr><th scope="row">Ground & upper living area</th><td>${fmtA(snapshot.area.groundUpperFt2)} ft²</td></tr>`,
      `<tr><th scope="row">Basement area (>= 5 ft 11 in)</th><td>${fmtA(snapshot.area.basementFt2)} ft²</td></tr>`,
      `<tr><th scope="row">Living area (with 75% basement)</th><td>${fmtA(snapshot.area.livingFt2)} ft²</td></tr>`,
      `<tr><th scope="row">Exclusive above-grade area</th><td>${fmtA(snapshot.area.exclusiveFt2)} ft²</td></tr>`
    ];

    const groundDims = formatDimension(snapshot.area.groundUpperLength) && formatDimension(snapshot.area.groundUpperWidth)
      ? `${formatDimension(snapshot.area.groundUpperLength)} x ${formatDimension(snapshot.area.groundUpperWidth)} ft`
      : null;

    if(groundDims){
      areaRows.push(`<tr><th scope="row">Ground & upper dimensions</th><td>${groundDims}</td></tr>`);
    }

    const basementDims = formatDimension(snapshot.area.basementLength) && formatDimension(snapshot.area.basementWidth)
      ? `${formatDimension(snapshot.area.basementLength)} x ${formatDimension(snapshot.area.basementWidth)} ft`
      : null;

    if(basementDims){
      areaRows.push(`<tr><th scope="row">Basement dimensions</th><td>${basementDims}</td></tr>`);
    }

    const spaceHeatRows = state.spaceHeat.length
      ? state.spaceHeat.map((item, idx) => {
          const detail = item.type === 'amps'
            ? `${fmtA(item.amps)} A @ ${fmtA(item.voltage)} V (${fmtW(item.watts)} W)`
            : `${fmtW(item.watts)} W`;
          return `<tr><td>${idx + 1}. ${escapeHtml(item.label)}</td><td>${escapeHtml(detail)}</td></tr>`;
        }).join('')
      : '<tr><td colspan="2">No space heating loads recorded.</td></tr>';

    const airRows = state.airCond.length
      ? state.airCond.map((item, idx) => {
          const detail = item.type === 'amps'
            ? `${fmtA(item.amps)} A @ ${fmtA(item.voltage)} V (${fmtW(item.watts)} W)`
            : `${fmtW(item.watts)} W`;
          return `<tr><td>${idx + 1}. ${escapeHtml(item.label)}</td><td>${escapeHtml(detail)}</td></tr>`;
        }).join('')
      : '<tr><td colspan="2">No air conditioning loads recorded.</td></tr>';

    const rangeRows = state.ranges.length
      ? state.ranges.map((item, idx) => `<tr><td>${idx + 1}. ${escapeHtml(item.label)}</td><td>${item.count} x ${fmtW(item.watts)} W nameplate</td></tr>`).join('')
      : '<tr><td colspan="2">No cooking ranges recorded.</td></tr>';

    const specialWaterRows = state.specialWater.length
      ? state.specialWater.map((item, idx) => `<tr><td>${idx + 1}. ${escapeHtml(item.name)}</td><td>${fmtW(item.watts)} W</td></tr>`).join('')
      : '<tr><td colspan="2">No dedicated spa / pool heaters recorded.</td></tr>';

    const appliancesRows = state.appliances.length
      ? state.appliances.map((item, idx) => `<tr><td>${idx + 1}. ${escapeHtml(item.name)}</td><td>${fmtW(item.watts)} W</td></tr>`).join('')
      : '<tr><td colspan="2">No additional fixed appliances recorded.</td></tr>';

    const storageRow = snapshot.loads.storageWHWatts > 0
      ? `<tr><td>Storage water heater</td><td>${fmtW(snapshot.loads.storageWHWatts)} W</td></tr>`
      : '';

    const tanklessRow = snapshot.loads.tanklessWatts > 0
      ? `<tr><td>Tankless water heater</td><td>${fmtW(snapshot.loads.tanklessWatts)} W</td></tr>`
      : '';

    const evemsLabel = snapshot.loads.evems ? 'Yes (excluded per 8-106(11))' : 'No (included at 100%)';

    const reportWindow = window.open('', '_blank');

    if(!reportWindow){
      alert('Please allow pop-ups to view the report.');
      return;
    }

    const reportHtml = `<!DOCTYPE html>
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

  <script>window.addEventListener('load', () => window.print());</script>
</body>
</html>`;

    reportWindow.document.open();
    reportWindow.document.write(reportHtml);
    reportWindow.document.close();
    reportWindow.focus();

  }

  const reportBtn = $("reportBtn");

  if(reportBtn){

    reportBtn.addEventListener("click", (evt) => {

      evt.preventDefault();

      generateReport();

    });

  }

  const addSpaceHeatBtn = $("addSpaceHeat");

  if(addSpaceHeatBtn){

    addSpaceHeatBtn.addEventListener("click", (evt) => {

      evt.preventDefault();

      addSpaceHeat();

    });

  }

  const spaceHeatTypeEl = $("spaceHeatType");

  if(spaceHeatTypeEl){

    spaceHeatTypeEl.addEventListener("change", updateSpaceHeatInputMode);

  }

  const addAirCondBtn = $("addAirCond");

  if(addAirCondBtn){

    addAirCondBtn.addEventListener("click", (evt) => {

      evt.preventDefault();

      addAirCond();

    });

  }

  const airCondTypeEl = $("airCondType");

  if(airCondTypeEl){

    airCondTypeEl.addEventListener("change", updateAirCondInputMode);

  }

  const addRangeBtn = $("addRange");

  if(addRangeBtn){

    addRangeBtn.addEventListener("click", (evt) => {

      evt.preventDefault();

      addRange();

    });

  }

  const addSpecialWaterBtn = $("addSpecialWater");

  if(addSpecialWaterBtn){

    addSpecialWaterBtn.addEventListener("click", (evt) => {

      evt.preventDefault();

      addSpecialWater();

    });

  }

  const addApplianceBtn = $("addAppliance");

  if(addApplianceBtn){

    addApplianceBtn.addEventListener("click", addAppliance);

  }


  $("calcForm").addEventListener("input", (e) => {

    const id = e.target && e.target.id;

    const instant = [
                     "groundUpperArea","basementArea","groundUpperLength","groundUpperWidth","basementLength","basementWidth",
                     "spaceHeatName","spaceHeatType","spaceHeatValue","spaceHeatVoltage",
                     "airCondName","airCondType","airCondValue","airCondVoltage",
                     "rangeName","rangeCount","rangeWatts","interlock",
                     "tanklessWatts","storageWHWatts",
                     "evseCount","evseWatts","evems","applianceWatts","applianceName"
                    ].includes(id);

    if(instant){ calculate(); }

    if(id === "spaceHeatType"){ updateSpaceHeatInputMode(); }

    if(id === "airCondType"){ updateAirCondInputMode(); }

  });

  setupCollapsibles();
  setupAreaDimensions();

  updateSpaceHeatInputMode();
  updateAirCondInputMode();

  renderSpaceHeatList();
  renderAirCondList();
  renderRangeList();
  renderSpecialWaterList();
  renderApplianceList();

  calculate();




function setupAreaSection(buttonId, lengthId, widthId, areaInputId, calcDisplayId) {
  const btn = document.getElementById(buttonId);
  const lengthInput = document.getElementById(lengthId);
  const widthInput = document.getElementById(widthId);
  const areaInput = document.getElementById(areaInputId);
  const calcDisplay = document.getElementById(calcDisplayId);

  if (btn && lengthInput && widthInput && areaInput) {

    // Prevent live updates from touching the main area input
    const preventLiveAutoFill = () => {
      // Do nothing – this cancels existing event logic if any
    };

    lengthInput.addEventListener("input", preventLiveAutoFill);
    widthInput.addEventListener("input", preventLiveAutoFill);

    btn.addEventListener("click", () => {
      const length = parseFloat(lengthInput.value);
      const width = parseFloat(widthInput.value);

      if (!isNaN(length) && !isNaN(width) && length > 0 && width > 0) {
        const addedArea = length * width;
        const currentArea = parseFloat(areaInput.value) || 0;
        const newTotal = currentArea + addedArea;

        areaInput.value = Math.round(newTotal);
        lengthInput.value = "";
        widthInput.value = "";

        if (calcDisplay) {
          calcDisplay.textContent = `${Math.round(addedArea)} ft² added`;
        }
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupAreaSection(
    "addGroundUpperDim", 
    "groundUpperLength", 
    "groundUpperWidth", 
    "groundUpperArea", 
    "groundUpperCalc"
  );

  setupAreaSection(
    "addBasementDim", 
    "basementLength", 
    "basementWidth", 
    "basementArea", 
    "basementCalc"
  );
});


})();

