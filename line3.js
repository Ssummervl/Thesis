// 1. Define margins and dimensions
const margin = { top: 20, right: 30, bottom: 50, left: 40 },
  width = 860 - margin.left - margin.right,
  height = 420 - margin.top - margin.bottom;

// 2. SVG setup
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

// Legend + color setup
const legendData = [
  { key: "Health",   label: "Health",   color: "#F2A202" },
  { key: "Sleep",    label: "Sleep",    color: "#1189A7" },
  { key: "Exercise", label: "Exercise", color: "#9E1A4C" }
];

const colorByKey = {};
legendData.forEach(d => colorByKey[d.key] = d.color);

// Snap tolerance
const SNAP_TOLERANCE = 70;

// 3. Load data
d3.csv("data.csv").then(data => {

  data.forEach(d => {
    d.Days = +d.Days;
    d.Health = +d.Health;
    d.Sleep = +d.Sleep;
    d.Exercise = +d.Exercise;
  });

  const keys = ["Health", "Sleep", "Exercise"];

  // 4. X axis
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.Days))
    .range([0, width]);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickValues([1,5,10,15,20,25,30]));

  // 5. Y axis
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => Math.max(d.Health, d.Sleep, d.Exercise))])
    .nice()
    .range([height, 0]);

  svg.append("g").call(d3.axisLeft(y));

  // 6. Line generator
  const makeLine = key => d3.line()
    .x(d => x(d.Days))
    .y(d => y(d[key]));

  // 7. Vertical guide line (tooltip line)
  const verticalLine = svg.append("line")
    .attr("class", "verticalLine")
    .attr("y1", 0)
    .attr("y2", height)
    .attr("stroke", "#2B2B2B")   // updated per request
    .attr("stroke-width", 2.5)
    .attr("opacity", 0);

  // 8. Draw all lines
  keys.forEach(key => {
    svg.append("path")
      .datum(data)
      .attr("class", "line " + key.toLowerCase())
      .attr("fill", "none")
      .attr("stroke", colorByKey[key])
      .attr("stroke-width", 2.5)
      .attr("opacity", 0.9)
      .attr("d", makeLine(key));
  });

  // 9. Circles for each line
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

  // 10. Overlay for full-area tooltip
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
    if (idx > 0 && Math.abs(mouseDay - data[idx-1].Days) < Math.abs(mouseDay - data[idx].Days)) {
      idx--;
    }

    const dPoint = data[idx];

    const distances = {
      Health:   Math.abs(y(dPoint.Health)   - mouseY),
      Sleep:    Math.abs(y(dPoint.Sleep)    - mouseY),
      Exercise: Math.abs(y(dPoint.Exercise) - mouseY)
    };

    // Closest series
    const keyHighlight = Object.entries(distances)
      .sort((a,b) => a[1] - b[1])[0][0];

    const minDist = distances[keyHighlight];

    // If too far away, do NOT flicker — simply don't update
    if (minDist > SNAP_TOLERANCE) return;

    // Tooltip
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
          ">${dPoint[l.key].toFixed(2)}</span>`
        ).join("<br>")
      );

    // Move vertical line
    verticalLine
      .attr("x1", x(dPoint.Days))
      .attr("x2", x(dPoint.Days))
      .attr("opacity", 0.85);

    // Dim all lines except highlighted
    svg.selectAll(".line")
      .attr("opacity", 0.6)
      .attr("stroke-width", 2.5);

    svg.select(".line." + keyHighlight.toLowerCase())
      .attr("opacity", 1)
      .attr("stroke-width", 3)
      .raise();

    // Circles
    svg.selectAll("circle")
      .attr("opacity", 0.5)
      .attr("r", 3.5);

    svg.selectAll(".circle" + keyHighlight)
      .filter(p => p === dPoint)
      .attr("opacity", 1)
      .attr("r", 6)
      .raise();
  }

  function mouseleave() {
    tooltip.style("visibility", "hidden");
    verticalLine.attr("opacity", 0);

    svg.selectAll(".line")
      .attr("opacity", 0.9)
      .attr("stroke-width", 2.5);

    svg.selectAll("circle")
      .attr("opacity", 1)
      .attr("r", 4);
  }

  // X-axis label
  svg.append("text")
    .attr("x", width)
    .attr("y", height + 36)
    .attr("text-anchor", "end")
    .attr("font-size", "15px")
    .text("Days");
});
