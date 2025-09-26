// CEC Section 8 single-dwelling calculator (CSA C22.1:24) - v3

// Adds explicit basement handling per 8-110 (75% of basement >= 1.8 m) and auto-computed living area.

(function(){

  const $ = (id) => document.getElementById(id);

  const fmtW = (n) => new Intl.NumberFormat().format(Math.round(n));

  const fmtA = (n) => new Intl.NumberFormat(undefined, {maximumFractionDigits: 1}).format(n);

  const SQFT_PER_SQM = 10.763910416709722;

  const state = { appliances: [], spaceHeat: [], airCond: [], ranges: [] };

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

    console.log("Added range", item);

    if(nameEl){ nameEl.value = ""; }
    if(countEl){ countEl.value = countEl.defaultValue || "1"; }
    if(wattsEl){ wattsEl.value = wattsEl.defaultValue || ""; }

    renderRangeList();
    calculate();

  }

  function renderApplianceList(){

    const host = $("applianceList");

    host.innerHTML = "";

    state.appliances.forEach((a, idx) => {

      const row = document.createElement("div");

      row.className = "item";

      const name = document.createElement("div");

      name.textContent = a.name;

      const val = document.createElement("div");

      val.className = "mono";

      val.textContent = `${fmtW(a.watts)} W`;

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

    const name = $("applianceName").value.trim();

    const watts = parseFloat($("applianceWatts").value);

    if(!name || isNaN(watts) || watts <= 0){ return; }

    state.appliances.push({name, watts: Math.round(watts)});

    $("applianceName").value = "";

    $("applianceWatts").value = "";

    renderApplianceList();

    calculate();

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

    const { livingSqM, exclusiveSqM, livingFt2, exclusiveFt2 } = computeAreas();

    const livingAreaSqM = livingSqM;

    const exclusiveAreaSqM = exclusiveSqM;

    // Electric space heating always demanded at 100% (tracked per-entry in watts)

    const spaceHeatDemandW = state.spaceHeat.reduce((sum, item) => sum + item.watts, 0);

    const acW = state.airCond.reduce((sum, item) => sum + item.watts, 0);

    const interlock = $("interlock").value === "yes";

    const totalRanges = state.ranges.reduce((sum, item) => sum + item.count, 0);

    const tanklessWatts = parseFloat($("tanklessWatts").value) || 0;

    const specialWHWatts = parseFloat($("specialWHWatts").value) || 0;

    const storageWHWatts = parseFloat($("storageWHWatts").value) || 0;

    const evseCount = parseInt($("evseCount").value || "0", 10);

    const evseWatts = parseFloat($("evseWatts").value) || 0;

    const evems = $("evems").value === "yes";

    const voltage = parseFloat($("voltage").value) || 240;

    // 1) Basic load from area - 8-200(1)(a)(i)(ii)

    let basic = 0;

    if(livingAreaSqM > 0){

      basic = 5000; // first 90 m^2 equivalent

      const extra = Math.max(0, livingAreaSqM - 90);

      if(extra > 0){

        const blocks = Math.ceil(extra / 90);

        basic += blocks * 1000;

      }

    }

    // 2) Space conditioning - 8-106(3)

    const heatW = spaceHeatDemandW;

    const spaceCondW = interlock ? Math.max(heatW, acW) : (heatW + acW);

    // 3) Ranges - 8-200(1)(a)(iv)

    const rangesW = rangeDemand(state.ranges);

    // 4) Special water heating - 8-200(1)(a)(v)

    const specialWHW = tanklessWatts + specialWHWatts;

    // 5) EVSE - 8-200(1)(a)(vi) + EVEMS exclusion 8-106(11)

    const evseW = evems ? 0 : evseCount * evseWatts;

    // Build 'other >1500 W' pool: manual appliances + storage WH

    const appliancesW = state.appliances.reduce((sum, a) => sum + a.watts, 0) + storageWHWatts;

    // 6) Other >1500 W - 8-200(1)(a)(vii)

    const otherW = otherLoadsDemandW(totalRanges > 0, appliancesW);

    // Path A total

    const pathA = basic + spaceCondW + rangesW + specialWHW + evseW + otherW;

    // Path B fixed minimum - 8-200(1)(b)

    const pathB = (exclusiveAreaSqM >= 80) ? 24000 : 14400;

    const calcLoad = Math.max(pathA, pathB);

    const amps = calcLoad / voltage;

    $("pathA").textContent = fmtW(pathA);

    $("pathB").textContent = fmtW(pathB);

    $("calcLoad").textContent = fmtW(calcLoad);

    $("minAmps").textContent = fmtA(amps);

    $("voltsLabel").textContent = voltage;

    $("debug").textContent =

      `LivingArea:${fmtA(livingFt2)} ft^2  Basic:${fmtW(basic)}  Heat(demanded):${fmtW(heatW)}  AC:${fmtW(acW)}  ` +

      `Ranges:${fmtW(rangesW)}  SpecialWH:${fmtW(specialWHW)}  EVSE:${fmtW(evseW)}  Other>${fmtW(otherW)}  ` +

      `(AppliancesPool:${fmtW(appliancesW)}  ExclusiveNoBasement:${fmtA(exclusiveFt2)} ft^2)`;

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

  const addApplianceBtn = $("addAppliance");

  if(addApplianceBtn){

    addApplianceBtn.addEventListener("click", addAppliance);

  }

  $("calcBtn").addEventListener("click", calculate);

  $("calcForm").addEventListener("input", (e) => {

    const id = e.target && e.target.id;

    const instant = [
                     "groundUpperArea","basementArea",
                     "spaceHeatName","spaceHeatType","spaceHeatValue","spaceHeatVoltage",
                     "airCondName","airCondType","airCondValue","airCondVoltage",
                     "rangeName","rangeCount","rangeWatts","interlock",
                     "tanklessWatts","specialWHWatts","storageWHWatts",
                     "evseCount","evseWatts","evems","voltage","applianceWatts","applianceName"].includes(id);

    if(instant){ calculate(); }

    if(id === "spaceHeatType"){ updateSpaceHeatInputMode(); }

    if(id === "airCondType"){ updateAirCondInputMode(); }

  });

  // Initial render

  updateSpaceHeatInputMode();

  updateAirCondInputMode();

  renderSpaceHeatList();

  renderAirCondList();

  renderRangeList();

  renderApplianceList();

  calculate();

})();

