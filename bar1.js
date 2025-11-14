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

// Tooltip
const tooltip = d3.select("#my_dataviz")
  .append("div")
  .attr("class", "tooltip")
  .style("visibility", "hidden");

const SLEEP_COLOR = "#1189A7";
const SNAP_TOLERANCE_X = 40;

// 3. Load data
d3.csv("data.csv").then(data => {
  data.forEach(d => {
    d.Days   = +d.Days;
    d.Health = +d.Health; // ignored
    d.Sleep  = +d.Sleep;
  });

  // 4. X axis (Days)
  const x = d3.scaleBand()
    .domain(data.map(d => d.Days))
    .range([0, width])
    .padding(0.25);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickValues([1,5,10,15,20,25,30]));

  // 5. Y axis (Sleep only)
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.Sleep)])
    .nice()
    .range([height, 0]);

  svg.append("g").call(d3.axisLeft(y));

  // 6. Vertical guide line
  const verticalLine = svg.append("line")
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "#2B2B2B")
    .attr("stroke-width", 2.5)
    .attr("opacity", 0);

  // 7. Draw Sleep bars
  svg.selectAll(".sleepBar")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "sleepBar")
    .attr("x", d => x(d.Days))
    .attr("width", x.bandwidth())
    .attr("y", d => y(d.Sleep))
    .attr("height", d => height - y(d.Sleep))
    .attr("fill", SLEEP_COLOR)
    .attr("opacity", 0.9);

  // 🔑 8. Attach hover handlers to the main <g>, not an overlay rect
  svg
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave);

  function mousemove(event) {
    // coordinates relative to this <g>
    const [mouseX] = d3.pointer(event, svg.node());

    // Find closest day by distance to the center of each bar
    let closestDay = null;
    let minDist = Infinity;

    data.forEach(d => {
      const cx = x(d.Days) + x.bandwidth() / 2;
      const dist = Math.abs(mouseX - cx);
      if (dist < minDist) {
        minDist = dist;
        closestDay = d.Days;
      }
    });

    if (closestDay == null || minDist > SNAP_TOLERANCE_X) return;

    const dPoint = data.find(d => d.Days === closestDay);
    if (!dPoint) return;

    // Tooltip (Sleep only)
    tooltip
      .style("visibility", "visible")
      .style("top", (event.pageY - 48) + "px")
      .style("left", (event.pageX + 24) + "px")
      .html(
        `<b>Day ${closestDay}</b><br>` +
        `Sleep: <span style="
          color:${SLEEP_COLOR};
          font-size:16px;
          font-weight:600;
        ">${dPoint.Sleep.toFixed(2)}</span>`
      );

    // Vertical guide line at bar center
    const barCenter = x(closestDay) + x.bandwidth() / 2;
    verticalLine
      .attr("x1", barCenter)
      .attr("x2", barCenter)
      .attr("opacity", 0.85);

    // Highlight just this bar
    svg.selectAll(".sleepBar")
      .attr("opacity", 0.45);

    svg.selectAll(".sleepBar")
      .filter(d => d.Days === closestDay)
      .attr("opacity", 0.95)
      .raise();
  }

  function mouseleave() {
    tooltip.style("visibility", "hidden");
    verticalLine.attr("opacity", 0);

    svg.selectAll(".sleepBar")
      .attr("opacity", 0.9);
  }

  // 9. X-axis label
  svg.append("text")
    .attr("x", width)
    .attr("y", height + 36)
    .attr("text-anchor", "end")
    .attr("font-size", "15px")
    .text("Days");
});
