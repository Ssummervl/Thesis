// Margins and dimensions
const margin = { top: 20, right: 30, bottom: 60, left: 40 },
      width = 860 - margin.left - margin.right,
      height = 420 - margin.top - margin.bottom;

// Create SVG
const svg = d3.select("#my_dataviz")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

// --- Jewel gradients ---
const defs = svg.append("defs");

function addGradient(id, stops) {
  const grad = defs.append("linearGradient")
    .attr("id", id)
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "0%").attr("y2", "100%");
  stops.forEach(stop =>
    grad.append("stop")
      .attr("offset", stop.offset)
      .attr("stop-color", stop.color)
      .attr("stop-opacity", stop.opacity ?? 1)
  );
}

// Sleep: jewel toned blue - aquamarine
addGradient("gradientSleep", [
  { offset: "0%", color: "#19f0ffff", opacity: 0.88 },
  { offset: "100%", color: "#0b6075ff", opacity: 0.80 }
]);

// --- Savitzky-Golay Smoothing ---
function savitzkyGolay(y, windowSize, polynomialOrder) {
  const half = Math.floor(windowSize / 2);
  const result = new Array(y.length).fill(0);
  const coeffs = getSavitzkyGolayCoefficients(windowSize, polynomialOrder);

  for (let i = 0; i < y.length; i++) {
    let smoothed = 0;
    for (let j = -half; j <= half; j++) {
      const idx = i + j;
      const validIdx = Math.min(y.length - 1, Math.max(0, idx));
      smoothed += coeffs[j + half] * y[validIdx];
    }
    result[i] = smoothed;
  }

  return result;
}

function getSavitzkyGolayCoefficients(windowSize, order) {
  const precomputed = {
    "5_2": [-3, 12, 17, 12, -3].map(c => c / 35),
    "7_2": [-2, 3, 6, 7, 6, 3, -2].map(c => c / 21),
    "9_2": [-21, 14, 39, 54, 59, 54, 39, 14, -21].map(c => c / 231)
  };
  const key = `${windowSize}_${order}`;
  if (!precomputed[key]) {
    console.warn(`No Savitzky-Golay coefficients for window=${windowSize}, order=${order}`);
    return new Array(windowSize).fill(1 / windowSize); // fallback: simple average
  }
  return precomputed[key];
}

// Tooltip div (using class for CSS style)
const tooltip = d3.select("#my_dataviz")
  .append("div")
  .attr("class", "tooltip")
  .style("visibility", "hidden");

// --- Legend/color setup (SLEEP ONLY) ---
const legendData = [
  { key: "SleepAvg", label: "Sleep", color: "#094C5D" }
];

const fillByKey = {
  "SleepAvg": "url(#gradientSleep)"
};

// --- Load data and build everything ---
d3.csv("data.csv").then(data => {
  data.forEach(d => {
    d.Days = +d.Days;
    d.Sleep = +d.Sleep;
    // You can keep Health/Exercise in the CSV; we just ignore them here
  });

  // Compute Savitzky-Golay smoothed values for Sleep only
  const windowSize = 5;  // Must be odd
  const order = 2;       // Polynomial order (2 = quadratic)

  const sleepAvg = savitzkyGolay(data.map(d => d.Sleep), windowSize, order);

  data.forEach((d, i) => {
    d.SleepAvg = sleepAvg[i];
  });

  // STREAMGRAPH SETUP — SINGLE KEY
  const keys = ["SleepAvg"];
  const stack = d3.stack()
    .keys(keys)
    .offset(d3.stackOffsetWiggle);
  const stackedData = stack(data);

  // SCALES
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Days))
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([
      d3.min(stackedData, layer => d3.min(layer, d => d[0])),
      d3.max(stackedData, layer => d3.max(layer, d => d[1]))
    ])
    .range([height, 0]);

  // AREA GENERATOR
  const area = d3.area()
    .x((d, i) => x(data[i].Days))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveCatmullRom);

  // VERTICAL GUIDE LINE
  const verticalLine = svg.append("line")
    .attr("class", "verticalLine")
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "#2b2b2b")
    .attr("stroke-width", 2.5)
    .attr("opacity", 0);

  // DRAW STREAM LAYER (SLEEP ONLY)
  keys.forEach((streamKey, i) => {
    const layer = stackedData[i];
    const legendEntry = legendData.find(d => d.key === streamKey);
    const label = legendEntry.label;
    const color = legendEntry.color;

    svg.append("path")
      .datum(layer)
      .attr("class", "area " + streamKey.replace("Avg", "").toLowerCase())
      .attr("fill", fillByKey[streamKey])
      .attr("d", area)
      .attr("opacity", 0.90)
      .style("cursor", "pointer")
      .on("mousemove", function(event) {
        const [mouseX] = d3.pointer(event);
        const mouseDay = x.invert(mouseX);
        const bisect = d3.bisector(d => d.Days).left;
        let idx = bisect(data, mouseDay);
        if (idx > 0 && (mouseDay - data[idx-1].Days) < (data[idx].Days - mouseDay)) idx--;

        const dPoint = data[idx];
        if (!dPoint) return;

        const values = {
          "SleepAvg": dPoint.SleepAvg
        };

        tooltip
          .style("visibility", "visible")
          .style("top", (event.pageY - 48) + "px")
          .style("left", (event.pageX + 24) + "px")
          .html(
            `<b>Day ${dPoint.Days}</b><br>` +
            legendData.map(l =>
              `${l.label}: <span style="
                color:${l.color};
                font-size:16px;
                font-weight:bold;
                text-shadow:0 1px 6px #fff8;
                opacity:1;
              ">${values[l.key].toFixed(2)}</span>`
            ).join("<br>")
          );

        verticalLine
          .attr("x1", x(dPoint.Days))
          .attr("x2", x(dPoint.Days))
          .attr("opacity", 0.85);

        d3.selectAll(".area").attr("opacity", 0.28);
        d3.select(this).attr("opacity", 0.99).raise();
      })
      .on("mouseleave", function() {
        tooltip.style("visibility", "hidden");
        verticalLine.attr("opacity", 0);
        d3.selectAll(".area").attr("opacity", 0.90);
      });
  });

  // X AXIS
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickValues([1, 5, 10, 15, 20, 25, 30]))
    .call(g => g.select(".domain").remove())
    .call(g => g.selectAll(".tick line").remove());

  svg.append("text")
    .attr("x", width)
    .attr("y", height + 38)
    .attr("text-anchor", "end")
    .attr("font-size", "15px")
    .text("Days");

}).catch(error => {
  svg.append("text")
    .attr("x", width/2)
    .attr("y", height/2)
    .attr("text-anchor", "middle")
    .attr("fill", "red")
    .text("Failed to load data. Please check data.csv.");
});
