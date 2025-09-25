// CEC Section 8 single-dwelling calculator (CSA C22.1:24) - v3

// Adds explicit basement handling per 8-110 (75% of basement >= 1.8 m) and auto-computed living area.

(function(){

  const $ = (id) => document.getElementById(id);

  const fmtW = (n) => new Intl.NumberFormat().format(Math.round(n));

  const fmtA = (n) => new Intl.NumberFormat(undefined, {maximumFractionDigits: 1}).format(n);

  const SQFT_PER_SQM = 10.763910416709722;

  const state = { appliances: [] };

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

  function rangeDemand(rangeCount, rangeWatts){

    if(rangeCount <= 0) return 0;

    let total = 0;

    for(let i=0;i<rangeCount;i++){

      const rating = Math.max(0, rangeWatts);

      const over = Math.max(0, rating - 12000);

      total += 6000 + 0.40 * over; // per 8-200(1)(a)(iv)

    }

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

    // Electric space heating always demanded at 100% (inputs already in watts)

    const spaceHeatConnectedW = parseFloat($("spaceHeatConnected").value) || 0;

    const spaceHeatDemandW = spaceHeatConnectedW;

    const acW = parseFloat($("airCond").value) || 0;

    const interlock = $("interlock").value === "yes";

    const rangeCount = parseInt($("rangeCount").value || "0", 10);

    const rangeWatts = parseFloat($("rangeWatts").value) || 0;

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

    const rangesW = rangeDemand(rangeCount, rangeWatts);

    // 4) Special water heating - 8-200(1)(a)(v)

    const specialWHW = tanklessWatts + specialWHWatts;

    // 5) EVSE - 8-200(1)(a)(vi) + EVEMS exclusion 8-106(11)

    const evseW = evems ? 0 : evseCount * evseWatts;

    // Build 'other >1500 W' pool: manual appliances + storage WH

    const appliancesW = state.appliances.reduce((sum, a) => sum + a.watts, 0) + storageWHWatts;

    // 6) Other >1500 W - 8-200(1)(a)(vii)

    const otherW = otherLoadsDemandW(rangeCount > 0, appliancesW);

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



  $("addAppliance").addEventListener("click", addAppliance);

  $("calcBtn").addEventListener("click", calculate);

  $("calcForm").addEventListener("input", (e) => {

    const id = e.target && e.target.id;

    const instant = ["groundUpperArea","basementArea",

                     "spaceHeatConnected","airCond","interlock",

                     "rangeCount","rangeWatts","tanklessWatts","specialWHWatts","storageWHWatts",

                     "evseCount","evseWatts","evems","voltage","applianceWatts","applianceName"].includes(id);

    if(instant){ calculate(); }

  });

  // Initial render
  renderApplianceList();
  calculate();

})();