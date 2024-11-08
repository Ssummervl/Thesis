// 1. Define margins and dimensions of the graph container
const margin = { top: 20, right: 30, bottom: 50, left: 40 },
  width = 860 - margin.left - margin.right,
  height = 420 - margin.top - margin.bottom;

// 2. Append the SVG object to the body
const svg = d3.select("#my_dataviz")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

// 2A. Tooltip for interactivity
const tooltip = d3
  .select("#my_dataviz")
  .append("div")
  .style("position", "absolute")
  .style("visibility", "hidden")
  .style("padding", "10px")
  .style("background-color", "#fff")
  .style("border", "1px solid #ccc")
  .style("border-radius", "5px")
  .style("font-size", "13px")
  .style("text-align", "left")
  .style("pointer-events", "none")
  .style("transition", "opacity 0.1s ease-in-out")
  .style("opacity", 0);

// 3. Fetch data from CSV and create the line graph
d3.csv("data.csv").then((data) => {
  // Parse numeric values
  data.forEach((d) => {
    d.Days = +d.Days;
    d.Health = +d.Health;
    d.Sleep = +d.Sleep;
  });

  // 4. X-axis setup (using scalePoint for discrete days)
  const x = d3
    .scalePoint()
    .domain(data.map((d) => d.Days)) // Map day categories to x-axis
    .range([0, width]);

  svg
    .append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x));

  // 5. Y-axis setup (shared for both Health and Sleep)
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => Math.max(d.Health, d.Sleep))]) // Max of both categories
    .range([height, 0]);

  svg.append("g").call(d3.axisLeft(y));

  // 6. Define color palette for the categories
  const color = d3.scaleOrdinal()
    .domain(["Health", "Sleep"])
    .range(["#003f5c", "#bc5090"]);

  // 7. Line generator for Health
  const lineHealth = d3.line()
    .x((d) => x(d.Days))
    .y((d) => y(d.Health));

  // 8. Line generator for Sleep
  const lineSleep = d3.line()
    .x((d) => x(d.Days))
    .y((d) => y(d.Sleep));

  // 9. Append Health line
  svg
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", color("Health"))
    .attr("stroke-width", 2)
    .attr("d", lineHealth);

  // 10. Append Sleep line
  svg
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", color("Sleep"))
    .attr("stroke-width", 2)
    .attr("d", lineSleep);

  // 11. Add circles for Health data points
  svg
    .selectAll(".circleHealth")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "circleHealth")
    .attr("cx", (d) => x(d.Days))
    .attr("cy", (d) => y(d.Health))
    .attr("r", 4)
    .attr("fill", color("Health"))
    .on("mousemove", (event, d) => {
      tooltip
        .html(`Day: ${d.Days}<br>Health: ${d.Health}`)
        .style("visibility", "visible")
        .style("top", `${event.pageY}px`)
        .style("left", `${event.pageX}px`);
    })
    .on("mouseleave", () => tooltip.style("visibility", "hidden"));

  // 12. Add circles for Sleep data points
  svg
    .selectAll(".circleSleep")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "circleSleep")
    .attr("cx", (d) => x(d.Days))
    .attr("cy", (d) => y(d.Sleep))
    .attr("r", 4)
    .attr("fill", color("Sleep"))
    .on("mousemove", (event, d) => {
      tooltip
        .html(`Day: ${d.Days}<br>Sleep: ${d.Sleep}`)
        .style("visibility", "visible")
        .style("top", `${event.pageY}px`)
        .style("left", `${event.pageX}px`);
    })
    .on("mouseleave", () => tooltip.style("visibility", "hidden"));
});
