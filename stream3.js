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
      .attr("stop-opacity", stop.opacity ?? 1));
}

// Health: yellow - Goldenrod
addGradient("gradientHealth", [
  { offset: "0%", color: "#ecdf27ff", opacity: 0.95 },
  { offset: "100%", color: "#d87c04ff", opacity: 0.82 }
]);
// Sleep: jewel toned blue - aquamarine
addGradient("gradientSleep", [
  { offset: "0%", color: "#19f0ffff", opacity: 0.88 },
  { offset: "100%", color: "#0b6075ff", opacity: 0.80 }
]);
// Exercise: red - magenta?
addGradient("gradientExercise", [
  { offset: "0%", color: "#d61877ff", opacity: 0.92 },
  { offset: "100%", color: "#6b051bff", opacity: 0.82 }
]);

// --- NO glow filter or glow circles ---

// Helper: Rolling Average
function rollingAverage(values, windowSize) {
  const avg = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const win = values.slice(start, i + 1);
    avg.push(d3.mean(win));
  }
  return avg;
}

// Tooltip div (using class for CSS style)
const tooltip = d3.select("#my_dataviz")
  .append("div")
  .attr("class", "tooltip")
  .style("visibility", "hidden");

// --- Legend and color setup ---
const legendData = [
  { key: "HealthAvg", label: "Health", color: "#9b8211ff" },
  { key: "SleepAvg", label: "Sleep", color: "#0b6075ff" },
  { key: "ExerciseAvg", label: "Exercise", color: "#630616ff" }
];
const fillByKey = {
  "HealthAvg": "url(#gradientHealth)",
  "SleepAvg": "url(#gradientSleep)",
  "ExerciseAvg": "url(#gradientExercise)"
};

// --- Load data and build everything ---
d3.csv("data.csv").then(data => {
  data.forEach(d => {
    d.Days = +d.Days;
    d.Health = +d.Health;
    d.Sleep = +d.Sleep;
    d.Exercise = +d.Exercise;
  });

  // Compute rolling averages
  const healthAvg = rollingAverage(data.map(d => d.Health), 5);
  const sleepAvg = rollingAverage(data.map(d => d.Sleep), 5);
  const exerciseAvg = rollingAverage(data.map(d => d.Exercise), 5);
 
  data.forEach((d, i) => {
    d.HealthAvg = healthAvg[i];
    d.SleepAvg = sleepAvg[i];
    d.ExerciseAvg = exerciseAvg[i];
  });

  // STREAMGRAPH SETUP: Health (bottom), Sleep (middle), Exercise (top)
  const keys = ["HealthAvg", "SleepAvg", "ExerciseAvg"];
  const stack = d3.stack().keys(keys).offset(d3.stackOffsetWiggle);
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

  // VERTICAL GUIDE LINE (one, reused)
  const verticalLine = svg.append("line")
    .attr("class", "verticalLine")
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "#108ea6")
    .attr("stroke-width", 2.5)
    .attr("opacity", 0);

  // DRAW EACH STREAM LAYER WITH INDIVIDUAL INTERACTIVITY
  keys.forEach((streamKey, i) => {
    const layer = stackedData[i];
    const label = legendData.find(d => d.key === streamKey).label;
    const color = legendData.find(d => d.key === streamKey).color;

    svg.append("path")
      .datum(layer)
      .attr("class", "area " + streamKey.replace("Avg", "").toLowerCase())
      .attr("fill", fillByKey[streamKey])
      .attr("d", area)
      .attr("opacity", 0.90)
      .style("cursor", "pointer")
      .on("mousemove", function(event) {
        // Find the closest data point for this stream
        const [mouseX] = d3.pointer(event);
        const mouseDay = x.invert(mouseX);
        const bisect = d3.bisector(d => d.Days).left;
        let idx = bisect(data, mouseDay);
        if (idx > 0 && (mouseDay - data[idx-1].Days) < (data[idx].Days - mouseDay)) idx--;

        const d = data[idx];
        if (!d) return;

        // All values for this day:
        const values = {
          "HealthAvg": d.HealthAvg,
          "SleepAvg": d.SleepAvg,
          "ExerciseAvg": d.ExerciseAvg
        };

        // Tooltip: highlight only hovered stream
        tooltip
          .style("visibility", "visible")
          .style("top", (event.pageY - 48) + "px")
          .style("left", (event.pageX + 24) + "px")
          .html(
            `<b>Day ${d.Days}</b><br>` +
            legendData.map(l =>
              `${l.label}: <span style="
                color:${l.color};
                font-size:16px;
                font-weight:${l.key === streamKey ? 'bold' : 'normal'};
                text-shadow:${l.key === streamKey ? '0 1px 6px #fff8' : 'none'};
                opacity:${l.key === streamKey ? 1 : 0.7};
              ">${values[l.key].toFixed(2)}</span>`
            ).join("<br>")
          );

        // Move vertical line
        verticalLine
          .attr("x1", x(d.Days))
          .attr("x2", x(d.Days))
          .attr("opacity", 0.85);

        // Highlight this area, de-emphasize others
        d3.selectAll(".area").attr("opacity", 0.28);
        d3.select(this).attr("opacity", 0.99).raise();
      })
      .on("mouseleave", function() {
        tooltip.style("visibility", "hidden");
        verticalLine.attr("opacity", 0);
        // Reset all areas to normal
        d3.selectAll(".area").attr("opacity", 0.90);
      });
  });

  // --- NO sleep glow circles ---

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

  // LEGEND
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(0, ${height + 48})`);

  legend.selectAll("rect")
    .data(legendData)
    .enter()
    .append("rect")
    .attr("x", (d, i) => i * 140)
    .attr("y", 0)
    .attr("width", 22)
    .attr("height", 16)
    .attr("rx", 4)
    .attr("fill", d => d.color)
    .attr("stroke", "#888")
    .attr("stroke-width", 1.2)
    .attr("opacity", 0.84);

  legend.selectAll("text")
    .data(legendData)
    .enter()
    .append("text")
    .attr("x", (d, i) => i * 140 + 30)
    .attr("y", 13)
    .text(d => d.label)
    .attr("font-size", 15)
    .attr("fill", "#222");

}).catch(error => {
  svg.append("text")
    .attr("x", width/2)
    .attr("y", height/2)
    .attr("text-anchor", "middle")
    .attr("fill", "red")
    .text("Failed to load data. Please check data.csv.");
});
