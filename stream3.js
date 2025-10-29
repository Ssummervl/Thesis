// Define margins and dimensions
const margin = { top: 20, right: 30, bottom: 50, left: 40 },
  width = 860 - margin.left - margin.right,
  height = 420 - margin.top - margin.bottom;

// Split the chart into three sections
const sectionHeight = height / 3; // Divide the height into three equal parts

// Append the SVG object to the body
const svg = d3
  .select("#my_dataviz")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Create a tooltip div and set its initial style to be hidden
const tooltip = d3
  .select("#my_dataviz")
  .append("div")
  .style("position", "absolute")
  .style("visibility", "hidden")
  .style("padding", "10px")
  .style("background-color", "#fff")
  .style("border", "1px solid #ccc")
  .style("border-radius", "5px")
  .style("font-size", "12px")
  .style("text-align", "left")
  .style("pointer-events", "none");

d3.csv("data.csv").then((fileData) => {
  const data = fileData.filter((row) =>
    Object.values(row).some((value) => value !== null && value !== "")
  );
  data.forEach((d) => {
    d.Days = +d.Days;
    d.Health = +d.Health;
    d.Sleep = +d.Sleep;
    d.Exercise = +d.Exercise;
  });

  // X-axis: shared for all variables
  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.Days))
    .range([0, width]);

  svg
    .append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(
      d3.axisBottom(x).tickSize(-height).tickValues([1, 5, 10, 15, 20, 25, 30])
    )
    .select(".domain")
    .remove();

  svg.selectAll(".tick line").attr("stroke", "#b8b8b8");

  svg
    .append("text")
    .attr("text-anchor", "end")
    .style("font-size", "12px")
    .attr("x", width)
    .attr("y", height + 30)
    .text("Days");

  // Stack the data for each variable separately
  const keys = ["Health", "Sleep", "Exercise"];

  const stackHealth = d3
    .stack()
    .offset(d3.stackOffsetSilhouette)
    .keys(["Health"])(data);
  const stackSleep = d3
    .stack()
    .offset(d3.stackOffsetSilhouette)
    .keys(["Sleep"])(data);
  const stackExercise = d3
    .stack()
    .offset(d3.stackOffsetSilhouette)
    .keys(["Exercise"])(data);

  // Compute the y-domain based on stack data
  const healthDomain = [
    d3.min(stackHealth, (layer) => d3.min(layer, (d) => d[0])),
    d3.max(stackHealth, (layer) => d3.max(layer, (d) => d[1])),
  ];

  const sleepDomain = [
    d3.min(stackSleep, (layer) => d3.min(layer, (d) => d[0])),
    d3.max(stackSleep, (layer) => d3.max(layer, (d) => d[1])),
  ];

  const exerciseDomain = [
    d3.min(stackExercise, (layer) => d3.min(layer, (d) => d[0])),
    d3.max(stackExercise, (layer) => d3.max(layer, (d) => d[1])),
  ];

  // Define separate Y scales for each section, based on the stack domain
  const yHealth = d3
    .scaleLinear()
    .domain(healthDomain)
    .range([height, height - sectionHeight]);

  const ySleep = d3
    .scaleLinear()
    .domain(sleepDomain)
    .range([height - sectionHeight, height - 2 * sectionHeight]);

  const yExercise = d3
    .scaleLinear()
    .domain(exerciseDomain)
    .range([height - 2 * sectionHeight, 0]);

  // Define color palette
  const color = d3.scaleOrdinal().domain(keys).range(d3.schemeDark2);

  // Create area generator for each stacked data
  const areaHealth = d3
    .area()
    .x((d) => x(d.data.Days))
    .y0((d) => yHealth(d[0]))
    .y1((d) => yHealth(d[1]))
    .curve(d3.curveCardinal);

  const areaSleep = d3
    .area()
    .x((d) => x(d.data.Days))
    .y0((d) => ySleep(d[0]))
    .y1((d) => ySleep(d[1]))
    .curve(d3.curveCardinal);

  const areaExercise = d3
    .area()
    .x((d) => x(d.data.Days))
    .y0((d) => yExercise(d[0]))
    .y1((d) => yExercise(d[1]))
    .curve(d3.curveCardinal);

  // Function to handle mouseover event
  function handleMouseOver(section) {
    svg.selectAll("path").style("opacity", 0.2); // Fade out all sections
    svg.selectAll(`.${section}`).style("opacity", 1); // Highlight the hovered section
  }

  // Function to find the nearest data point based on mouse position
  function getNearestData(mouseX, data) {
    const mouseDate = x.invert(mouseX); // Convert mouse position to corresponding Days value
    const index = d3.bisector((d) => d.Days).left(data, mouseDate); // Find the closest index
    return data[index] || data[data.length - 1]; // Return the closest data point
  }

  function handleMouseMove(name, event) {
    const [mouseX] = d3.pointer(event); // Get mouse X position relative to the chart

    // Find the nearest data point
    const nearestData = getNearestData(mouseX, data);

    // Update the tooltip content with the nearest data's value
    const content = `
    <strong>${name}</strong><br>
    Day: ${nearestData.Days}<br>
    Value: ${nearestData[name].toFixed(3)}<br>
  `;

    // Update tooltip position and content
    tooltip
      .html(content)
      .style("visibility", "visible")
      .style("top", event.pageY + 10 + "px")
      .style("left", event.pageX + 10 + "px");
  }

  // Function to handle mouse leave
  function handleMouseLeave() {
    svg.selectAll("path").style("opacity", 1); // Reset all to full opacity
    tooltip.style("visibility", "hidden");
  }

  // Plot stacked areas for Health
  svg
    .selectAll(".myHealth")
    .data(stackHealth)
    .join("path")
    .attr("class", "myHealth")
    .style("fill", color("Health"))
    .attr("d", areaHealth)
    .on("mouseover", () => {
      handleMouseOver("myHealth");
    })
    .on("mousemove", (event) => {
      handleMouseMove("Health", event);
    })
    .on("mouseleave", handleMouseLeave);

  // Plot stacked areas for Sleep
  svg
    .selectAll(".mySleep")
    .data(stackSleep)
    .join("path")
    .attr("class", "mySleep")
    .style("fill", color("Sleep"))
    .attr("d", areaSleep)
    .on("mouseover", () => {
      handleMouseOver("mySleep");
    })
    .on("mousemove", (event) => {
      handleMouseMove("Sleep", event);
    })
    .on("mouseleave", handleMouseLeave);

  // Plot stacked areas for Exercise
  svg
    .selectAll(".myExercise")
    .data(stackExercise)
    .join("path")
    .attr("class", "myExercise")
    .style("fill", color("Exercise"))
    .attr("d", areaExercise)
    .on("mouseover", () => handleMouseOver("myExercise"))
    .on("mousemove", (event) => {
      handleMouseMove("Exercise", event);
    })
    .on("mouseleave", handleMouseLeave);
});
