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

// 2A. Tooltip – same style/class as streamgraph/lines
const tooltip = d3.select("#my_dataviz")
  .append("div")
  .attr("class", "tooltip")
  .style("visibility", "hidden");

// --- Legend + color setup ---
const legendData = [
  { key: "Health",   label: "Health",   color: "#F2A202" }, // golden
  { key: "Sleep",    label: "Sleep",    color: "#1189A7" }, // teal-blue
  { key: "Exercise", label: "Exercise", color: "#9E1A4C" }  // magenta-red
];

const colorByKey = {};
legendData.forEach(d => { colorByKey[d.key] = d.color; });

// Small horizontal snap tolerance (in pixels) around each bar
const SNAP_TOLERANCE_X = 40;

// 3. Load data
d3.csv("data.csv").then(data => {
  data.forEach(d => {
    d.Days = +d.Days;
    d.Health = +d.Health;
    d.Sleep = +d.Sleep;
    d.Exercise = +d.Exercise;
  });

  const keys = ["Health", "Sleep", "Exercise"];

  // 4. X axis – one band per day
  const x = d3.scaleBand()
    .domain(data.map(d => d.Days))
    .range([0, width])
    .padding(0.25);

  svg.append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).tickValues([1, 5, 10, 15, 20, 25, 30]));

  // 5. Y axis – stack of Health + Sleep + Exercise
  const y = d3.scaleLinear()
    .domain([
      0,
      d3.max(data, d => d.Health + d.Sleep + d.Exercise)
    ])
    .nice()
    .range([height, 0]);

  svg.append("g").call(d3.axisLeft(y));

  // 6. Vertical guide line (tooltip line)
  const verticalLine = svg.append("line")
    .attr("class", "verticalLine")
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "#2B2B2B")
    .attr("stroke-width", 2.5)
    .attr("opacity", 0);

  // 7. Draw stacked bars
  // For each day, we build segments with cumulative y0/y1 for stacking
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

  // 8. Overlay to capture mouse events over whole chart
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

    // Find closest day by x distance to bar center
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

    // If too far away from any bar, do nothing (prevents jitter)
    if (minDist > SNAP_TOLERANCE_X || closestDay == null) return;

    const dPoint = data.find(d => d.Days === closestDay);
    if (!dPoint) return;

    const total = dPoint.Health + dPoint.Sleep + dPoint.Exercise;

    // Tooltip with all components + total
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
          ">${dPoint[l.key].toFixed(2)}</span>`
        ).join("<br>") +
        `<br><span style="font-size:14px;">Total: <b>${total.toFixed(2)}</b></span>`
      );

    // Vertical guide at center of the bar
    const barCenter = x(closestDay) + x.bandwidth() / 2;
    verticalLine
      .attr("x1", barCenter)
      .attr("x2", barCenter)
      .attr("opacity", 0.85);

    // Highlight this day's whole stack; dim others
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

  // 9. X-axis label (to match your other charts)
  svg.append("text")
    .attr("x", width)
    .attr("y", height + 36)
    .attr("text-anchor", "end")
    .attr("font-size", "15px")
    .text("Days");
});
