// 1. Define margins and dimensions
const margin = { top: 20, right: 30, bottom: 50, left: 40 },
  width = 860 - margin.left - margin.right,
  height = 420 - margin.top - margin.bottom;

// 2. SVG
const svg = d3.select("#my_dataviz")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

// 3. Tooltip
const tooltip = d3.select("#my_dataviz")
  .append("div")
  .attr("class", "tooltip")
  .style("visibility", "hidden");

// --- Colors and legend data (matching streamgraph) ---
const legendData = [
  { key: "Health",   label: "Health",   color: "#9b8211ff" },
  { key: "Sleep",    label: "Sleep",    color: "#0b6075ff" },
  { key: "Exercise", label: "Exercise", color: "#630616ff" }
];
const colorByKey = {};
legendData.forEach(d => { colorByKey[d.key] = d.color; });

// 4. Load data
d3.csv("data.csv").then(data => {
  data.forEach(d => {
    d.Days = +d.Days;
    d.Health = +d.Health;
    d.Sleep = +d.Sleep;
    d.Exercise = +d.Exercise;
  });

  const keys = ["Health", "Sleep", "Exercise"];

  // 5. Scales
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Days))
    .range([0, width]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => Math.max(d.Health, d.Sleep, d.Exercise))])
    .nice()
    .range([height, 0]);

  // Axes
  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).tickValues([1, 5, 10, 15, 20, 25, 30]));
  svg.append("g").call(d3.axisLeft(y));

  // Line generator
  const line = key => d3.line()
    .x(d => x(d.Days))
    .y(d => y(d[key]));

  // Vertical guide
  const verticalLine = svg.append("line")
    .attr("class", "verticalLine")
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "#108ea6")
    .attr("stroke-width", 2.5)
    .attr("opacity", 0);

  // 6. Draw lines
  keys.forEach(key => {
    svg.append("path")
      .datum(data)
      .attr("class", "line " + key.toLowerCase())
      .attr("fill", "none")
      .attr("stroke", colorByKey[key])
      .attr("stroke-width", 2.5)
      .attr("opacity", 0.9)
      .attr("d", line(key));
  });

  // 7. Add circles
  keys.forEach(key => {
    svg.selectAll(".circle" + key)
      .data(data)
      .enter()
      .append("circle")
      .attr("class", "circle" + key)
      .attr("cx", d => x(d.Days))
      .attr("cy", d => y(d[key]))
      .attr("r", 4)
      .attr("fill", colorByKey[key]);
  });

  // 8. Transparent rectangle to capture mouse events
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
    const [mouseX] = d3.pointer(event);
    const mouseDay = x.invert(mouseX);

    let idx = bisect(data, mouseDay);
    if (idx > 0 && (mouseDay - data[idx - 1].Days) < (data[idx].Days - mouseDay)) idx--;
    const dPoint = data[idx];
    if (!dPoint) return;

    const values = { 
      "Health": dPoint.Health,
      "Sleep": dPoint.Sleep,
      "Exercise": dPoint.Exercise 
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
            font-weight:600;
          ">${values[l.key].toFixed(2)}</span>`
        ).join("<br>")
      );

    // Vertical guide
    verticalLine
      .attr("x1", x(dPoint.Days))
      .attr("x2", x(dPoint.Days))
      .attr("opacity", 0.85);

    // Highlight points closest to the vertical line
    keys.forEach(key => {
      d3.selectAll(".circle" + key)
        .attr("r", 3)
        .attr("opacity", 0.4);
    });
    keys.forEach(key => {
      d3.selectAll(".circle" + key)
        .filter(p => p === dPoint)
        .attr("r", 6)
        .attr("opacity", 1);
    });
  }

  function mouseleave() {
    tooltip.style("visibility", "hidden");
    verticalLine.attr("opacity", 0);
    keys.forEach(key => {
      d3.selectAll(".circle" + key)
        .attr("r", 4)
        .attr("opacity", 1);
    });
  }

  // 9. X-axis label
  svg.append("text")
    .attr("x", width)
    .attr("y", height + 36)
    .attr("text-anchor", "end")
    .attr("font-size", "15px")
    .text("Days");
});
