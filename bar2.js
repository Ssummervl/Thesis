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

// --- Colors & series keys ---
const legendData = [
  { key: "Health", label: "Health", color: "#F2A202" }, // golden
  { key: "Sleep",  label: "Sleep",  color: "#1189A7" }  // teal-blue
];

const colorByKey = {};
legendData.forEach(d => colorByKey[d.key] = d.color);

// Snap tolerance for X-distance to bar center
const SNAP_TOLERANCE_X = 40;

// 3. Load data
d3.csv("data.csv").then(data => {
  data.forEach(d => {
    d.Days   = +d.Days;
    d.Health = +d.Health;
    d.Sleep  = +d.Sleep;
    // Ignore Exercise from CSV
  });

  const keys = ["Health", "Sleep"];

  // 4. X axis (Days)
  const x = d3.scaleBand()
    .domain(data.map(d => d.Days))
    .range([0, width])
    .padding(0.25);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickValues([1,5,10,15,20,25,30]));

  // 5. Y axis (Health + Sleep total)
  const y = d3.scaleLinear()
    .domain([
      0,
      d3.max(data, d => d.Health + d.Sleep)
    ])
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

  // 7. Draw stacked bars
  svg.selectAll(".dayGroup")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "dayGroup")
    .attr("transform", d => `translate(${x(d.Days)},0)`)
    .selectAll("rect")
    .data(d => {
      let y0 = 0;
      return keys.map(k => {
        const v = d[k];
        const seg = {
          key: k,
          day: d.Days,
          value: v,
          y0: y0,
          y1: y0 + v
        };
        y0 += v;
        return seg;
      });
    })
    .enter()
    .append("rect")
    .attr("class", d => "segment segment-" + d.key.toLowerCase())
    .attr("x", 0)
    .attr("width", x.bandwidth())
    .attr("y", d => y(d.y1))
    .attr("height", d => y(d.y0) - y(d.y1))
    .attr("fill", d => colorByKey[d.key])
    .attr("opacity", 0.9);

  // 8. Full-area hover overlay
  svg.append("rect")
    .attr("class", "overlay")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave);

  function mousemove(event) {
    const [mouseX] = d3.pointer(event);

    // 1. Determine closest Day by horizontal snap
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

    // outside snap range → do nothing (no flicker)
    if (minDist > SNAP_TOLERANCE_X) return;

    const dPoint = data.find(d => d.Days === closestDay);
    const total = dPoint.Health + dPoint.Sleep;

    // Tooltip
    tooltip
      .style("visibility", "visible")
      .style("top", (event.pageY - 48) + "px")
      .style("left", (event.pageX + 24) + "px")
      .html(
        `<b>Day ${closestDay}</b><br>` +
        legendData.map(l =>
          `${l.label}: <span style="
            color:${l.color};
            font-size:16px;
            font-weight:600;
          ">${dPoint[l.key].toFixed(2)}</span>`
        ).join("<br>") +
        `<br><span style="font-size:14px;">Total: <b>${total.toFixed(2)}</b></span>`
      );

    // vertical guide line
    const barCenter = x(closestDay) + x.bandwidth() / 2;
    verticalLine
      .attr("x1", barCenter)
      .attr("x2", barCenter)
      .attr("opacity", 0.85);

    // highlight only this day's segments
    svg.selectAll(".segment")
      .attr("opacity", 0.45);

    svg.selectAll(".segment")
      .filter(seg => seg.day === closestDay)
      .attr("opacity", 0.95)
      .raise();
  }

  function mouseleave() {
    tooltip.style("visibility", "hidden");
    verticalLine.attr("opacity", 0);

    svg.selectAll(".segment")
      .attr("opacity", 0.9);
  }

  // 9. X-Axis label
  svg.append("text")
    .attr("x", width)
    .attr("y", height + 36)
    .attr("text-anchor", "end")
    .attr("font-size", "15px")
    .text("Days");
});
