// 1. Define margins and dimensions of the graph container
const margin = { top: 20, right: 30, bottom: 50, left: 40 },
  width = 860 - margin.left - margin.right,
  height = 420 - margin.top - margin.bottom;

// 2. Append the SVG object to the container
const svg = d3.select("#my_dataviz")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

// 2A. Tooltip – same style/class as streamgraph
const tooltip = d3.select("#my_dataviz")
  .append("div")
  .attr("class", "tooltip")
  .style("visibility", "hidden");

// --- Legend + color setup (Health + Sleep only) ---
const legendData = [
  { key: "Health", label: "Health", color: "#F2A202" }, // goldenrod-ish
  { key: "Sleep",  label: "Sleep",  color: "#1189A7" }  // deep aquamarine
];

// Helper map
const colorByKey = {};
legendData.forEach(d => { colorByKey[d.key] = d.color; });

// Snap tolerance in pixels (vertical distance from line)
const SNAP_TOLERANCE = 18;

// 3. Fetch data from CSV and create the line graph
d3.csv("data.csv").then((data) => {
  // Parse numeric values
  data.forEach((d) => {
    d.Days   = +d.Days;
    d.Health = +d.Health;
    d.Sleep  = +d.Sleep;
    d.Exercise = +d.Exercise; // can exist in CSV; we just ignore it
  });

  const keys = ["Health", "Sleep"];

  // 4. X-axis setup — linear so we can invert
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Days))
    .range([0, width]);

  const xAxis = d3.axisBottom(x)
    .tickValues([1, 5, 10, 15, 20, 25, 30]); // adjust if needed

  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(xAxis);

  // 5. Y-axis setup (Health + Sleep only)
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, (d) => Math.max(d.Health, d.Sleep))])
    .nice()
    .range([height, 0]);

  svg.append("g").call(d3.axisLeft(y));

  // 6. Line generator factory
  function makeLine(key) {
    return d3.line()
      .x(d => x(d.Days))
      .y(d => y(d[key]));
  }

  // 7. Vertical guide line — same idea as streamgraph
  const verticalLine = svg.append("line")
    .attr("class", "verticalLine")
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "#2B2B2B")
    .attr("stroke-width", 2.5)
    .attr("opacity", 0);

  // 8. Draw lines for Health + Sleep
  keys.forEach((key) => {
    const lineGen = makeLine(key);

    svg.append("path")
      .datum(data)
      .attr("class", "line " + key.toLowerCase())
      .attr("fill", "none")
      .attr("stroke", colorByKey[key])
      .attr("stroke-width", 2.5)
      .attr("opacity", 0.9)
      .attr("d", lineGen);
  });

  // 9. Add circles for each data series
  svg.selectAll(".circleHealth")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "circleHealth")
    .attr("cx", d => x(d.Days))
    .attr("cy", d => y(d.Health))
    .attr("r", 4)
    .attr("fill", colorByKey["Health"]);

  svg.selectAll(".circleSleep")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "circleSleep")
    .attr("cx", d => x(d.Days))
    .attr("cy", d => y(d.Sleep))
    .attr("r", 4)
    .attr("fill", colorByKey["Sleep"]);

  // 10. Transparent overlay to capture mouse events over whole chart
  svg.append("rect")
    .attr("class", "overlay")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave);

  const bisect = d3.bisector(d => d.Days).left;

  function mousemove(event) {
    const [mouseX, mouseY] = d3.pointer(event);
    const mouseDay = x.invert(mouseX);

    let idx = bisect(data, mouseDay);
    if (idx >= data.length) idx = data.length - 1;
    if (idx > 0 && (mouseDay - data[idx - 1].Days) < (data[idx].Days - mouseDay)) {
      idx--;
    }

    const dPoint = data[idx];
    if (!dPoint) return;

    const values = {
      "Health": dPoint.Health,
      "Sleep":  dPoint.Sleep
    };

    // Distances (in pixels) between mouse Y and each line at this x
    const distHealth = Math.abs(y(dPoint.Health) - mouseY);
    const distSleep  = Math.abs(y(dPoint.Sleep)  - mouseY);

    const minDist = Math.min(distHealth, distSleep);

    // If too far from both lines, don't update anything (keeps last tooltip, avoids flicker)
    if (minDist > SNAP_TOLERANCE) {
      return;
    }

    // Determine closest series
    const keyHighlight = distHealth <= distSleep ? "Health" : "Sleep";

    // Tooltip shows BOTH variables, highlighting the one closest to the mouse
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
            font-weight:${l.key === keyHighlight ? 'bold' : 'normal'};
            text-shadow:${l.key === keyHighlight ? '0 1px 6px #fff8' : 'none'};
            opacity:${l.key === keyHighlight ? 1 : 0.7};
          ">${values[l.key].toFixed(2)}</span>`
        ).join("<br>")
      );

    // Move vertical guide
    verticalLine
      .attr("x1", x(dPoint.Days))
      .attr("x2", x(dPoint.Days))
      .attr("opacity", 0.85);

    // Dim both lines slightly, then highlight the one closest to the mouse
    svg.selectAll(".line")
      .attr("opacity", 0.7)
      .attr("stroke-width", 2.5);

    svg.select(".line." + keyHighlight.toLowerCase())
      .attr("opacity", 1)
      .attr("stroke-width", 3)
      .raise();

    // Circles: fade all, then emphasize the highlighted series at this day
    svg.selectAll("circle")
      .attr("opacity", 0.6)
      .attr("r", 3.5);

    svg.selectAll(".circle" + keyHighlight)
      .filter(p => p === dPoint)
      .attr("opacity", 1)
      .attr("r", 6)
      .raise();
  }

  function resetStyles() {
    svg.selectAll(".line")
      .attr("opacity", 0.9)
      .attr("stroke-width", 2.5);

    svg.selectAll("circle")
      .attr("opacity", 1)
      .attr("r", 4);
  }

  function mouseleave() {
    tooltip.style("visibility", "hidden");
    verticalLine.attr("opacity", 0);
    resetStyles();
  }

  // 11. X-axis label (optional, to match streamgraph style)
  svg.append("text")
    .attr("x", width)
    .attr("y", height + 36)
    .attr("text-anchor", "end")
    .attr("font-size", "15px")
    .text("Days");
});
