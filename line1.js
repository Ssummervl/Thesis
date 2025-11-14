// 1. Define margins and dimensions
const margin = { top: 20, right: 30, bottom: 50, left: 40 },
  width = 860 - margin.left - margin.right,
  height = 420 - margin.top - margin.bottom;

// 2. Append SVG
const svg = d3.select("#my_dataviz")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Tooltip
const tooltip = d3.select("#my_dataviz")
  .append("div")
  .attr("class", "tooltip")
  .style("visibility", "hidden");

// Sleep color
const SLEEP_COLOR = "#1189A7";

// Snap tolerance (vertical distance to line, in pixels)
const SNAP_TOLERANCE = 80;

// 3. Load data
d3.csv("data.csv").then(data => {
  data.forEach(d => {
    d.Days   = +d.Days;
    d.Sleep  = +d.Sleep;
    // Health + Exercise ignored
  });

  // 4. X axis
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Days))
    .range([0, width]);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickValues([1,5,10,15,20,25,30]));

  // 5. Y axis (Sleep only)
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.Sleep)])
    .nice()
    .range([height, 0]);

  svg.append("g")
    .call(d3.axisLeft(y));

  // 6. Sleep line generator
  const sleepLine = d3.line()
    .x(d => x(d.Days))
    .y(d => y(d.Sleep));

  // 7. Vertical guide line
  const verticalLine = svg.append("line")
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "#2B2B2B")
    .attr("stroke-width", 2.5)
    .attr("opacity", 0);

  // 8. Draw Sleep line
  svg.append("path")
    .datum(data)
    .attr("class", "line sleep")
    .attr("fill", "none")
    .attr("stroke", SLEEP_COLOR)
    .attr("stroke-width", 2.5)
    .attr("opacity", 0.9)
    .attr("d", sleepLine);

  // 9. Sleep circles
  svg.selectAll(".circleSleep")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "circleSleep")
    .attr("cx", d => x(d.Days))
    .attr("cy", d => y(d.Sleep))
    .attr("r", 4)
    .attr("fill", SLEEP_COLOR);

  // 10. Use <g> mousemove instead of overlay (fixes "edge-only" issue)
  svg
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave);

  const bisect = d3.bisector(d => d.Days).left;

  function mousemove(event) {
    const [mouseX, mouseY] = d3.pointer(event, svg.node());
    const mouseDay = x.invert(mouseX);

    // Find nearest data point by X
    let idx = bisect(data, mouseDay);
    if (idx >= data.length) idx = data.length - 1;
    if (idx > 0 && (mouseDay - data[idx - 1].Days) < (data[idx].Days - mouseDay)) {
      idx--;
    }

    const dPoint = data[idx];
    if (!dPoint) return;

    // Check vertical snap distance
    const distSleep = Math.abs(y(dPoint.Sleep) - mouseY);
    if (distSleep > SNAP_TOLERANCE) return;

    // Tooltip
    tooltip
      .style("visibility", "visible")
      .style("top", (event.pageY - 48) + "px")
      .style("left", (event.pageX + 24) + "px")
      .html(
        `<b>Day ${dPoint.Days}</b><br>` +
        `Sleep: <span style="
          color:${SLEEP_COLOR};
          font-size:16px;
          font-weight:bold;
        ">${dPoint.Sleep.toFixed(2)}</span>`
      );

    // Vertical guide line
    verticalLine
      .attr("x1", x(dPoint.Days))
      .attr("x2", x(dPoint.Days))
      .attr("opacity", 0.85);

    // Dimming + highlighting
    svg.selectAll(".line")
      .attr("opacity", 0.7)
      .attr("stroke-width", 2.5);

    svg.select(".line.sleep")
      .attr("opacity", 1)
      .attr("stroke-width", 3)
      .raise();

    svg.selectAll("circle")
      .attr("opacity", 0.6)
      .attr("r", 3.5);

    svg.selectAll(".circleSleep")
      .filter(p => p === dPoint)
      .attr("opacity", 1)
      .attr("r", 6)
      .raise();
  }

  function mouseleave() {
    tooltip.style("visibility", "hidden");
    verticalLine.attr("opacity", 0);

    svg.selectAll(".line.sleep")
      .attr("opacity", 0.9)
      .attr("stroke-width", 2.5);

    svg.selectAll("circle")
      .attr("opacity", 1)
      .attr("r", 4);
  }

  // 11. X-axis label
  svg.append("text")
    .attr("x", width)
    .attr("y", height + 36)
    .attr("text-anchor", "end")
    .attr("font-size", "15px")
    .text("Days");
});
