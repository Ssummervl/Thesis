// 1.  Define margins and dimensions of the graph container
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

// 2A. Tooltip and vertical line for interactivity
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

// 3. Fetch data from CSV and create the bar chart
d3.csv("data.csv").then((data) => {
  // Parse numeric values
  data.forEach((d) => {
    d.Days = +d.Days;
    d.Health = +d.Health;
    d.Sleep = +d.Sleep;
    d.Exercise = +d.Exercise;
  });


// 4. X-axis: shared for all variables
const x = d3
  .scaleBand()
  .domain(data.map((d) => d.Days)) // Day categories
  .range([0, width])
  .padding(0.2); // Padding between bars

svg
    .append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x))
    .select(".domain")
    .remove();

// 5. Y-axis setup (single Y-axis for all categories)
const y = d3
  .scaleLinear()
  .domain([0, d3.max(data, (d) => Math.max(d.Health, d.Sleep, d.Exercise))])
  .range([height, 0]);

svg.append("g").call(d3.axisLeft(y));

// 6. Define color palette for the categories
  const color = d3.scaleOrdinal()
  .domain(["Health", "Sleep", "Exercise"])
  .range(["#ffa600", "#1C7370", "#B03567"]);
// "#ffa600" yellow-orange: Health, "#1C7370" Teal Green: Sleep, "#B03567" Raspberry rose: Exercise


// 6A. Plot bars for the 3 categories
  const barWidth = x.bandwidth() / 3;  // Each category will take up one-third of the space for each day

// 7. Plot bars for the 3 categories
  // 7.1 Plot bars for Health
  svg
    .selectAll(".barHealth")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "barHealth")
    .attr("x", (d) => x(d.Days))  // First third of the band
    .attr("y", (d) => y(d.Health))
    .attr("width", barWidth)
    .attr("height", (d) => height - y(d.Health))
    .attr("fill", color("Health"))
    .on("mousemove", (event, d) => {
      tooltip
        .html(`Day: ${d.Days}<br>Health: ${d.Health}`)
        .style("visibility", "visible")
        .style("top", `${event.pageY}px`)
        .style("left", `${event.pageX}px`);
    })
    .on("mouseleave", () => tooltip.style("visibility", "hidden"));

  // 7.2 Plot bars for Sleep
  svg
    .selectAll(".barSleep")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "barSleep")
    .attr("x", (d) => x(d.Days) + barWidth)  // Second third of the band
    .attr("y", (d) => y(d.Sleep))
    .attr("width", barWidth)
    .attr("height", (d) => height - y(d.Sleep))
    .attr("fill", color("Sleep"))
    .on("mousemove", (event, d) => {
      tooltip
        .html(`Day: ${d.Days}<br>Sleep: ${d.Sleep}`)
        .style("visibility", "visible")
        .style("top", `${event.pageY}px`)
        .style("left", `${event.pageX}px`);
    })
    .on("mouseleave", () => tooltip.style("visibility", "hidden"));

  // 7.3 Plot bars for Exercise
  svg
    .selectAll(".barExercise")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "barExercise")
    .attr("x", (d) => x(d.Days) + 2 * barWidth)  // Third third of the band
    .attr("y", (d) => y(d.Exercise))
    .attr("width", barWidth)
    .attr("height", (d) => height - y(d.Exercise))
    .attr("fill", color("Exercise"))
    .on("mousemove", (event, d) => {
      tooltip
        .html(`Day: ${d.Days}<br>Exercise: ${d.Exercise}`)
        .style("visibility", "visible")
        .style("top", `${event.pageY}px`)
        .style("left", `${event.pageX}px`);
    })
    .on("mouseleave", () => tooltip.style("visibility", "hidden"));
});

